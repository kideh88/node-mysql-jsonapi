var mysql = require('mysql');
var dbConfig = require('../config/config.database.js');
var connection = mysql.createConnection();

console.log(dbConfig);
connection.connect();

connection.query('SELECT * FROM article', function (err, rows, fields) {
  console.log('Article data test: ', rows[0].solution);
  console.log('Article err', err);
  console.log('Article fields', fields);
});
