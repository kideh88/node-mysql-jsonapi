'use strict';

let RequestHandler = require('./RequestHandler');
let ResponseHandler = require('./ResponseHandler');
let MySqlDatabase = require('./Database');
let QueryBuilder = require('./QueryBuilder');
let JsonApiQueryParser = require('./JsonApiQueryParser');

class DataHook {

  constructor(connectionConfig, databaseSchema) {
    this.connection = new MySqlDatabase(connectionConfig);
    //this.queryBuilder = new QueryBuilder(databaseSchema);
    this.queryBuilder = '';
    this.queryParser = new JsonApiQueryParser();
    this.requestHandler = new RequestHandler(this.connection, this.queryBuilder, this.queryParser);
    this.responseHandler = new ResponseHandler();
  }

}

module.exports = DataHook;