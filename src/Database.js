'use strict';

let MySql = require('mysql');

class MySqlDatabase {

  constructor(config) {
    this.mysql = MySql;
    this.connection = this.mysql.createConnection(config);
    this.connection.connect();
  }

  get(statement) {
    return new Promise((resolve, reject) => {
      //resolve('hello');
      this.connection.query(statement, function (err, rows, fields) {
        resolve(rows);
      });
    });
  }

}

module.exports = MySqlDatabase;