const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'tienda_ropa'
});

connection.connect((err) => {
  if (err) {
    console.error('no se conecto a la base de datos', err);
    return;
  }
  console.log('conectado a la bd');
});

module.exports = connection;
