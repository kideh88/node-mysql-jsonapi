'use strict';

let DatabaseQuery;
const ERROR_CODE = require('http-response-codes');
const JsonApiQueryParser = require('jsonapi-query-parser');

class RequestHandler {

  constructor (dataHook) {
    this.dataHook = dataHook;
    // @TODO: RENAME DATABASEQUERY/ JSONAPIQUERY
    DatabaseQuery = require('./query/' + dataHook.DB_TYPE.toLowerCase());

    this.queryParser = new JsonApiQueryParser();
    this.maxRequestBodySize = (this.dataHook.NODE_CONFIG.MAX_REQUEST_SIZE ? this.dataHook.NODE_CONFIG.MAX_REQUEST_SIZE : 1e6);

    this.ALLOWED_METHODS = this.dataHook.NODE_CONFIG.ALLOWED_METHODS;
    this.ALLOWED_CONTENT_TYPE = 'application/vnd.api+json';

  };

  /**
   * [Run a node request, given directly through the http request listener.]
   *
   * @param {object} request [Node http request object.]
   * @param {object} response [Node http request object.]
   * @return void
   **/
  run (request, response) {
    let requestData, requestMethod;
    try {
      requestMethod = request.method.toLowerCase();
      if(request.method === 'OPTIONS') {
        this.resolveRequest(this.adapterInstance.response(request));
      } else {
        this.methodAllowed(requestMethod);
      }

      //requestData = this.queryParser.parseRequest(request.url);
      //this.dataHook.schema._validateRequestData(requestData);
      this.setRequestListeners(request, requestData, response);
    }
    catch (error) {
      this.rejectRequest(response, error);
    }
  }

  /**
   * [Sets all the callbacks for the node request events.]
   *
   * @param {object} request [Node http request object.]
   * @param {object} response [Node http request object.]
   * @return void
   * @throw RequestError
   **/
  setRequestListeners (request, response) {
    request.bodyDataStream = '';
    request.on('error', (error) => {
      throw new RequestError(error.message, ERROR_CODE.HTTP_BAD_REQUEST);
    });
    request.on('data', this.requestDataStreamCallback(request.bodyDataStream));
    request.on('end', () => {
      this.adapter.execute(request, this.queryCallback(response));
    });
  };

  ///**
  // * [Callback for the node on 'end' event. Executes the request to the database.]
  // *
  // * @param {object} request [Node http request object.]
  // * @param {object} response [Node http request object.]
  // * @return void
  // **/
  //requestExecuteCallback (request, response) {
  //  return () => {
  //    //if (bodyData !== '{}') {
  //    //  this.checkContentHeader(request.headers);
  //    //}
  //    //requestData.body = this.getRequestBody(bodyData, requestMethod, requestData);
  //    //let databaseRequest = new JsonApiQuery(this.dataHook, requestMethod, requestData);
  //    this.adapter.execute(request, this.queryCallback(response));
  //    //this.dataHook.database.execute(databaseRequest, this.queryCallback(response));
  //  }
  //}

  /**
   * [Returns a callback for the database execution call. Handles both erroneous and successful calls.]
   *
   * @param {object} response [Node http request object.]
   * @return {object} [Callback function for rejecting or resolving a request.]
   **/
  queryCallback (response) {
    return (adapterResponse) => {
      if (adapterResponse.errors) {
        this.rejectRequest(response, adapterResponse);
      } else {
        this.resolveRequest(response, adapterResponse);
      }
    }
  }

  /**
   * [Parses the given body data and throws RequestError if the given resourceType does not match the endpoint.]
   *
   * @param bodyData string
   * @param requestData object
   * @param requestMethod string
   * @return void
   **/
  getRequestBody (bodyData, requestMethod, requestData) {
    this.validateRequestBody(requestBody, requestMethod, requestData);
    let requestBody = JSON.parse(bodyData); // if {} = empty

    this.dataHook.schema._validateRequestBody();


    return requestBody;
  }

