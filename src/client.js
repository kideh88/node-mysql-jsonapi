'use strict';

const http = require('http');
const EventEmitter = require('events');
// Should not be bound to mysql only?
// Or use mysql only and later DataHook will be open for more?
const MySqlDatabase = require('./Database');
const RequestHandler = require('./RequestHandler');
const ResponseHandler = require('./ResponseHandler');

const SchemaFactory = require('./SchemaFactory');

class DataHook extends EventEmitter {

  /**
   * DataHook constructor extending super EventEmitter, first time running will scaffold a structure config
   *
   * @param CONFIG object
   * @return void
   **/
  constructor(CONFIG) {
    super();
    this.NODE_CONFIG = CONFIG.NODE;
    this.DB_TYPE = DATA_HOOK.DB_TYPE;
    this[this.DB_TYPE + '_CONFIG'] = CONFIG[this.DB_TYPE];

    // CHANGE EXPORTS NAME TO DATABASE
    this.database = new MySqlDatabase(this.DB_TYPE + '_CONFIG');
    this.requestHandler = new RequestHandler(this);
    this.responseHandler = new ResponseHandler(this);
    this.dataStructure = {};

    try {
      this.schema = new SchemaFactory(this);
    } catch (error) {
    }

    this.server = http.createServer(this.serverRequestListener(this)).listen(this.NODE_CONFIG.PORT, this.NODE_CONFIG.HOSTNAME);
  }

  /**
   * Returns a request listener for the node createServer function
   * Get passed 'this' scope into DataHook since 'this' points at http server.
   * Needs to pass the request and response objects back to callback
   *
   * @param DataHook object
   * @return object function
   **/
  serverRequestListener (DataHook) {
    return (request, response) => {
      DataHook.requestHandler.run(request).then(
        (rows) => {
          DataHook.responseHandler.respondWithSuccess(rows, response);
        },
        (error) => {
          DataHook.responseHandler.respondWithError(error, response);
        }
      );
    }
  }

}

module.exports = DataHook;