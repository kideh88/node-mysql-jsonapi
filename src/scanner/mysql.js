'use strict';

let dataTypeMapping = {
  "boolean": ["BOOL", "BOOLEAN"],
  "number": ["TINYINT", "SMALLINT", "MEDIUMINT", "BIGINT", "INTEGER", "INT"],
  "float": ["DECIMAL", "FLOAT", "DEC", "DOUBLE", "DOUBLE_PRECISION"],
  "timestamp": ["DATE", "DATETIME", "TIMESTAMP"],
  "string": ["TEXT", "MEDIUMTEXT", "CHAR", "VARCHAR", "TINYTEXT"]
};

class Scanner {

  /**
   * Set and remap the given information schema data to a usable mapping object in the returned dataStructure
   *
   * @param data object
   * @return dataStructure object
   **/
  static generateDataStructure (data) {
    let dataStructure = {};
    let index;
    for(index in data.structure) {
      let row = data.structure[index];

      dataStructure[row.TABLE_NAME] = (dataStructure[row.TABLE_NAME] ? dataStructure[row.TABLE_NAME] : {});
      dataStructure[row.TABLE_NAME]['INVERSE_RELATIONS'] = {};
      dataStructure[row.TABLE_NAME]['RELATIONS'] = {};
      dataStructure[row.TABLE_NAME][row.COLUMN_NAME] = {
        data_type: row.DATA_TYPE,
        simplified_type: MySQLScanner.getSimplifiedType(row.DATA_TYPE),
        select_modifier: false,
        is_nullable: row.IS_NULLABLE,
        is_primaryKey: false,
        is_restricted: false,
        is_foreignKey: false
      };
    }

    for(index in data.keys) {
      let row = data.keys[index];
      if(!dataStructure[row.TABLE_NAME] || !dataStructure[row.TABLE_NAME][row.COLUMN_NAME]){
        throw new Error('Structure scan: Table or column not found. Table: '
          + row.TABLE_NAME + ' Column: ' + row.COLUMN_NAME);
      }

      if('PRIMARY' === row.CONSTRAINT_NAME) {
        dataStructure[row.TABLE_NAME][row.COLUMN_NAME].is_primaryKey = true;
      } else {

        if(!dataStructure[row.REFERENCED_TABLE_NAME] || !dataStructure[row.REFERENCED_TABLE_NAME][row.REFERENCED_COLUMN_NAME]){
          throw new Error('Structure scan: Referenced table or column not found. Table: '
            + row.REFERENCED_TABLE_NAME + ' Column: ' + row.REFERENCED_COLUMN_NAME);
        }

        dataStructure[row.TABLE_NAME][row.COLUMN_NAME].is_foreignKey = true;

        let aliasReplace = 'ALIASFOR' + row.REFERENCED_TABLE_NAME + row.REFERENCED_COLUMN_NAME;
        dataStructure[row.TABLE_NAME]['RELATIONS'][aliasReplace] = {
          'column': row.COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'target_table': row.REFERENCED_TABLE_NAME,
          'target_column': row.REFERENCED_COLUMN_NAME
        };

        let referenceAliasReplace = 'ALIASFOR' + row.TABLE_NAME + row.COLUMN_NAME;
        dataStructure[row.REFERENCED_TABLE_NAME]['INVERSE_RELATIONS'][referenceAliasReplace] = {
          'column': row.REFERENCED_COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'from_table': row.TABLE_NAME,
          'from_column': row.COLUMN_NAME
        };
      }
    }

    return dataStructure;
  }

  /**
   * Get the simplified type from a MySQL data type ("INT" = "number", "MEDIUMTEXT" = "string"..)
   *
   * @param type string
   * @return simple_type string
   **/
  static getSimplifiedType (type) {
    let simple_type;
    type = type.toUpperCase();
    for(simple_type in dataTypeMapping) {
      if(dataTypeMapping.hasOwnProperty(simple_type) && dataTypeMapping[simple_type].indexOf(type) > -1) {
        return simple_type;
      }
    }
    throw new Error('Scanner getSimplifiedType failed with given type: ' + type);
  }

}

module.exports.Scanner = Scanner;