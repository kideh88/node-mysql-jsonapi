'use strict';

const DataHookUtilities = require('./../utilities');
const FileSystem = require('fs');
const Scanner = require('./scanner/mysql');

class SchemaFactory {

  /**
   * [SchemaFactory constructor returns a Schema object containing all tables and columns found in the database.]
   *
   * @param {object} dataHook [DataHook instance.]
   * @return {object} [Schema object.]
   **/
  constructor (dataHook) {
    this.scanner = new Scanner(dataHook);
    this.dataHook = dataHook;

    try{
      FileSystem.accessSync(this.dataHook.NODE_CONFIG.DATA_STRUCTURE_JSON, FileSystem.R_OK);
      this.dataStructure = JSON.parse(FileSystem.readFileSync(this.dataHook.NODE_CONFIG.DATA_STRUCTURE_JSON, 'utf8'));
      if(this.dataHook.DB_TYPE !== this.dataStructure.DB_TYPE) {
        //@TODO: COLLECT MESSAGES IN ONE PLACE AND TRIGGER BY CONSTANT PARAM?
        let messages = [
          'SchemaFactory: DataHook structure config does not match given DB_TYPE',
          'Please check your DataHook config or remove the current schema file and restart!'
        ];
        this.dataHook.endProcess(messages);
      }

    } catch (error) {
      console.log('SchemaFactory: No existing valid data structure file found. Now scaffolding to: ' + this.dataHook.NODE_CONFIG.DATA_STRUCTURE_JSON);
      this.scaffoldStructureConfig();
    }

    // DB_TYPE is only used for initiation, hereafter it would only create more if-conditions
    delete this.dataStructure.DB_TYPE;

    return this.getSchemaWithPrototypes(this.dataStructure);
  }

  /**
   * [Adds functions to the structure, tables and columns of the dataStructure.]
   *
   * @param {object} structure [Content of the data.structure.json file.]
   * @return {object} [Prototyped data structure.]
   **/
  getSchemaWithPrototypes (structure) {
    let tableName, columnName;

    for (tableName in structure) {
      if (structure.hasOwnProperty(tableName)) {
        Object.setPrototypeOf(structure[tableName], Table.prototype);
        for (columnName in structure[tableName]) {
          if (structure[tableName].hasOwnProperty(columnName) && columnName !== 'TABLE_INFO') {
            Object.setPrototypeOf(structure[tableName][columnName], Column.prototype);
          }
        }
      }
    }

    Object.setPrototypeOf(structure, Schema.prototype);
    return structure;
  }

  /**
   * [Scaffold the data structure config to the path specified in config.]
   *
   * @return void
   **/
  scaffoldStructureConfig () {
    try {
      this.dataHook.database.scanDatabaseStructure(this.structureCallback);
    } catch (error) {
      console.log('SchemaFactory.scaffoldStructureConfig Error: ', error);
      process.exit();
    }
  }

  /**
   * [Callback for the information schema call.]
   *
   * @param {object} response [Response from database scanner.]
   * @return void
   **/
  structureCallback (response) {
    this.dataHook.dataStructure = this.scanner.generateDataStructure(response);
    this.writeConfigToFile();
  }

  /**
   * [Write the data structure json to the config path file.]
   *
   * @return void
   **/
  writeConfigToFile () {
    this.dataHook.dataStructure.DB_TYPE = this.dataHook.DB_TYPE;
    let configContent = JSON.stringify(this.dataHook.dataStructure, null, this.dataHook.NODE_CONFIG.JSON_INDENT);
    var outputPath = this.dataHook.NODE_CONFIG.DATA_STRUCTURE_JSON;

    FileSystem.writeFile(outputPath, configContent, (error) => {
      if (error) {
        throw new Error(error);
      } else {
        let messages = [
          'SchemaFactory: DataHook structure config saved to ' + outputPath,
          'Please rename all the aliases in the config and restart the application!'
        ];
        this.dataHook.endProcess(messages);
      }
    });
  }
}

class Schema {

  /**
   * [Returns boolean on whether this schema has a table with the given name input.]
   *
   * @param {string} input [Name to check.]
   * @return {boolean}
   **/
  _hasTable (input) {
    return this.hasOwnProperty(input);
  }

