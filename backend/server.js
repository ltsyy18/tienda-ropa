// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config(); 

// Importa la conexión a DB. Esto ejecuta la función connectDB() del Paso 2.3.
const db = require('./config/db'); 

const app = express(); 

// Middlewares: configuraciones base
app.use(cors()); // Permite la comunicación con el frontend (Angular)
app.use(express.json()); // Permite a Express leer el cuerpo de peticiones JSON

// Puerto (leído de .env, por defecto 3000)
const PORT = process.env.PORT || 3000;

// =======================================================
// ZONA DE RUTAS (API Endpoints)
// =======================================================

// Ruta de prueba: GET http://localhost:3000/
app.get('/', (req, res) => {
    res.status(200).json({ mensaje: 'API de E-commerce lista para arrancar.' });
});

// Nota: Aquí añadiremos las rutas de /api/admin y /api/productos en los siguientes pasos.


// =======================================================
// INICIO DEL SERVIDOR
// =======================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor Express iniciado en http://localhost:${PORT}`);
});