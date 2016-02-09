'use strict';

let MySqlDatabase = require('./Database');
let JsonApiQueryBuilder = require('./JsonApiQueryBuilder');
let JsonApiQueryParser = require('jsonapi-query-parser');
let ERROR_CODE = require('http-response-codes');
let FILE_NAME = 'RequestHandler.js';
//let REQUEST_ERROR = {
//  "BODY_TOO_LARGE": {
//    message: 'Request body too large.',
//    code: ERROR_CODE.HTTP_REQUEST_ENTITY_TOO_LARGE
//  },
//  "RESOURCE_MISMATCH": {
//    message: 'Requested resource type does not match request body data.',
//    code: ERROR_CODE.HTTP_BAD_REQUEST
//  },
//};

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

    this.handlers = {
      "get": new GetHandler(this.database, this.queryParser, this.queryBuilder),
      "post": new PostHandler(this.database, this.queryParser, this.queryBuilder, config),
      "patch": new PatchHandler(this.database, this.queryParser, this.queryBuilder, config),
      "delete": new DeleteHandler(this.database, this.queryParser, this.queryBuilder, config)
    }

  }

  run (request) {
    let requestMethod = request.method.toLowerCase();
    if (!this.isMethodAllowed(requestMethod)) {
      return this.rejectRequest(ERROR_CODE.HTTP_METHOD_NOT_ALLOWED);
    }

    if(request.get('Content-Type') !== this.ALLOWED_HEADERS["Content-Type"] || request.get('Accept') !== this.ALLOWED_HEADERS["Accept"]){
      console.log('no match on header');
    }

    try {
      return this.handlers[requestMethod].run(request);
    }
    catch (exception) {
      // @TODO: FIGURE OUT CORRECT ERROR FROM EXCEPTION!! move code to response handler?
      return this.rejectRequest(ERROR_CODE.HTTP_BAD_REQUEST);
    }
  }

  isMethodAllowed (method) {
    return (this.ALLOWED_METHODS.indexOf(method) !== -1);
  };

  rejectRequest (responseCode) {
    // @TODO: ADD ERROR LOGGER
    return new Promise ((resolve, reject) => {
      reject(responseCode)
    });
  }
}

class RequestUtilities {

  constructor (Database, QueryParser, QueryBuilder) {
    this.database = Database;
    this.queryBuilder = QueryBuilder;
    this.queryParser = QueryParser;
  }

  getBodyContent (request, maxSize) {
    return new Promise((resolve, reject) => {
      let bodyData = '';
      request.on('data', function(chunk) {
        bodyData += chunk;
        if(bodyData.length > maxSize) {
          bodyData = "";
          reject(ERROR_CODE.HTTP_REQUEST_ENTITY_TOO_LARGE);
        }
      });
      request.on('end', function() {
        resolve(JSON.parse(bodyData));
      });
    });
  }

}

class GetHandler extends RequestUtilities {
  constructor(Database, QueryParser, QueryBuilder) {
    super(Database, QueryParser, QueryBuilder);
  }

  run (request) {
    let requestData = this.queryParser.parseRequest(request.url);
    let sqlStatement = this.queryBuilder.buildStatement("get", requestData);

    //@TODO: USE PROXY INSTEAD OF DATABASE TO FETCH EITHER CACHED OR NOT
    return this.database[requestMethod](sqlStatement);
  }
}

class PostHandler extends RequestUtilities {
  constructor (Database, QueryParser, QueryBuilder, config) {
    super (Database, QueryParser, QueryBuilder);
    this.maxRequestBodySize = (maxRequestBodySize ? config.maxRequestBodySize : 1e6);
  }

  run (request) {
    let requestData = this.queryParser.parseRequest(request.url);
    this.getBodyContent(request, this.maxRequestBodySize).then(
      function (requestBody) {
        requestData.body = requestBody;
        if (requestBody.data.type !== requestData.resourceType) {
          throw new ReferenceError(ERROR_CODE.HTTP_BAD_REQUEST+'#Requested resource type does not match request body data.', FILE_NAME);
        }
        return this.queryPromise('post', requestData);
      },
      function (errorCode) {
        throw new Error (errorCode + '#Request body too large.', FILE_NAME);
      }
    );
  }
}

class PatchHandler extends RequestUtilities {
  constructor(Database, QueryParser, QueryBuilder, config) {
    super(Database, QueryParser, QueryBuilder);
    this.maxRequestBodySize = (maxRequestBodySize ? config.maxRequestBodySize : 1e6);
  }

  run (request) {
    let requestData = this.queryParser.parseRequest(request.url);
    this.getBodyContent(request, this.maxRequestBodySize).then(
      function (requestBody) {
        requestData.body = requestBody;
        if (requestBody.data.type !== requestData.resourceType) {
          throw new ReferenceError(ERROR_CODE.HTTP_BAD_REQUEST+'#Requested resource type does not match request body data.', FILE_NAME);
        }
        let sqlStatement = this.queryBuilder.buildStatement("patch", requestData);
        return this.database[requestMethod](sqlStatement);
      },
      function (errorCode) {
        throw new Error (errorCode + '#Request body too large.', FILE_NAME);
      }
    );
  }
}

class DeleteHandler extends RequestUtilities {
  constructor(Database, QueryParser, QueryBuilder, config) {
    super(Database, QueryParser, QueryBuilder);
    this.maxRequestBodySize = (maxRequestBodySize ? config.maxRequestBodySize : 1e6);
  }

  run (request) {
    let requestData = this.queryParser.parseRequest(request.url);
    // CHECK IF BODY OR NOT?
    this.getBodyContent(request, this.maxRequestBodySize).then(
      function (requestBody) {
        requestData.body = requestBody;
        if (requestBody.data.type !== requestData.resourceType) {
          throw new ReferenceError(ERROR_CODE.HTTP_BAD_REQUEST+'#Requested resource type does not match request body data.', FILE_NAME);
        }
        let sqlStatement = this.queryBuilder.buildStatement("delete", requestData);
        return this.database[requestMethod](sqlStatement);
      },
      function (errorCode) {
        throw new Error (errorCode + '#Request body too large.', FILE_NAME);
      }
    );
  }
}

module.exports = RequestHandler;
