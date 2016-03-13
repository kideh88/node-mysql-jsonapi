'use strict';

const http = require('http');
const EventEmitter = require('events');
const FileSystem = require('fs');
const RequestHandler = require('./request');
const ResponseHandler = require('./response');
const SchemaFactory = require('./schema');
let Database;

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
    this.dependencyFileCheck();

    Database = require('./database/' + this.DB_TYPE.toLowerCase());
    this[this.DB_TYPE + '_CONFIG'] = CONFIG[this.DB_TYPE];

    this.database = new Database(this[this.DB_TYPE + '_CONFIG']);
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
   * Checks the required files for the given DB_TYPE. Exits the application if any are missing.
   *
   * @return void
   **/
  dependencyFileCheck () {
    try{
      FileSystem.accessSync('database/' + this.DB_TYPE.toLowerCase(), FileSystem.R_OK);
      FileSystem.accessSync('query/' + this.DB_TYPE.toLowerCase(), FileSystem.R_OK);
      FileSystem.accessSync('scanner/' + this.DB_TYPE.toLowerCase(), FileSystem.R_OK);
    } catch(error) {
      console.log('DataHook is missing adapter files in database, query, scanner directory or config DB_TYPE has been misspelled.');
      console.log('Please check adapters and your DataHook config file!');
      process.exit();
    }
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