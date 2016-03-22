'use strict';

let mysql = require('mysql');

class Database {

  constructor (MYSQL_CONFIG) {
    this.CONFIG = MYSQL_CONFIG;
    this.mysql = mysql;
    this.connection = this.mysql.createConnection({
      host: MYSQL_CONFIG.HOST,
      port: MYSQL_CONFIG.PORT,
      user: MYSQL_CONFIG.USER,
      password: MYSQL_CONFIG.PASSWORD,
      database: MYSQL_CONFIG.DATABASE
    });
    this.connection.connect();
  }

  /**
   * Execute the request query, uses either a single call method directly or a transaction. Respond with data to callback.
   *
   * @param requestData object
   * @param callback function
   * @return void
   **/
  execute (requestData, callback) {
    if(requestData.queries.length === 1) {
      this.singleQuery(requestData, callback);
    } else {
      this.startTransaction(requestData, callback);
    }
  }

  /**
   * Execute a single query and send any data or error to callback function.
   *
   * @param requestData object
   * @param callback function
   * @return void
   **/
  singleQuery (requestData, callback) {
    this.connection.query(requestData.queries[0].statement, function (error, rows, fields) {
      requestData.error = (error ? error : null);
      requestData.queries[0] = {
        rows: (rows ? rows : null),
        fields: (fields ? fields : null)
      };
      callback(requestData);
    });
  }

  /**
   * Start a transaction and set off the recursive query functions.
   *
   * @param requestData object
   * @param callback function
   * @return void
   **/
  startTransaction (requestData, callback) {
    let lastQueryIndex = (requestData.queries.length - 1);
    this.connection.beginTransaction((error) => {
      if (error) {
        requestData.error = error;
        callback(requestData);
        return;
      }
      this.nextTransaction(lastQueryIndex, 0, requestData, callback);
    });
  }

  /**
   * Execute each query recursively. Adds the data to the requestData object or triggers a rollback on any errors.
   *
   * @param lastIndex integer
   * @param queryIndex integer
   * @param requestData object
   * @param callback function
   * @return void
   **/
  nextTransaction (lastIndex, queryIndex, requestData, callback) {
    this.connection.query(requestData.queries[queryIndex], (error, result) => {
      if (error) {
        return connection.rollback(() => {
          requestData.error = error;
          callback(requestData);
        });
      }

      requestData.queries[queryIndex].result = result;

      if (queryIndex < lastIndex) {
        let nextIndex = queryIndex + 1;
        this.nextTransaction(lastIndex, nextIndex, requestData, callback);
      } else {
        this.endTransaction(requestData, callback);
      }
    });
  }

  /**
   * Ends the transaction by commit all the queries. Returns the response via requestData to the callback or triggers a rollback on any errors.
   *
   * @param requestData object
   * @param callback function
   * @return void
   **/
  endTransaction (requestData, callback) {
    this.connection.commit((error) => {
      if (error) {
        return connection.rollback(() => {
          requestData.error = error;
          callback(requestData);
        });
      }
      callback(requestData);
    });
  }

  /**
   * Get the information schema from the database. Used to create the schema file.
   *
   * @return void
   **/
  scanDatabaseStructure (callback) {
    let structureStatement = "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?;";
    let keyStatement = "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ?;";
    structureStatement = this.mysql.format(structureStatement, this.CONFIG.DATABASE);
    keyStatement = this.mysql.format(keyStatement, this.CONFIG.DATABASE);

    this.connection.query(structureStatement, (error, rows, fields) => {
      let responseData = {};
      if (error) {
        throw new Error(error);
      }
      responseData.structure = rows;

      this.connection.query(keyStatement, (error, rows, fields) => {
        if (error) {
          throw new Error(error);
        }
        responseData.keys = rows;
        callback(responseData);
      });
    });
  }

}

module.exports = Database;