  validateDataMember (body, requestData, isRelationship) {
    this.validateObjectProperty(body, ['data']);
    let data = (bodyObject.data instanceof Array ? body.data : [body.data]);

    let index;
    for (index in data) {
      this.validateObjectProperty(data[index], ['type', 'id']);
      let resourceType = (isRelationship ? this.dataHook.schema[requestData.resourceType]._getRelationshipResourceType(data[index]) : requestData.resourceType);
      this.compareResourceType(data[index], resourceType);

      if (data[index].hasOwnProperty('attributes')) {
        this.dataHook.schema[resourceType]._validateAttributes(data[index].attributes);
      }

      if (data[index].hasOwnProperty('relationships')) {
        let alias;
        for (alias in data[index].relationships) {
          this.dataHook.schema[resourceType]._validateRelationship(alias);
          this.validateDataMember(data[index].relationships[alias], requestData, true);
        }
      }
    }

  }

  validateRequestBody (body, requestMethod, requestData) {
    if (requestMethod === 'get') {
      return true;
    }
    if(requestData.relationships) {
      this.validateDataMember(body, requestData, false);


    } else {
      if (requestMethod === 'patch' || requestMethod === 'post') {
        this.validateDataMember(body);
        if (body.data instanceof Object === false) {
          throw new RequestError('Request `data` Member has to be an instance of `Object`.', ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
        }
      }
    }



  }

  validateRelationshipsData (data) {

  }

  validateObjectProperty (object, attributes, member) {
    let memberLevel = (member ? member : 'Top level');
    let index;
    for (index in attributes) {
      if (!object.hasOwnProperty(attributes[index])) {
        throw new RequestError('Missing attribute `' + attributes[index] + '` in request body member: ' + memberLevel, ERROR_CODE.HTTP_UNPROCESSABLE_ENTITY);
      }
    }

  }

  compareResourceType (data, resourceType) {
    if (!this.dataHook.schema._hasTable(resourceType)) {
      throw new RequestError('Unknown resource type.', ERROR_CODE.HTTP_BAD_REQUEST);
    }
    if (data.type !== resourceType) {
      throw new RequestError('Request resource type does not match endpoint type.', ERROR_CODE.HTTP_BAD_REQUEST);
    }
  }

  /**
   * Data stream callback for node on 'data' event. Throws RequestError if request body is too big.
   *
   * @param bodyData string
   * @return void
   **/
  requestDataStreamCallback (bodyData) {
    return (chunk) => {
      bodyData += chunk;
      if(bodyData.length > this.maxRequestBodySize) {
        bodyData = "";
        throw new RequestError('Entity too large.', ERROR_CODE.HTTP_REQUEST_ENTITY_TOO_LARGE);
      }
    }
  }

  /**
   * Reject request if method is not allowed
   *
   * @param method string
   * @return void
   **/
  methodAllowed (method) {
    if (this.ALLOWED_METHODS.indexOf(method) === -1) {
      throw new RequestError('Method not allowed.', ERROR_CODE.HTTP_METHOD_NOT_ALLOWED);
    }
  };

  /**
   * Reject request if missing or wrong Content-Type header.
   *
   * @param headers object
   * @return void
   **/
  checkContentHeader (headers) {
    if (!headers.hasOwnProperty('Content-Type')) {
      throw new RequestError('Missing Content-Type header.', ERROR_CODE.HTTP_BAD_REQUEST);
    }
    if (this.ALLOWED_CONTENT_TYPE !== headers['Content-Type']) {
      throw new RequestError('Content-Type not allowed.', ERROR_CODE.HTTP_NOT_ACCEPTABLE);
    }
  };

  /**
   * Resolve request with serialized data.
   *
   * @param response object
   * @param data object
   * @return void
   **/
  resolveRequest (response, data) {
    // Always 200?
    response.writeHead(200, this.headers);
    // Needs JSONAPI Serializer here!
    response.end(rows);
  }

  /**
   * Reject request with proper error code and optionally console log the error message.
   *
   * @param response object
   * @param error object
   * @return void
   **/
  rejectRequest (response, error) {
    let statusCode = (error instanceof RequestError ? error.statusCode : 500);
    if (this.dataHook.CONSOLE_LOG_ERRORS) {
      console.log('RequestHandler Error:', error);
      console.log('STATUS_CODE: ' + statusCode);
    }
    response.writeHead(statusCode, this.headers);
    // @TODO: ERROR BY JSONAPI SPEC: http://jsonapi.org/examples/#error-objects
    response.end();
  }
}

class RequestError extends Error {
  /**
   * Construct a RequestError with statusCode for a proper response
   *
   * @param message string
   * @param statusCode integer
   * @return void
   **/
  constructor (message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = RequestHandler;
