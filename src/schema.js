'use strict';

const DHUtilities = require('./utilities');
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
      this.DataHook.dataStructure = JSON.parse(FileSystem.readFileSync(this.DataHook.NODE_CONFIG.DATA_STRUCTURE_JSON, 'utf8'));
      if(this.DataHook.DB_TYPE !== this.DataHook.dataStructure.DB_TYPE) {
        console.log('DataHook structure config does not match given DB_TYPE');
        console.log('Please check your DataHook config or remove the current schema file and restart!');
        process.exit();
      }

    } catch (error) {
      console.log('SchemaFactory constructor error', error);
      console.log('No existing valid data structure file found. Now scaffolding to: ' + this.DataHook.NODE_CONFIG.DATA_STRUCTURE_JSON);
      this.scaffoldStructureConfig();
    }

    delete this.DataHook.dataStructure.DB_TYPE;
    this.addSchemaPrototypes(this.DataHook.dataStructure);

  }

  /**
   * Adds functions to the schema, tables and columns of the dataStructure
   *
   * @return void
   **/
  addSchemaPrototypes (schema) {
    let tableName, columnName;

    for (tableName in schema) {
      if (schema.hasOwnProperty(tableName)) {
        Object.setPrototypeOf(schema[tableName], Table.prototype);
        for (columnName in schema[tableName]) {
          if (schema[tableName].hasOwnProperty(columnName) && columnName !== 'TABLE_INFO') {
            Object.setPrototypeOf(schema[tableName][columnName], Column.prototype);
          }
        }
      }
    }

    Object.setPrototypeOf(schema, Schema.prototype);
  }

  /**
   * Scaffold the data structure config to the path specified in config
   *
   * @return void
   **/
  scaffoldStructureConfig () {
    try {
      this.DataHook.database.scanDatabaseStructure().then(
        (schemaData) => {
          this.DataHook.dataStructure = Scanner.generateDataStructure(schemaData);
          this.writeConfigToFile();
        },
        (error) => {
          throw new Error(error);
        }
      );
    } catch (error) {
      console.log('SchemaFactory.scaffoldStructureConfig Error: ', error);
      process.exit();
    }
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
        console.log('DataHook structure config saved to ' + outputPath);
        console.log('Please rename all the aliases in the config and restart node!');
        process.exit();
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
}

class Table {

  /**
   * Returns the SELECT array for this table.
   *
   * @return array
   **/
  _getSelectorArray () {
    let tableName = this.TABLE_INFO.NAME;
    let key, selectors = [];
    for (key in this) {
      if (this.hasOwnProperty(key) && this[key] instanceof Column && !this[key]._isForeignKey() && !this[key]._isRestricted()) {
        if (this[key]._hasSelectModifier()) {
          selectors.push(this[key]._getSelectModifier());
        } else {
          selectors.push(tableName + '.' + key);
        }
      }
    }
    return selectors;
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
    if (!this.hasSelectModifier()) {
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
        return DHUtilities.stringToBoolean(input);
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