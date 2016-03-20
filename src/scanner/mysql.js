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
   * @TODO: ADD TO-ONE OR TO-MANY FIELD - REQUIRED FOR JSONAPI RETURN LOGIC
   * @param data object
   * @return dataStructure object
   **/
  static generateDataStructure (data) {
    let dataStructure = {};
    let index;
    for(index in data.structure) {
      let row = data.structure[index];

      dataStructure[row.TABLE_NAME] = (dataStructure[row.TABLE_NAME] ? dataStructure[row.TABLE_NAME] : {});
      dataStructure[row.TABLE_NAME]['TABLE_INFO'] = {
        'NAME': row.TABLE_NAME,
        'INVERSE_RELATIONS': {},
        'RELATIONS': {}
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
        throw new Error('Structure scan: Table or column not found. Table: '
          + row.TABLE_NAME + ' Column: ' + row.COLUMN_NAME);
      }

      if('PRIMARY' === row.CONSTRAINT_NAME) {
        dataStructure[row.TABLE_NAME][row.COLUMN_NAME].COLUMN_INFO.isPrimaryKey = true;
      } else {

        if(!dataStructure[row.REFERENCED_TABLE_NAME] || !dataStructure[row.REFERENCED_TABLE_NAME][row.REFERENCED_COLUMN_NAME]){
          throw new Error('Structure scan: Referenced table or column not found. Table: '
            + row.REFERENCED_TABLE_NAME + ' Column: ' + row.REFERENCED_COLUMN_NAME);
        }

        dataStructure[row.TABLE_NAME][row.COLUMN_NAME].COLUMN_INFO.isForeignKey = true;

        let aliasReplace = 'ALIASFOR' + row.REFERENCED_TABLE_NAME + row.REFERENCED_COLUMN_NAME;
        dataStructure[row.TABLE_NAME]['TABLE_INFO']['RELATIONS'][aliasReplace] = {
          'column': row.COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'targetTable': row.REFERENCED_TABLE_NAME,
          'targetColumn': row.REFERENCED_COLUMN_NAME
        };

        let referenceAliasReplace = 'ALIASFOR' + row.TABLE_NAME + row.COLUMN_NAME;
        dataStructure[row.REFERENCED_TABLE_NAME]['TABLE_INFO']['INVERSE_RELATIONS'][referenceAliasReplace] = {
          'column': row.REFERENCED_COLUMN_NAME,
          'name': row.CONSTRAINT_NAME,
          'fromTable': row.TABLE_NAME,
          'fromColumn': row.COLUMN_NAME
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
    let simpleType;
    type = type.toUpperCase();
    for(simpleType in dataTypeMapping) {
      if(dataTypeMapping.hasOwnProperty(simpleType) && dataTypeMapping[simpleType].indexOf(type) > -1) {
        return simpleType;
      }
    }
    throw new Error('Scanner getSimplifiedType failed with given type: ' + type);
  }

}

module.exports = Scanner;