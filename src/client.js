'use strict';

const http = require('http');
const EventEmitter = require('events');
const FileSystem = require('fs');
const RequestHandler = require('./request');
const SchemaFactory = require('./schema/schema');
let Database;

class DataHook extends EventEmitter {

  /**
   * [DataHook constructor extending EventEmitter and creating server. First time running will scaffold a database structure config file.]
   *
   * @param {object} CONFIG [Content of DataHook configuration file.]
   * @return void
   **/
  constructor(CONFIG) {
    super();
    this.NODE_CONFIG = CONFIG.NODE;
    this.DB_TYPE = CONFIG.DB_TYPE;
    this.CONSOLE_LOG_ERRORS = CONFIG.CONSOLE_LOG_ERRORS;
    this.LOG_FILE = CONFIG.LOG_FILE;
    this.adapterFileCheck();

    Database = require('./database/' + this.DB_TYPE.toLowerCase());
    this.CONNECTION_CONFIG = CONFIG.CONNECTION;

    this.database = new Database(this.CONNECTION_CONFIG);
    this.requestHandler = new RequestHandler(this);

    try {
      this.schema = new SchemaFactory(this);
    } catch (error) {
      // @TODO HANDLE ERROR CORRECTLY
      let messages = ['Schema initiation has failed. Please check your config and structure file!'];
      this.endProcess(messages);
    }

    this.server = http.createServer(this.serverRequestListener(this)).listen(this.NODE_CONFIG.PORT, this.NODE_CONFIG.HOSTNAME);
  }

  /**
   * [Checks the required files for the given DB_TYPE. Exits the application if any are missing.]
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
   * [Returns a request listener for the node createServer function
   * Get passed 'this' scope into DataHook since 'this' points at http server.
   * Needs to pass the request and response objects back to callback.]
   *
   * @param {object} dataHook [Passes itself as parameter to enable access to its properties inside RequestHandler.]
   * @return {object} callback [Request listener callback for node requests.]
   **/
  serverRequestListener (dataHook) {
    return (request, response) => {
      dataHook.requestHandler.run(request, response);
    };
  }

  /**
   * [Displays given messages as console logs and exits the application.]
   *.
   * @param {[string]} messages [An array of error messages.]
   * @return void
   **/
  endProcess (messages) {
    if (messages && this.DATA_HOOK.LOG_ERRORS) {
      let index;
      for (index in messages) {
        console.log(messages[index]);
      }
    }

    process.exit();
  }

}

module.exports = DataHook;