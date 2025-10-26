// backend/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

//  pool de conexiones
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

//prueba
async function connectDB() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ Conexión exitosa a la base de datos MySQL.');
        connection.release(); 
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        console.error('*** Verifica que XAMPP esté encendido y el DB_NAME en .env sea correcto. ***');
    }
}

connectDB();

// Exportamos el pool para usarlo en otras partes de la API
module.exports = pool;