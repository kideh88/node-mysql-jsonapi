'use strict';

// Rename class to explain that this is the MySQL builder or rebuild contructor to allow other DBs
class JsonApiQueryBuilder {

  /**
   * Creates the sql statement based on the request data
   *
   * requestData = {
     *   resourceType: null,      // Equal to table name
     *   identifier: null,        // Equal to WHERE id = value
     *   relationships: false,    // Equal to JOIN yes or no
     *   relationshipType: null,  // Equal to table name to JOIN with
     *   queryData: {
     *     include: [],           // Equal to JOIN table name, can contain multiple JOINs
     *     fields: {},            // Equal to SELECT x, y, z instead of *
     *     sort: [],              // Contains information to ORDER BY with possible - in front of value for DESC
     *     page: {},              // Contains information to LIMIT AND OFFSET
     *     filter: []             // NOT IMPLEMENTED YET
     *   }
     * };
   *
   * @param requestMethod string
   * @param requestData object
   * @return statement string
   **/
  buildStatement (requestMethod, requestData) {
    //old value called queryData was to contain the parse values for the query!

    console.log('buildStatement method called: ', JsonApiQueryBuilder.getFunctionName(requestMethod));
    let baseStatement = JsonApiQueryBuilder[JsonApiQueryBuilder.getFunctionName(requestMethod)](requestData);
    console.log("baseStatement", baseStatement);
    return baseStatement;
  }

  static makePostStatement (requestData) {
    let basicStatement = 'INSERT INTO ?? SET ?';
    return basicStatement;
  }

  static makeGetStatement (requestData) {
    let selectFields = '*';
    let whereClause = '';

    if (Object.getOwnPropertyNames(requestData.queryData.fields).length > 0) {
      selectFields = JsonApiQueryBuilder.getFieldSelection(requestData.queryData.fields);
    }
    if (requestData.queryData.sort.length > 0) {
      whereClause = JsonApiQueryBuilder.getWhereClause(requestData.resourceType, requestData.queryData.sort);
    }
    // MISSING ' ' + join + ' ' +
    let basicStatement = 'SELECT ' + selectFields + ' FROM ' + requestData.resourceType + whereClause;
    return basicStatement;
  }

  bindValue (query, key, value) {

  }

  static getFunctionName (requestMethod) {
    let methodName = requestMethod.charAt(0).toUpperCase() + requestMethod.slice(1);
    return 'make' + methodName + 'Statement';
  }

  static getFieldSelection (filter) {
    let tableName, fieldIndex;
    let selection = '';
    for (tableName in filter) {
      for (fieldIndex in filter[tableName]) {
        selection += (selection !== '' ? ', ' : '');
        selection += tableName + '.' + filter[tableName][fieldIndex];
      }
    }
    return selection;
  }

  /**
   *
   * @param tableName string
   * @param sort array
   * @return selection string
   **/
  static getWhereClause (tableName, sort) {
    let whereClause = 'ORDER BY ';
    let columnIndex, columnName, direction;
    let indexCount = 0;
    for (columnIndex in sort) {
      indexCount += 1;
      columnName = sort[columnIndex];
      if(columnName.startsWith('-')) {
        columnName = columnName.replace('-', '');
        direction = ' DESC';
      } else {
        direction = ' ASC';
      }
      whereClause += JsonApiQueryBuilder.concatRef(tableName, columnName) + direction;

      whereClause += ((indexCount+1) <= sort.length ? ', ' : '');
    }
    return whereClause;
  }

  static concatRef (table, field) {
    return  table + '.' + field
  }

}

module.exports = JsonApiQueryBuilder;