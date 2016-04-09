'use strict';

let sqlStringFormat = require('mysql').format;
const baseStatements = {
  get: 'SELECT ?? FROM `TABLE_NAME`',
  post: 'INSERT INTO `TABLE_NAME` SET ?',
  put: 'UPDATE `TABLE_NAME` SET ?',
  delete: 'DELETE FROM `TABLE_NAME`'
};

const basePartials = {
  where: 'WHERE ?',
  and: 'AND ?',
  order: 'ORDER BY ?? ??',
  limit: 'LIMIT ??'
};
const idConditionConstraint = ['patch', 'delete'];

class DatabaseQuery {

  // @TODO: check is extendedRequestData?
  constructor (dataHook, requestMethod, requestData) {
    // Schema for validation and SqlString.format for escaping and binding values.
    this.schema = dataHook.schema;
    this.format = dataHook.database.mysql.format;

    // Current request method and its given data.
    this.requestMethod = requestMethod;
    this.requestData = requestData;

    // Preparing the response value.
    this.queryData = this.buildQueryData();

    return this.queryData;
  }

  /**
   * Creates the all the query objects with their resourceTypes and statements.
   *
   * @TODO: REMOVE THIS WHEN IMPLEMENTED
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
   * @return void
   **/
  buildQueryData () {
    // THIS IS BASE STATEMENT -- CAN HAVE MULTIPLE PARTS DEPENDING ON INCLUDE QUERY
    // THE FOLLOWING METHOD IS AFFECTED BY: queryData.fields, queryData.sort, queryData.page, (queryData.filter)
    console.log('buildStatement method called: ', this.getFunctionName());

    let baseStatement = baseStatements[this.requestMethod];
    baseStatement = this.bindTableName(baseStatement);
    baseStatement = this.bindBaseValues(baseStatement);
    baseStatement = this.bindConditions(baseStatement);
    let baseQuery = {
      statement: baseStatement,
      hasCondition: false
    };



    try {
      baseStatement = this[this.getFunctionName()]();
      this.queries.push(baseStatement);
    } catch (error) {
      console.log('buildStatement error', error);
    }

    //return all query data with this structure:
    //let queryObject = {
    //  statement:'SELECT * FROM article;',
    //  resourceType: ''
    //};



  }

  bindTableName (statement) {
    return statement.replace('TABLE_NAME', this.requestData.resourceType);
  }

  bindBaseValues (statement) {
    switch (this.requestMethod) {
      case 'get':
        let fieldset = this.requestData.queryData.fields;
        statement = this.format(statement, [this.schema[this.requestData.resourceType]._getSelectorArray(fieldset)]);
        break;
      case 'post':
        //let body =  THIS NEEDS A VALIDATION READER???
        let selectors = false; // NEEDS A GETPOSTCOLUMNS? ID SHOULD NOT BE INSERTED, SAME GOES FOR CREATED_AT OR SIMILIAR
        let mock = {};
        let mockOutput = {
          'article.title': 'Hello World',
          'article.content': 'This is stuff'
        };
        statement = this.format(statement, mockOutput);
        break;
      case 'patch':
        let mockOutput = {
          'article.title': 'Hello World',
          'article.content': 'This is stuff'
        };
        statement = this.format(statement, mockOutput);
        break;
      case 'delete':
      default:
        break;
    }
    return statement;
  }

  bindConditions (statement) {
    // @TODO: FILTER IN HERE IF IT SHOULD BE IMPLEMENTED
    if (!this.requestData.identifier && idConditionConstraint.indexOf(this.requestMethod) === -1) {
      return statement;
    }
    statement += ' ' + basePartials.where;
    statement = this.format(statement, {id: this.requestData.identifier});
    return statement;
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


}

module.exports = DatabaseQuery;