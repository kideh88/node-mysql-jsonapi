'use strict';

let JsonApiQueryBuilder;
const ERROR_CODE = require('http-response-codes');
const JsonApiQueryParser = require('jsonapi-query-parser');

class RequestHandler {

  constructor (DataHook) {
    this.DataHook = DataHook;
    JsonApiQueryBuilder = require('./query/' + DataHook.DB_TYPE.toLowerCase());

    this.queryParser = new JsonApiQueryParser();
    this.queryBuilder = new JsonApiQueryBuilder();
    this.maxRequestBodySize = (this.DataHook.NODE_CONFIG.MAX_REQUEST_SIZE ? this.DataHook.NODE_CONFIG.MAX_REQUEST_SIZE : 1e6);

    this.ALLOWED_METHODS = this.DataHook.NODE_CONFIG.ALLOWED_METHODS;
    this.ALLOWED_CONTENT_TYPE = this.DataHook.NODE_CONFIG.CONTENT_TYPE;
  };

  run (request) {
    let requestMethod = request.method.toLowerCase();
    if (!this.isMethodAllowed(requestMethod)) {
      return this.rejectRequest(ERROR_CODE.HTTP_METHOD_NOT_ALLOWED);
    }

    let hasBodyContent = request.headers.hasOwnProperty('content-type');
    if(hasBodyContent) {
      if (this.ALLOWED_CONTENT_TYPE.indexOf(request.headers['content-type']) === -1) {
        return this.rejectRequest(ERROR_CODE.HTTP_NOT_ACCEPTABLE);
      }
    }

    try {
      console.log('run try prepare');
      this.prepareRequestPromise(request, requestMethod).then(
        function(databasePromise) {
          console.log('databasePromise', databasePromise);
          return databasePromise;
        },
        function() {
          // @TODO: FIGURE OUT CORRECT ERROR FROM EXCEPTION!! move code to response handler?
          return this.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
        }
      );
    }
    catch (exception) {
      console.log(exception);
      // @TODO: FIGURE OUT CORRECT ERROR FROM EXCEPTION!! move code to response handler?
      return this.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
    }
  }

  prepareRequestPromise (request, requestMethod, hasBodyContent) {
    let requestData = this.queryParser.parseRequest(request.url);
    let bodyData = '';
    let handler = this;
    request.on('error', function (error) {
      // @TODO: figure out error error
      // USE DATAHOOK.on Event to broadcast an error?
      console.log('error in prepareRequestPromise', error);
      return handler.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
    });
    request.on('data', function(chunk) {
      bodyData += chunk;
      if(bodyData.length > handler.maxRequestBodySize) {
        bodyData = "";
        return handler.rejectRequest(ERROR_CODE.HTTP_REQUEST_ENTITY_TOO_LARGE);
      }
    });
    request.on('end', function() {
      if (hasBodyContent && bodyData.length > 0) {
        requestData.body = JSON.parse(bodyData);
      }
      if (requestData.body && requestData.body.data && requestData.body.data.type !== requestData.resourceType) {
        return handler.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
      }
      let sqlStatement = handler.queryBuilder.buildStatement(requestMethod, requestData);
      return handler.DataHook.database[requestMethod](sqlStatement);
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
