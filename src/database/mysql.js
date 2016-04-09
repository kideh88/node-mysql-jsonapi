'use strict';

const mysql = require('mysql');

class Database {

  /**
   * [Database construct connects automatically with the given config data.]
   *
   * @param {object} CONNECTION_CONFIG [DataHook connection configuration.]
   * @return void
   **/
  constructor (CONNECTION_CONFIG) {
    this.CONFIG = CONNECTION_CONFIG;
    this.mysql = mysql;
    this.connection = this.mysql.createConnection({
      host: CONNECTION_CONFIG.HOST,
      port: CONNECTION_CONFIG.PORT,
      user: CONNECTION_CONFIG.USER,
      password: CONNECTION_CONFIG.PASSWORD,
      database: CONNECTION_CONFIG.DATABASE
    });

    let baseSqlStatements = {
      get: 'SELECT ?? FROM ??',
      post: 'INSERT INTO ?? SET ?',
      put: 'UPDATE ?? SET ?', // needs object { title: "Hello MySQL" }
      delete: 'INSERT INTO ?? SET ?' // needs object { title: "Hello MySQL" }
    };

    console.log(this.mysql.format(baseSqlStatements.get, [['article.id', 'article.name', 'article.age'], 'article']));
    console.log(this.mysql.format(baseSqlStatements.post, ['article', {'article.title': 'NEW', 'article.published': true}]));
    console.log(this.mysql.format(baseSqlStatements.put, ['article', {'article.title': 'hellow', 'article.published': false}]));
    console.log(this.mysql.format(baseSqlStatements.delete, ['article', {'article.title':'hello', 'article.published': true}]));
    //this.connection.connect(); @TODO ENABLE AGAIN WHEN READY
  }

  /**
   * [Execute the request query, uses either a single call method directly or a transaction. Respond with data to callback.]
   *
   * @param {object} extendedRequestData [Extended request information from JsonApiQueryParser and JsonApiBodyParser.]
   * @param {object} callback [Callback to return the data packets or possible errors to.]
   * @return void
   **/
  execute (extendedRequestData, callback) {
    if(extendedRequestData.queries.length === 1) {
      this.singleQuery(extendedRequestData, callback);
    } else {
      this.startTransaction(extendedRequestData, callback);
    }
  }

  /**
   * [Execute a single query and send any data or error to callback function.]
   *
   * @param {object} extendedRequestData [Extended request information from JsonApiQueryParser and JsonApiBodyParser.]
   * @param {object} callback [Callback to return the data packets or possible errors to.]
   * @return void
   **/
  singleQuery (extendedRequestData, callback) {
    this.connection.query(extendedRequestData.queries[0].statement, function (error, rows, fields) {
      extendedRequestData.error = (error ? error : null);
      extendedRequestData.queries[0] = {
        rows: (rows ? rows : null),
        fields: (fields ? fields : null)
      };
      callback(extendedRequestData);
    });
  }

  /**
   * [Start a transaction and set off the recursive query functions.]
   *
   * @param {object} extendedRequestData [Extended request information from JsonApiQueryParser and JsonApiBodyParser.]
   * @param {object} callback [Callback to return the data packets or possible errors to.]
   * @return void
   **/
  startTransaction (extendedRequestData, callback) {
    let lastQueryIndex = (extendedRequestData.queries.length - 1);
    this.connection.beginTransaction((error) => {
      if (error) {
        extendedRequestData.error = error;
        callback(extendedRequestData);
        return;
      }
      this.nextTransaction(lastQueryIndex, 0, extendedRequestData, callback);
    });
  }

  /**
   * [Execute each query recursively. Adds the data to the extendedRequestData object or triggers a rollback on any errors.]
   *
   * @param {number} lastIndex [Last index of the request queries.]
   * @param {number} queryIndex [Index of the current transaction.]
   * @param {object} extendedRequestData [Extended request information from JsonApiQueryParser and JsonApiBodyParser.]
   * @param {object} callback [Callback to return the data packets or possible errors to.]
   * @return void
   **/
  nextTransaction (lastIndex, queryIndex, extendedRequestData, callback) {
    this.connection.query(extendedRequestData.queries[queryIndex], (error, result) => {
      if (error) {
        return connection.rollback(() => {
          extendedRequestData.error = error;
          callback(extendedRequestData);
        });
      }

      extendedRequestData.queries[queryIndex].result = result;

      if (queryIndex < lastIndex) {
        let nextIndex = queryIndex + 1;
        this.nextTransaction(lastIndex, nextIndex, extendedRequestData, callback);
      } else {
        this.endTransaction(extendedRequestData, callback);
      }
    });
  }

  /**
   * [Ends the transaction by commit all the queries. Returns the response via extendedRequestData to the callback or triggers a rollback on any errors.]
   *
   * @param {object} extendedRequestData [Extended request information from JsonApiQueryParser and JsonApiBodyParser.]
   * @param {object} callback [Callback to return the data packets or possible errors to.]
   * @return void
   **/
  endTransaction (extendedRequestData, callback) {
    this.connection.commit((error) => {
      if (error) {
        return connection.rollback(() => {
          extendedRequestData.error = error;
          callback(extendedRequestData);
        });
      }
      callback(extendedRequestData);
    });
  }

}

module.exports = Database;