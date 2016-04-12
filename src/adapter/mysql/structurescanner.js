'use strict';

let dataTypeMapping = {
  "boolean": ["BOOL", "BOOLEAN"],
  "number": ["TINYINT", "SMALLINT", "MEDIUMINT", "BIGINT", "INTEGER", "INT"],
  "float": ["DECIMAL", "FLOAT", "DEC", "DOUBLE", "DOUBLE_PRECISION"],
  "timestamp": ["DATE", "DATETIME", "TIMESTAMP"],
  "string": ["TEXT", "MEDIUMTEXT", "CHAR", "VARCHAR", "TINYTEXT"]
};

class StructureScanner {

  constructor (dataHook) {
    this.mysql = dataHook.database.mysql;
    this.connection = dataHook.database.connection;
    this.CONFIG = dataHook.CONFIG;
  }

  /**
   * [Get the information schema from the database. Used to create the schema file.]
   *
   * @param {object} callback [Callback to pass the response data into.]
   * @return void
   * @throws Error
   **/
  scanDatabaseStructure (callback) {
    let structureStatement = "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?;";
    let keyStatement = "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ?;";
    structureStatement = this.mysql.format(structureStatement, this.CONFIG.DATABASE);
    keyStatement = this.mysql.format(keyStatement, this.CONFIG.DATABASE);

    this.connection.query(structureStatement, (error, rows, fields) => {
      let responseData = {};
      if (error) {
        throw new Error(error);
      }
      responseData.structure = rows;

      this.connection.query(keyStatement, (error, rows, fields) => {
        if (error) {
          throw new Error(error);
        }
        responseData.keys = rows;
        callback(responseData);
      });
    });
  }

  /**
   * [Set and remap the given information schema data to a usable mapping object in the returned dataStructure.]
   *
   * @param {object} data [MySQL information schema data.]
   * @return {object} dataStructure [Database structure for scaffolding the structure json file.]
   * @throws Error
   **/
  static generateDataStructure (data) {
    let dataStructure = {};
    let index;
    for(index in data.structure) {
      let row = data.structure[index];

      dataStructure[row.TABLE_NAME] = (dataStructure[row.TABLE_NAME] ? dataStructure[row.TABLE_NAME] : {});
      dataStructure[row.TABLE_NAME]['TABLE_INFO'] = {
        'NAME': row.TABLE_NAME,
        'INVERSE_RELATIONSHIPS': {},
        'RELATIONSHIPS': {}
      };
      dataStructure[row.TABLE_NAME][row.COLUMN_NAME] = {
        COLUMN_INFO: {
          dataType: row.DATA_TYPE,
          simplifiedType: Scanner.getSimplifiedType(row.DATA_TYPE),
          selectModifier: false,
          isNullable: row.IS_NULLABLE,
          isPrimaryKey: false,
          isRestricted: false,
          isForeignKey: false
        }
      };
    }

    for(index in data.keys) {
      let row = data.keys[index];
      if(!dataStructure[row.TABLE_NAME] || !dataStructure[row.TABLE_NAME][row.COLUMN_NAME]){
        throw new Error('StructureScanner: Table or column not found. Table: '
          + row.TABLE_NAME + ' Column: ' + row.COLUMN_NAME);
      }

      if('PRIMARY' === row.CONSTRAINT_NAME) {
        dataStructure[row.TABLE_NAME][row.COLUMN_NAME].COLUMN_INFO.isPrimaryKey = true;
      } else {

        if(!dataStructure[row.REFERENCED_TABLE_NAME] || !dataStructure[row.REFERENCED_TABLE_NAME][row.REFERENCED_COLUMN_NAME]){
          throw new Error('StructureScanner: Referenced table or column not found. Table: '
            + row.REFERENCED_TABLE_NAME + ' Column: ' + row.REFERENCED_COLUMN_NAME);
        }

        dataStructure[row.TABLE_NAME][row.COLUMN_NAME].COLUMN_INFO.isForeignKey = true;

        let aliasReplace = 'ALIASFOR' + row.REFERENCED_TABLE_NAME + row.REFERENCED_COLUMN_NAME;
        dataStructure[row.TABLE_NAME]['TABLE_INFO']['RELATIONSHIPS'][aliasReplace] = {
          'column': row.COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'targetTable': row.REFERENCED_TABLE_NAME,
          'targetColumn': row.REFERENCED_COLUMN_NAME,
          'relates': 'TO_ONE|TO_MANY'
        };

        let referenceAliasReplace = 'ALIASFOR' + row.TABLE_NAME + row.COLUMN_NAME;
        dataStructure[row.REFERENCED_TABLE_NAME]['TABLE_INFO']['INVERSE_RELATIONSHIPS'][referenceAliasReplace] = {
          'column': row.REFERENCED_COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'fromTable': row.TABLE_NAME,
          'fromColumn': row.COLUMN_NAME,
          'relates': 'TO_ONE|TO_MANY'
        };
      }
    }

    return dataStructure;
  }

  /**
   * [Get the simplified type from a MySQL data type ("INT" = "number", "MEDIUMTEXT" = "string"..)]
   *
   * @param {string} type [MySql type.]
   * @return {string} simpleType [Simplified types for a range of MySQL data types.]
   * @throws Error
   **/
  static getSimplifiedType (type) {
    let simpleType;
    type = type.toUpperCase();
    for(simpleType in dataTypeMapping) {
      if(dataTypeMapping.hasOwnProperty(simpleType) && dataTypeMapping[simpleType].indexOf(type) > -1) {
        return simpleType;
      }
    }
    throw new Error('StructureScanner: getSimplifiedType failed with given type: ' + type);
  }

}

module.exports = StructureScanner;