  /**
   * [Returns boolean on whether the given requestData object matches the application schema.
   * Data structure from jsonapi-query-parser:
   * https://github.com/kideh88/node-jsonapi-query-parser#return-data-information-requestdata]
   *
   * @param {string} requestData [requestData from JsonApiQueryParser.]
   * @return {boolean}
   **/
  _validateRequestData (requestData) {
    // @TODO: VALIDATE FILTER, SORT, FIELDS QUERIES
    if (!this._hasTable(requestData.resourceType)) {
      throw new SchemaError('Unknown resource type `' + requestData.resourceType + '`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
    }
    if (requestData.relationshipType && !this[requestData.resourceType]._hasRelationship(requestData.relationshipType)) {
      throw new SchemaError('Unknown resource relationship `' + requestData.relationshipType + '`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
    }
    if (requestData.queryData.include && !this[requestData.resourceType]._hasIncludeRelationships(requestData.resourceType, requestData.queryData.include)) {
      throw new SchemaError('Unknown resource relationship `' + requestData.relationshipType + '`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
    }
  }

  /**
   * [Returns a boolean on whether the requested include data is actually available.
   * Supports chained inclusions like comments.author as described in JSON API specs.]
   *
   * @param {string} resourceType [Resource type to validate the relationship.]
   * @param {[string]} include [Array of include strings.]
   * @return {boolean}
   **/
  _hasIncludeRelationships (resourceType, include) {
    let index;
    for (index in include) {
      if (include[index].indexOf('.') > -1) {
        let chainedRelationship = includeRelationship.split('.');
        if (!this[resourceType]._hasRelationship(chainedRelationship[0])) {
          return false;
        }
        let relationship = this[resourceType]._getsRelationship(chainedRelationship[0]);
        let relatedResourceType = (relationship.type === 'DIRECT' ? relationship.targetTable : relationship.fromTable);
        if (!this[relatedResourceType]._hasRelationship(chainedRelationship[1])) {
          return false;
        }
      } else {
        if (!this[resourceType]._hasRelationship(include[index])) {
          return false
        }
      }
    }
    return true;
  }


}

class Table {

  /**
   * [Returns the SELECT array for this table.]
   *
   * @param {object} fieldset optional [The fieldset object from the JsonApiQueryParser requestData.]
   * @return [string]
   **/
  _getSelectorArray (fieldset) {
    let tableName = this.TABLE_INFO.NAME;
    let key, selectors = [];
    for (key in this) {
      if (!this._columnKeyCheck(key)) {
        // Continue if this column is invalid or restricted.
        continue;
      }

      if (fieldset && fieldset.hasOwnProperty(this.TABLE_INFO.NAME) && !this._columnInFieldset(fieldset, key)) {
        // Continue if this table has a fieldset defined, but the current column is not part of it.
        continue;
      }

      if (this[key]._hasSelectModifier()) {
        selectors.push(this[key]._getSelectModifier());
      } else {
        selectors.push(tableName + '.' + key);
      }
    }
    return selectors;
  }

  _getColumnNames () {
    let columns = [];
    let property;
    for(property in this) {
      if (this[property] instanceof 'Column') {
        columns.push(property);
      }
    }
    return columns;
  }

  /**
   * Returns boolean on whether this column key is part of the given fieldset object
   *
   * @param fieldset object
   * @param key string
   * @return boolean
   **/
  _columnInFieldset (fieldset, key) {
    return (fieldset[this.TABLE_INFO.NAME].indexOf(key) > -1);
  }

  /**
   * Returns boolean on whether this column key is properly defined, an instance of Column class
   * not a foreign key or restricted
   *
   * @param key string
   * @return boolean
   **/
  _columnKeyCheck (key) {
    let isColumnInstance = (this.hasOwnProperty(key) && this[key] instanceof Column);
    return (isColumnInstance && !this[key]._isForeignKey() && !this[key]._isRestricted());
  }

  /**
   * Returns boolean on whether this column has a relationship to the given alias input.
   *
   * @param alias string
   * @return boolean
   **/
  _hasRelationship (alias) {
    return (this.TABLE_INFO.RELATIONSHIPS.hasOwnProperty(alias) || this.TABLE_INFO.INVERSE_RELATIONSHIPS.hasOwnProperty(alias));
  }

  /**
   * Returns a relationship object for this column.
   *
   * @param alias string
   * @return object
   **/
  _getRelationship (alias) {
    let relationship = {};
    if(!this._hasRelationship(input)) {
      // Add error for nonexisting?
      return relationship;
    }
    if(this.TABLE_INFO.RELATIONSHIPS.hasOwnProperty(alias)) {
      relationship.type = 'DIRECT';
      relationship = Object.assign(relationship, this.TABLE_INFO.RELATIONSHIPS[alias]);
    } else {
      relationship.type = 'INVERSE';
      relationship = Object.assign(relationship, this.TABLE_INFO.INVERSE_RELATIONSHIPS[alias]);
    }
    return relationship;
  }

  /**
   * Returns the resource type of a relationship object by alias parameter.
   *
   * @param alias string
   * @return string
   **/
  _getRelationshipResourceType (alias) {
    let relationship = this._getRelationship(alias);
    if (relationship.type === 'DIRECT') {
      return relationship.targetTable;
    } else {
      return relationship.fromTable;
    }
  }

  /**
   * Validates the given attributes and reports any missing attributes that are not foreign keys or p
   *
   * @param attributes object
   * @return string
   **/
  _validateAttributes (attributes) {
    let attributeKeys = Object.keys(attributes);
    let columnNames = this._getColumnNames();

    let index;
    for (index in columnNames) {
      if ((!this[columnNames[index]]._isPrimaryKey() || !this[columnNames[index]]._isForeignKey()) && attributeKeys.indexOf(columnNames[index]) === -1) {
        throw new SchemaError('Missing resource attribute `' + columnNames[index] + '` on resource `' + this.TABLE_INFO.NAME + '`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
      }
    }

    index = 0;
    for (index in attributeKeys) {
      if (columnNames.indexOf(attributeKeys[index]) === -1){
        throw new SchemaError('Unknown resource attribute `' + attributeKeys[index] + '` on resource `' + this.TABLE_INFO.NAME + '`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
      }

    }
    // @TODO; FINISH UP THE VALIDATOR
  }

  /**
   * Validates the given relationship alias including its
   *
   * @param alias string
   * @return string
   **/
  _validateRelationship (alias) {
    if (!this._hasRelationship(alias)) {
      throw new SchemaError('Unknown relationship alias `' + alias + '`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
    }
  }

}

class Column {

  /**
   * Returns boolean on whether this column is restricted.
   *
   * @return boolean
   **/
  _isRestricted () {
    return this.COLUMN_INFO.isRestricted;
  }

  /**
   * Returns boolean on whether this column is allowed to be null.
   *
   * @return boolean
   **/
  _isNullable () {
    return (this.COLUMN_INFO.isNullable === 'YES');
  }

  /**
   * Returns boolean on whether this column is a primary key.
   *
   * @return boolean
   **/
  _isPrimaryKey () {
    return this.COLUMN_INFO.isPrimaryKey;
  }

  /**
   * Returns boolean on whether this column is a foreign key.
   *
   * @return boolean
   **/
  _isForeignKey () {
    return this.COLUMN_INFO.isForeignKey;
  }

  /**
   * Returns boolean on whether this column has a SELECT modifier.
   *
   * @return boolean
   **/
  _hasSelectModifier () {
    return (this.COLUMN_INFO.selectModifier !== false);
  }

  /**
   * Returns the SELECT modifier for this column.
   *
   * @return boolean
   **/
  _getSelectModifier () {
    if (!this._hasSelectModifier()) {
      return null;
    }
    return this.COLUMN_INFO.selectModifier;
  }

  /**
   * Typecast the json input values to their types provided by the data.structure.json.
   *
   * @param input mixed
   * @return mixed
   **/
  _castInput (input) {
    switch(typeof this.simplifiedType) {
      case 'string':
        return input.toString();
      case 'number':
        return parseInt(input);
      case 'boolean':
        return DataHookUtilities.stringToBoolean(input);
      case 'float':
        return parseFloat(input).toFixed(2);
      case 'timestamp':
        return parseInt(input);
      default:
        return input.toString();
    }
  }
}

class SchemaError extends Error {
  /**
   * Construct a SchemaError with statusCode for a proper response
   *
   * @param message string
   * @param statusCode integer
   * @return void
   **/
  constructor (message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = SchemaFactory;