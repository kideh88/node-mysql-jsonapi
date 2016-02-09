'use strict';

let MySql = require('mysql');

class MySqlDatabase {

  constructor (config) {
    this.mysql = MySql;
    this.connection = this.mysql.createConnection(config);
    this.connection.connect();
  }

  get (statement) {
    return new Promise((resolve, reject) => {
      this.connection.query(statement, function (error, rows, fields) {
        console.log("fields",fields);
        console.log("rows", rows);
        console.log("error", error);
	  	if (error) {
			reject(error);
		} else {
			resolve(rows, fields);
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

}

module.exports = MySqlDatabase;