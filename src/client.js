'use strict';

const http = require('http');
const FileSystem = require('fs');
const EventEmitter = require('events');
// Should not be bound to mysql only?
// Or use mysql only and later DataHook will be open for more?
const MySqlDatabase = require('./Database');
const RequestHandler = require('./RequestHandler');
const ResponseHandler = require('./ResponseHandler');

const SchemaFactory = require('./SchemaFactory');

class DataHook extends EventEmitter {

  /**
   * DataHook constructor extending super EventEmitter, first time running will scaffold a structure config
   *
   * @param CONFIG object
   * @return void
   **/
  constructor(CONFIG) {
    super();
    this.NODE_CONFIG = CONFIG.NODE;
    this.MYSQL_CONFIG = CONFIG.MYSQL;
    this.dataStructure = {};
    this.dataTypeMapping = {
      "boolean": ["BOOL", "BOOLEAN"],
      "number": ["TINYINT", "SMALLINT", "MEDIUMINT", "BIGINT", "INTEGER", "INT"],
      "float": ["DECIMAL", "FLOAT", "DEC", "DOUBLE", "DOUBLE_PRECISION"],
      "timestamp": ["DATE", "DATETIME", "TIMESTAMP"],
      "string": ["TEXT", "MEDIUMTEXT", "CHAR", "VARCHAR", "TINYTEXT"]
    };

    this.database = new MySqlDatabase(this.MYSQL_CONFIG);
    this.requestHandler = new RequestHandler(this);
    this.responseHandler = new ResponseHandler(this);

    try {
      FileSystem.accessSync(this.NODE_CONFIG.DATA_STRUCTURE_JSON, FileSystem.R_OK);
      this.dataStructure = JSON.parse(FileSystem.readFileSync(this.NODE_CONFIG.DATA_STRUCTURE_JSON, 'utf8'));
      this.schema = new SchemaFactory(this.dataStructure);
    } catch (error) {
      console.log('No existing data structure file found. Now scaffolding to: ' + this.NODE_CONFIG.DATA_STRUCTURE_JSON);
      this.scaffoldStructureConfig();
    }

    this.server = http.createServer(this.serverRequestListener(this)).listen(this.NODE_CONFIG.PORT, this.NODE_CONFIG.HOSTNAME);
  }

  /**
   * Returns a request listener for the node createServer function
   * Get passed 'this' scope into DataHook since 'this' points at http server.
   * Needs to pass the request and response objects back to callback
   *
   * @param DataHook object
   * @return object function
   **/
  serverRequestListener (DataHook) {
    return (request, response) => {
      DataHook.requestHandler.run(request).then(
        (rows) => {
          DataHook.responseHandler.respondWithSuccess(rows, response);
        },
        (error) => {
          DataHook.responseHandler.respondWithError(error, response);
        }
      );
    }
  }

  /**
   * Scaffold the data structure config to the path specified in config
   * @TODO: MOVE TO SCHEMAFACTORY
   *
   * @return void
   **/
  scaffoldStructureConfig () {
    try {
      this.database.scanDatabaseStructure().then(
        (schemaData) => {
          this.setModelStructure(schemaData);
          this.writeConfigToFile();
        },
        (error) => {
          throw new Error(error);
        }
      );
    } catch (error) {
      console.log('DataHook.scaffoldStructureConfig Error: ', error);
    }
  }

  /**
   * Write the data structure json to the config path file
   * @TODO: MOVE TO SCHEMAFACTORY
   *
   * @return void
   **/
  writeConfigToFile () {
    // ADD DATABASE TYPE TO SCHEMA
    let configContent = JSON.stringify(this.dataStructure, null, this.NODE_CONFIG.JSON_INDENT);
    var outputPath = this.NODE_CONFIG.DATA_STRUCTURE_JSON;

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

  /**
   * Get the simplified type from a MySQL data type ("INT" = "number", "MEDIUMTEXT" = "string"..)
   * @TODO: MOVE TO SCHEMAFACTORY
   *
   * @param type string
   * @return simple_type string
   **/
  getSimplifiedType (type) {
    let simple_type;
    type = type.toUpperCase();
    for(simple_type in this.dataTypeMapping) {
      if(this.dataTypeMapping.hasOwnProperty(simple_type) && this.dataTypeMapping[simple_type].indexOf(type) > -1) {
        return simple_type;
      }
    }
    throw new Error('DataHook.getSimplifiedType failed with given type: ' + type);
  }

  /**
   * Set and remap the given information schema data to a usable mapping object in this.dataStructure
   * @TODO: MOVE TO SCHEMAFACTORY
   *
   * @param data object
   * @return void
   **/
  setModelStructure (data) {
    let index;
    for(index in data.structure) {
      let row = data.structure[index];

      this.dataStructure[row.TABLE_NAME] = (this.dataStructure[row.TABLE_NAME] ? this.dataStructure[row.TABLE_NAME] : {});
      this.dataStructure[row.TABLE_NAME]['INVERSE_RELATIONS'] = {};
      this.dataStructure[row.TABLE_NAME]['RELATIONS'] = {};
      this.dataStructure[row.TABLE_NAME][row.COLUMN_NAME] = {
        data_type: row.DATA_TYPE,
        simplified_type: this.getSimplifiedType(row.DATA_TYPE),
        select_modifier: false,
        is_nullable: row.IS_NULLABLE,
        is_primaryKey: false,
        is_restricted: false,
        is_foreignKey: false
      };
    }

    for(index in data.keys) {
      let row = data.keys[index];
      if(!this.dataStructure[row.TABLE_NAME] || !this.dataStructure[row.TABLE_NAME][row.COLUMN_NAME]){
        throw new Error('Structure scan: Table or column not found. Table: '
          + row.TABLE_NAME + ' Column: ' + row.COLUMN_NAME);
      }

      if('PRIMARY' === row.CONSTRAINT_NAME) {
        this.dataStructure[row.TABLE_NAME][row.COLUMN_NAME].is_primaryKey = true;
      } else {

        if(!this.dataStructure[row.REFERENCED_TABLE_NAME] || !this.dataStructure[row.REFERENCED_TABLE_NAME][row.REFERENCED_COLUMN_NAME]){
          throw new Error('Structure scan: Referenced table or column not found. Table: '
            + row.REFERENCED_TABLE_NAME + ' Column: ' + row.REFERENCED_COLUMN_NAME);
        }

        this.dataStructure[row.TABLE_NAME][row.COLUMN_NAME].is_foreignKey = true;

        let aliasReplace = 'ALIASFOR' + row.REFERENCED_TABLE_NAME + row.REFERENCED_COLUMN_NAME;
        this.dataStructure[row.TABLE_NAME]['RELATIONS'][aliasReplace] = {
          'column': row.COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'target_table': row.REFERENCED_TABLE_NAME,
          'target_column': row.REFERENCED_COLUMN_NAME
        };

        let referenceAliasReplace = 'ALIASFOR' + row.TABLE_NAME + row.COLUMN_NAME;
        this.dataStructure[row.REFERENCED_TABLE_NAME]['INVERSE_RELATIONS'][referenceAliasReplace] = {
          'column': row.REFERENCED_COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'from_table': row.TABLE_NAME,
          'from_column': row.COLUMN_NAME
        };
      }
    }
  }

}

module.exports = DataHook;