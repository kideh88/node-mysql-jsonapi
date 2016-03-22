'use strict';

const DataHookUtilities = require('./utilities');
const FileSystem = require('fs');
let Scanner;

/**
 * Set and remap the given information schema data to a usable mapping object in this.dataStructure
 *
 * @param input string
 * @return boolean
 **/
class SchemaFactory {
  constructor (DataHook) {
    Scanner = require('./scanner/' + DataHook.DB_TYPE.toLowerCase());
    this.DataHook = DataHook;

    try{
      FileSystem.accessSync(this.DataHook.NODE_CONFIG.DATA_STRUCTURE_JSON, FileSystem.R_OK);
      this.dataStructure = JSON.parse(FileSystem.readFileSync(this.DataHook.NODE_CONFIG.DATA_STRUCTURE_JSON, 'utf8'));
      if(this.DataHook.DB_TYPE !== this.dataStructure.DB_TYPE) {
        //@TODO: COLLECT MESSAGES IN ONE PLACE AND TRIGGER BY CONSTANT PARAM?
        let messages = [
          'SchemaFactory: DataHook structure config does not match given DB_TYPE',
          'Please check your DataHook config or remove the current schema file and restart!'
        ];
        this.DataHook.endProcess(messages);
      }

    } catch (error) {
      console.log('SchemaFactory: No existing valid data structure file found. Now scaffolding to: ' + this.DataHook.NODE_CONFIG.DATA_STRUCTURE_JSON);
      this.scaffoldStructureConfig();
    }

    // DB_TYPE is only used for initiation, hereafter it would only create more if-conditions
    delete this.dataStructure.DB_TYPE;

    return this.addSchemaPrototypes(this.dataStructure);
  }

  /**
   * Adds functions to the structure, tables and columns of the dataStructure
   *
   * @param structure object
   * @return void
   **/
  addSchemaPrototypes (structure) {
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
   * Scaffold the data structure config to the path specified in config
   *
   * @return void
   **/
  scaffoldStructureConfig () {
    try {
      this.DataHook.database.scanDatabaseStructure(this.structureCallback);
    } catch (error) {
      console.log('SchemaFactory.scaffoldStructureConfig Error: ', error);
      process.exit();
    }
  }

  /**
   * Callback for the information schema call.
   *
   * @return void
   **/
  structureCallback (response) {
    this.DataHook.dataStructure = Scanner.generateDataStructure(response);
    this.writeConfigToFile();
  }

  /**
   * Write the data structure json to the config path file
   *
   * @return void
   **/
  writeConfigToFile () {
    this.DataHook.dataStructure.DB_TYPE = this.DataHook.DB_TYPE;
    let configContent = JSON.stringify(this.DataHook.dataStructure, null, this.DataHook.NODE_CONFIG.JSON_INDENT);
    var outputPath = this.DataHook.NODE_CONFIG.DATA_STRUCTURE_JSON;

    FileSystem.writeFile(outputPath, configContent, (error) => {
      if (error) {
        throw new Error(error);
      } else {
        let messages = [
          'SchemaFactory: DataHook structure config saved to ' + outputPath,
          'Please rename all the aliases in the config and restart the application!'
        ];
        this.DataHook.endProcess(messages);
      }
    });
  }
}

class Schema {

  /**
   * Returns boolean on whether this schema has a table with the given name input.
   *
   * @param input string
   * @return boolean
   **/
  _hasTable (input) {
    return this.hasOwnProperty(input);
  }

  /**
   * Returns boolean on whether the given requestData object matches the application schema.
   * Data structure from jsonapi-query-parser:
   * https://github.com/kideh88/node-jsonapi-query-parser#return-data-information-requestdata
   *
   * @param request string
   * @return boolean
   **/
  _validateRequestData (request) {
    // @TODO: VALIDATE FILTER, SORT, FIELDS QUERIES
    if (!this._hasTable(request.resourceType)) {
      return false;
    }
    if (request.relationshipType && !this[request.resourceType]._hasRelation(request.relationshipType)) {
      // INVALID RELATION QUERY
      return false;
    }
    if (request.queryData.include && !this[request.resourceType]._hasIncludeRelations(request.resourceType, request.queryData.include)) {
      // INVALID RELATIONS IN INCLUDE QUERY
      return false;
    }
    return true;
  }

  /**
   * Returns a boolean on whether the requested include data is actually available.
   * Supports chained inclusions like comments.author as described in JSONAPI specs.
   *
   * @param resourceType string
   * @param include object
   * @return boolean
   **/
  _hasIncludeRelations (resourceType, include) {
    let index;
    for (index in include) {
      if (include[index].indexOf('.') > -1) {
        let chainedRelation = includeRelation.split('.');
        if (!this[resourceType]._hasRelation(chainedRelation[0])) {
          return false;
        }
        let relation = this[resourceType]._getsRelation(chainedRelation[0]);
        let relatedResourceType = (relation.type === 'DIRECT' ? relation.targetTable : relation.fromTable);
        if (!this[relatedResourceType]._hasRelation(chainedRelation[1])) {
          return false;
        }
      } else {
        if (!this[resourceType]._hasRelation(include[index])) {
          return false
        }
      }
    }
    return true;
  }


}

class Table {

  /**
   * Returns the SELECT array for this table.
   *
   * @param fieldset object optional
   * @return array
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
   * Returns boolean on whether this column key is properly defiend, an instance of Column class
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
   * Returns boolean on whether this column has a relation to the given alias input.
   *
   * @param input string
   * @return boolean
   **/
  _hasRelation (input) {
    return (this.TABLE_INFO.RELATIONS.hasOwnProperty(input) || this.TABLE_INFO.INVERSE_RELATIONS.hasOwnProperty(input));
  }

  /**
   * Returns a relation object for this column.
   *
   * @param input string
   * @return object
   **/
  _getRelation (input) {
    let relation = {};
    if(!this._hasRelation(input)) {
      // Add error for nonexisting?
      return relation;
    }
    if(this.TABLE_INFO.RELATIONS.hasOwnProperty(input)) {
      relation.type = 'DIRECT';
      relation = Object.assign(relation, this.TABLE_INFO.RELATIONS[input]);
    } else {
      relation.type = 'INVERSE';
      relation = Object.assign(relation, this.TABLE_INFO.INVERSE_RELATIONS[input]);
    }
    return relation;
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

module.exports = SchemaFactory;