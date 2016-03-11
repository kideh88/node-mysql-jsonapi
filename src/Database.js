'use strict';

let MySql = require('mysql');

// @TODO: Rename file to contain MySQL to avoid later conflicts
class MySqlDatabase {

  constructor (MYSQL_CONFIG) {
    this.CONFIG = MYSQL_CONFIG;
    this.mysql = MySql;
    this.connection = this.mysql.createConnection({
      host: MYSQL_CONFIG.HOST,
      port: MYSQL_CONFIG.PORT,
      user: MYSQL_CONFIG.USER,
      password: MYSQL_CONFIG.PASSWORD,
      database: MYSQL_CONFIG.DATABASE
    });
    this.connection.connect();
  }

  get (statement) {
    return new Promise((resolve, reject) => {
      this.connection.query(statement, function (error, rows, fields) {
        if (error) {
          reject(error);
        } else {
          resolve({rows: rows, fields: fields});
        }
      });
    });
  }

  patch (statement) {
    return new Promise((resolve, reject) => {
      this.connection.query(statement, function (error, rows, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(rows, fields);
        }
      });
    });
  }

  post (statement) {
    return new Promise((resolve, reject) => {
      this.connection.query(statement, function (error, rows, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(rows, fields);
        }
      });
    });
  }

  delete (statement) {
    return new Promise((resolve, reject) => {
      this.connection.query(statement, function (error, rows, fields) {
        if (error) {
          reject(error);
        } else {
          resolve(rows, fields);
        }
      });
    });
  }

  transaction (statements) {
    return new Promise((resolve, reject) => {
      let transactionPromises = [];
      let transactionResults;
      let index;
      for (index in statements) {
        transactionPromises.push(this.getTransactionPromise(connection, statements[index]));
      }

      this.connection.beginTransaction((error) => {
        if (error) {
          reject(error);
        }

        Promise.all(transactionPromises).then(
          function(data) {
            console.log('transaction PROMISE ALL SUCCESS', data);
            transactionResults = data;
          },
          function(error) {
            console.log('transaction PROMISE ALL fail', error);
            connection.rollback(function() {
              reject(error);
            });
          }
        );

        this.connection.commit(function(error) {
          if (error) {
            connection.rollback(function() {
              reject(error);
            });
          } else {
            console.log('commit success!');
            resolve(transactionResults)
          }
        });
      });
    });
  }

  getTransactionPromise (connection, statement) {
    return new Promise((resolve, reject) => {
      connection.query(statement, function(error, result) {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  scanDatabaseStructure () {
    let structureStatement = "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ?;";
    let keyStatement = "SELECT * FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ?;";
    structureStatement = this.mysql.format(structureStatement, this.CONFIG.DATABASE);
    keyStatement = this.mysql.format(keyStatement, this.CONFIG.DATABASE);

    return new Promise ((resolve, reject) => {
      this.connection.query(structureStatement, (error, rows, fields) => {
        let data = {};
        if (error) {
          reject (error);
        }
        data.structure = rows;

        this.connection.query(keyStatement, (error, rows, fields) => {
          if (error) {
            reject (error);
          }
          data.keys = rows;
          resolve(data);
        });
      });
    });
  }

}

module.exports = MySqlDatabase;