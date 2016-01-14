'use strict';

let RequestHandler = require('./RequestHandler');
let ResponseHandler = require('./ResponseHandler');
let MySqlDatabase = require('./Database');

class DataHook {

  constructor(config) {
      this.connection = new MySqlDatabase(config);
      this.requestHandler = new RequestHandler(this.connection);
      this.responseHandler = new ResponseHandler();
  }

}

module.exports = DataHook;