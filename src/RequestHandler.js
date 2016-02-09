'use strict';

let MySqlDatabase = require('./Database');
let JsonApiQueryBuilder = require('./JsonApiQueryBuilder');
let JsonApiQueryParser = require('jsonapi-query-parser');
let ERROR_CODE = require('http-response-codes');

class RequestHandler {

  constructor (config) {
    this.database = new MySqlDatabase(config);
    this.queryBuilder = new JsonApiQueryBuilder();
    this.queryParser = new JsonApiQueryParser();

    this.ALLOWED_METHODS = ['get', 'post', 'patch', 'delete'];
    this.ALLOWED_HEADERS = {
      "Content-Type": 'application/vnd.api+json',
      "Accept": 'application/vnd.api+json'
    };
  };

  run (request) {
    let requestMethod = request.method.toLowerCase();
    if (!this.isMethodAllowed(requestMethod)) {
      return this.rejectRequest(ERROR_CODE.HTTP_METHOD_NOT_ALLOWED);
    }

    if(request.get('Content-Type') !== this.ALLOWED_HEADERS["Content-Type"] || request.get('Accept') !== this.ALLOWED_HEADERS["Accept"]){
      console.log('no match on header');
    }

    try {
      this.prepareRequestPromise(request, requestMethod).then(
        function(databasePromise) {
          return databasePromise;
        },
        function() {
          // @TODO: FIGURE OUT CORRECT ERROR FROM EXCEPTION!! move code to response handler?
          return this.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
        }
      );
    }
    catch (exception) {
      // @TODO: FIGURE OUT CORRECT ERROR FROM EXCEPTION!! move code to response handler?
      return this.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
    }
  }

  prepareRequestPromise (request, requestMethod) {
    let requestData = this.queryParser.parseRequest(request.url);
    let bodyData = '';
    request.on('data', function(chunk) {
      bodyData += chunk;
      if(bodyData.length > maxSize) {
        bodyData = "";
        return this.rejectRequest(ERROR_CODE.HTTP_REQUEST_ENTITY_TOO_LARGE);
      }
    });
    request.on('end', function() {
      requestData.body = JSON.parse(bodyData);
      if (requestBody.data.type !== requestData.resourceType) {
        return this.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
      }
      let sqlStatement = this.queryBuilder.buildStatement(requestMethod, requestData);
      return this.database[requestMethod](sqlStatement);
    });
  };

  isMethodAllowed (method) {
    return (this.ALLOWED_METHODS.indexOf(method) !== -1);
  };

  rejectRequest (responseCode) {
    // @TODO: ADD ERROR LOGGER
    return new Promise ((resolve, reject) => {
      reject(responseCode)
    });
  };
}
module.exports = RequestHandler;
