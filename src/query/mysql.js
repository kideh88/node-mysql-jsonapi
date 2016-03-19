'use strict';

class JsonApiQuery {

  constructor (schema, requestMethod, requestData) {
    this.schema = schema;
    this.querySelect = [];

    this.requestMethod = requestMethod;
    this.requestData = requestData;
    this.queries = [];
    this.buildQuery();

    return this;
  }

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
   * @return statement string
   **/
  buildQuery () {
    // THIS IS BASE STATEMENT -- CAN HAVE MULTIPLE PARTS DEPENDING ON INCLUDE QUERY
    // THE FOLLOWING METHOD IS AFFECTED BY: queryData.fields, queryData.sort, queryData.page, (queryData.filter)
    console.log('buildStatement method called: ', this.getFunctionName(this.requestMethod));

    let baseStatement;
    try {
      baseStatement = this[this.getFunctionName()]();
      this.queries.push(baseStatement);
    } catch (error) {
      console.log('buildStatement error', error);
    }
    console.log("BASESTATEMENT RETURNED: ", baseStatement);
  }

  static makePostStatement () {
    let basicStatement = 'INSERT INTO ?? SET ?';
    return basicStatement;
  }

  makeGetStatement () {
    console.log('INSIDE makeGetStatement');
    return 'SELECT * FROM article;';
    //let hasFieldFilter = (Object.getOwnPropertyNames(requestData.queryData.fields).length > 0);
    //let fieldFilter = (hasFieldFilter ? requestData.queryData.fields : null);
    //let selectFields = this.schema[resourceType]._getSelectorArray(fieldFilter);
    //let whereClause = '';
    //
    //if (Object.getOwnPropertyNames(requestData.queryData.fields).length > 0) {
    //  selectFields = JsonApiQuery.getFieldSelection(requestData.queryData.fields);
    //}
    //if (requestData.queryData.sort.length > 0) {
    //  whereClause = JsonApiQuery.getWhereClause(requestData.resourceType, requestData.queryData.sort);
    //}
    //// MISSING ' ' + join + ' ' +
    //let basicStatement = 'SELECT ' + selectFields + ' FROM ' + requestData.resourceType + whereClause;
    //return basicStatement;
  }

  bindValue (query, key, value) {

  }

  getFunctionName () {
    let methodName = this.requestMethod.charAt(0).toUpperCase() + this.requestMethod.slice(1);
    return 'make' + methodName + 'Statement';
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
      whereClause += JsonApiQuery.concatRef(tableName, columnName) + direction;

      whereClause += ((indexCount+1) <= sort.length ? ', ' : '');
    }
    return whereClause;
  }

}

module.exports = JsonApiQuery;