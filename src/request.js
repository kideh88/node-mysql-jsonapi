'use strict';

let JsonApiQuery;
const ERROR_CODE = require('http-response-codes');
const JsonApiQueryParser = require('jsonapi-query-parser');
const DataHookError = require('./utilities').DataHookError;

class RequestHandler {

  constructor (DataHook) {
    this.DataHook = DataHook;
    JsonApiQuery = require('./query/' + DataHook.DB_TYPE.toLowerCase());

    this.queryParser = new JsonApiQueryParser();
    this.maxRequestBodySize = (this.DataHook.NODE_CONFIG.MAX_REQUEST_SIZE ? this.DataHook.NODE_CONFIG.MAX_REQUEST_SIZE : 1e6);

    this.ALLOWED_METHODS = this.DataHook.NODE_CONFIG.ALLOWED_METHODS;
    this.ALLOWED_CONTENT_TYPE = 'application/vnd.api+json';
    this.headers = {
      'Content-Type': 'application/vnd.api+json',
      'Accept': 'application/vnd.api+json'
    }
  };

  /**
   * Run a node request, given directly through the http request listener.
   *
   * @param request object
   * @param response object
   * @return void
   **/
  run (request, response) {
    let requestMethod;
    try {
      requestMethod = request.method.toLowerCase();
      this.methodAllowed(requestMethod);
      this.setRequestListeners(request, response);
    }
    catch (error) {
      this.rejectRequest(response, error);
    }
  }

  /**
   * Sets all the callbacks for the node request events.
   *
   * @param request object
   * @param response object
   * @return void
   **/
  setRequestListeners (request, response) {
    let requestData = this.queryParser.parseRequest(request.url);
    let requestMethod = request.method.toLowerCase();
    // Set empty object string for later JSON.parse.
    let bodyData = '{}';

    request.on('error', this.requestError);
    request.on('data', this.requestDataStreamCallback(bodyData));
    request.on('end', this.requestExecuteCallback(request, requestMethod, requestData, bodyData, response));
  };

  /**
   * Callback for the node on 'end' event. Executes the request to the database.
   *
   * @param request object
   * @param requestMethod string
   * @param requestData object
   * @param bodyData string
   * @param response object
   * @return void
   **/
  requestExecuteCallback (request, requestMethod, requestData, bodyData, response) {
    return () => {
      if (bodyData !== '{}') {
        this.checkContentHeader(request.headers);
      }
      requestData.body = this.setRequestBody(bodyData, requestData.resourceType);

      // @TODO: MOVE THIS TO ITS OWN FUNCTION WITH TRANSACTION CALLS FOR MULTIPLE STATEMENTS
      let databaseRequest = new JsonApiQuery(this.DataHook.schema, requestMethod, requestData);
      this.DataHook.database[requestMethod](databaseRequest.queries[0], this.querySuccess, this.queryError);
    }
  }

  querySuccess (data) {
    // successCallback wrapper so database doesnt need response/request passed into
    console.log('querySuccess data', data);
  }

  queryError (error) {
    // errorCallback wrapper so database doesnt need response/request passed into
    console.log('queryError error', error);
  }

  /**
   * Parses the given body data and throws DataHookError if the given resourceType does not match the endpoint.
   *
   * @param bodyData string
   * @param resourceType string
   * @return void
   **/
  setRequestBody (bodyData, resourceType) {
    let requestBody = JSON.parse(bodyData);
    if (requestBody && requestBody.data && requestBody.data.type !== resourceType) {
      throw new DataHookError('request.js', 'setRequestBody', 'Wrong resource type', ERROR_CODE.HTTP_BAD_REQUEST);
    }
    return requestBody;
  }

  /**
   * Data stream callback for node on 'data' event. Throws DataHookError if request body is too big.
   *
   * @param bodyData string
   * @return void
   **/
  requestDataStreamCallback (bodyData) {
    return (chunk) => {
      bodyData += chunk;
      if(bodyData.length > this.maxRequestBodySize) {
        bodyData = "";
        throw new DataHookError('request.js', 'prepareRequestPromise', 'Entity too large', ERROR_CODE.HTTP_REQUEST_ENTITY_TOO_LARGE);
      }
    }
  }

  /**
   * Controlled Error throw from the node 'error' event.
   *
   * @param error object
   * @return void
   **/
  requestError (error) {
    throw new DataHookError('request.js', 'prepareRequestPromise', error.toString(), ERROR_CODE.HTTP_BAD_REQUEST);
  }

  /**
   * Reject request if method is not allowed
   *
   * @param method string
   * @return void
   **/
  methodAllowed (method) {
    if (this.ALLOWED_METHODS.indexOf(method) === -1) {
      throw new DataHookError('request.js', 'methodAllowed', 'Method not allowed', ERROR_CODE.HTTP_METHOD_NOT_ALLOWED);
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
      throw new DataHookError('request.js', 'checkHeaders', 'Missing Content-Type header', ERROR_CODE.HTTP_BAD_REQUEST);
    }
    if (this.ALLOWED_CONTENT_TYPE !== headers['Content-Type']) {
      throw new DataHookError('request.js', 'checkHeaders', 'Content-Type not allowed', ERROR_CODE.HTTP_NOT_ACCEPTABLE);
    }
  };

  /**
   * Resolve request with serialized data.
   *
   * @param response object
   * @param rows object
   * @param fields object
   * @return void
   **/
  resolveRequest (response, rows, fields) {
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
    let statusCode = (error.hasOwnProperty('statusCode') ? error.statusCode : 500);
    if (this.DataHook.CONSOLE_LOG_ERRORS) {
      if (!error instanceof DataHookError) {
        console.log('RequestHandler.rejectRequest unexpected error:');
        console.log(error);
      } else {
        console.log('DataHookError in ' + error.fileName + '.' + error.functionName);
        console.log('CODE: ' + error.statusCode);
        console.log('MESSAGE: ' + error.msg);
      }
    }

    response.writeHead(statusCode, {'Accept': this.headers.Accept});
    response.end();
  }
}
module.exports = RequestHandler;
