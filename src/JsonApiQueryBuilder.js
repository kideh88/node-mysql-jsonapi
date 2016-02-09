'use strict';

class JsonApiQueryBuilder {

  constructor () {

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
   *
   * @param requestMethod string
   * @param requestData object
   * @return statement string
   **/
  buildStatement (requestMethod, requestData) {
    var queryData = [];
    let baseStatement = JsonApiQueryBuilder['make' + capitalizeFirstLetter(requestMethod) + 'Statement'](requestData, queryData);
    return baseStatement;
  }

  makePostStatement (requestData, queryData) {
    let basicStatement = 'INSERT INTO ?? SET ?';
    queryData.push(requestData.resourceType);
    return basicStatement;
  }

  makeGetStatement (requestData, queryData) {
    let basicStatement = 'SELECT * FROM article';
    queryData.push(requestData.resourceType);
    return basicStatement;
  }

  bindValue (query, key, value) {

  }

  capitalizeFirstLetter (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

}

module.exports = JsonApiQueryBuilder;