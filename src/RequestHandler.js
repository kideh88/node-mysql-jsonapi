'use strict';

let ERROR_CODE = require('./httpResponseCodes');

class RequestHandler {

  constructor (Database, QueryBuilder, JsonApiQueryParser) {
    this.database = Database;
    this.queryBuilder = QueryBuilder;
    this.queryParser = JsonApiQueryParser;
    this.ALLOWED_METHODS = ['GET', 'POST', 'PATCH', 'DELETE']
  }

  isMethodAllowed (method) {
    return (this.ALLOWED_METHODS.indexOf(method) !== -1);
  };

  delegate (request) {
    let requestData = this.queryParser.parseRequest(request.url);

    console.log(requestData);

    if (!this.isMethodAllowed(request.method)) {
      return this.rejectRequest(ERROR_CODE.HTTP_METHOD_NOT_ALLOWED);
    } else {
      //var sqlStatement = this.queryBuilder.getStatement(request.url); // contains /api/article
      var sqlStatement = 'SELECT * FROM article';
      return this.database[request.method.toLowerCase()](sqlStatement);
    }

  }

  rejectRequest (responseCode) {
    return new Promise ((resolve, reject) => {
      reject(responseCode)
    });
  }

}

module.exports = RequestHandler;
