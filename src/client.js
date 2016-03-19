'use strict';

const http = require('http');
const EventEmitter = require('events');
const FileSystem = require('fs');
const RequestHandler = require('./request');
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
    this.DB_TYPE = CONFIG.DB_TYPE;
    this.adapterFileCheck();

    Database = require('./database/' + this.DB_TYPE.toLowerCase());
    this[this.DB_TYPE + '_CONFIG'] = CONFIG[this.DB_TYPE];

    this.database = new Database(this[this.DB_TYPE + '_CONFIG']);
    this.requestHandler = new RequestHandler(this);

    try {
      this.schema = new SchemaFactory(this);
    } catch (error) {
      let messages = ['Schema initiation has failed. Please check your config and structure file!'];
      this.endProcess(messages);
    }

    this.server = http.createServer(this.serverRequestListener(this)).listen(this.NODE_CONFIG.PORT, this.NODE_CONFIG.HOSTNAME);
  }

  /**
   * Checks the required files for the given DB_TYPE. Exits the application if any are missing.
   *
   * @return void
   **/
  adapterFileCheck () {
    try{
      FileSystem.accessSync('src/database/' + this.DB_TYPE.toLowerCase() + '.js', FileSystem.R_OK);
      FileSystem.accessSync('src/query/' + this.DB_TYPE.toLowerCase() + '.js', FileSystem.R_OK);
      FileSystem.accessSync('src/scanner/' + this.DB_TYPE.toLowerCase() + '.js', FileSystem.R_OK);
    } catch(error) {
      let messages =[
        'DataHook is missing adapter files in database, query, scanner directory or config DB_TYPE has been misspelled.',
        'Please check adapters and your DataHook config file!'
      ];
      this.endProcess(messages);
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
      DataHook.requestHandler.run(request, response);
    };
  }

  /**
   * Displays given messages as console logs and exits the application
   *
   * @param consoleMessages array
   * @return void
   **/
  endProcess (consoleMessages) {
    let index;
    messages = (messages ? message : []);
    for (index in messages) {
      console.log(messages[index]);
    }
    process.exit();
  }

}

module.exports = DataHook;