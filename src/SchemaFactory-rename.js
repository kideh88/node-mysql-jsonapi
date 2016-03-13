'use strict';

const DHUtilities = require('./DataHookUtilities');
const FileSystem = require('fs');
let Scanner = {};

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
        console.log('Please check your DataHook config and restart!');
        process.exit();
      }
    } catch (error) {
      console.log('No existing data structure file found. Now scaffolding to: ' + this.NODE_CONFIG.DATA_STRUCTURE_JSON);
      this.scaffoldStructureConfig();
    }


    let tableName, columnName;


    for (tableName in schema) {
      for (columnName in schema[tableName]) {
        if(columnName === 'INVERSE_RELATIONS') {
          // Set relation functions
          // getInverseRelations
        } else if(columnName === 'RELATIONS') {
          // Set relation functions
          // getRelations
        } else {
          Object.setPrototypeOf(schema[tableName][columnName], Column.prototype);
        }
        if(columnName === 'title') {
          console.log('function test', schema[tableName][columnName].isHidden());
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
          Scanner.generateDataStructure(schemaData);
          this.writeConfigToFile();
        },
        (error) => {
          throw new Error(error);
        }
      );
    } catch (error) {
      console.log('DataHook.scaffoldStructureConfig Error: ', error);
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
  hasTable () {
    console.log(this);
    return false;
  }
}

class Table {
  getSelectorArray () {
    return ['table.column1', 'table.column2'];
  }
}




class Column {

  /**
   * Returns boolean on whether this column is restricted
   *
   * @return boolean
   **/
  isRestricted () {
    return this.is_restricted;
  }

  /**
   * Returns boolean on whether this column is allowed to be null
   *
   * @return boolean
   **/
  isNullable () {
    return (this.is_nullable === 'YES');
  }

  /**
   * Returns boolean on whether this column is a primary key
   *
   * @return boolean
   **/
  isPrimaryKey () {
    return this.is_primaryKey;
  }

  /**
   * Returns boolean on whether this column is a foreign key
   *
   * @return boolean
   **/
  isForeignKey () {
    return this.is_foreignKey;
  }

  /**
   * Returns boolean on whether this column has a SELECT modifier
   *
   * @return boolean
   **/
  hasSelectModifier () {
    return (this.select_modifier !== false);
  }

  /**
   * Typecast the json input values to their types provided by the data.structure.json
   *
   * @param input mixed
   * @return mixed
   **/
  castInput (input) {
    switch(typeof this.simplified_type) {
      case 'string':
        return input.toString();
      case 'number':
        return parseInt(input);
      case 'boolean':
        return DHUtilities.stringToBoolean(input);
      case 'float':
        // To match price floats
        return parseFloat(input).toFixed(2);
      case 'timestamp':
        // To match UNIX inserts
        return parseInt(input);
      default:
        return input.toString();
    }
  }

}


module.exports = SchemaFactory;
