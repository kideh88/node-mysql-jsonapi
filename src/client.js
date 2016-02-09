'use strict';

let RequestHandler = require('./RequestHandler');
let ResponseHandler = require('./ResponseHandler');

class DataHook {

  constructor(hookConfig) {
    this.requestHandler = new RequestHandler(hookConfig);
    this.responseHandler = new ResponseHandler();
  }

}

module.exports = DataHook;