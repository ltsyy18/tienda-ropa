const express = require('express');
const cors = require('cors');
const db = require('./db');
const auth = require('./auth');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Para servir imágenes

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage: storage });

// ============================================
// ENDPOINT DE PRUEBA
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🚀 Servidor funcionando correctamente',
    fecha: new Date()
  });
});

// ============================================
// AUTENTICACIÓN Y REGISTRO
// ============================================
// Ruta ÚNICA de Login (Admin y Cliente)
app.post('/api/auth/login', auth.login); 

// Nueva Ruta para el Registro de Clientes
app.post('/api/auth/register', auth.register); 

// Ruta Protegida de Prueba (Solo para Administradores)
app.get('/api/admin/dashboard', auth.verifyAdmin, (req, res) => {
    res.json({ 
        mensaje: `✅ Acceso Concedido al Dashboard. Usuario: ${req.user.email}`,
        userId: req.user.id 
    });
});

// Ruta Protegida de Prueba (Solo para Clientes, usando el middleware base)
app.get('/api/cliente/perfil', auth.verifyToken, (req, res) => {
    if (req.user.role !== 'cliente') {
         return res.status(403).json({ mensaje: 'Acceso prohibido. Solo para clientes.' });
    }
    res.json({
        mensaje: `Hola ${req.user.nombre}, bienvenido a tu perfil de cliente.`,
        datos: req.user
    });
});




// ============================================
// PRODUCTOS
// ============================================

// Obtener todos los productos
app.get('/api/productos', (req, res) => {
  const query = 'SELECT * FROM productos WHERE activo = TRUE';
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
  });
});

// ============================================
// RUTAS ADMIN (CREAR / EDITAR / ELIMINAR PRODUCTOS + UPLOAD)
// ============================================

// Subir imagen (multipart/form-data) -> devuelve URL pública
app.post('/api/admin/upload', auth.verifyAdmin, upload.single('imagen'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });

  const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ imagen_url: imageUrl });
});

// Crear producto (JSON) - protegido
app.post('/api/admin/productos', auth.verifyAdmin, (req, res) => {
  const { nombre, descripcion, precio, stock, categoria, talla, color, imagen_url } = req.body;

  const query = `
    INSERT INTO productos (nombre, descripcion, precio, stock, categoria, talla, color, imagen_url, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;
  const values = [nombre, descripcion, precio, stock, categoria, talla, color, imagen_url || null];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al crear producto:', err);
      return res.status(500).json({ error: 'Error al crear producto' });
    }
    res.status(201).json({ id: result.insertId, mensaje: 'Producto creado' });
  });
});

// Editar producto - protegido
app.put('/api/admin/productos/:id', auth.verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, categoria, talla, color, imagen_url } = req.body;

  const query = `
    UPDATE productos SET nombre = ?, descripcion = ?, precio = ?, stock = ?, categoria = ?, talla = ?, color = ?, imagen_url = ? WHERE id = ?
  `;
  const values = [nombre, descripcion, precio, stock, categoria, talla, color, imagen_url || null, id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error al actualizar producto:', err);
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }
    res.json({ mensaje: 'Producto actualizado' });
  });
});

// Eliminar producto (marcar inactivo) - protegido
app.delete('/api/admin/productos/:id', auth.verifyAdmin, (req, res) => {
  const { id } = req.params;
  const query = 'UPDATE productos SET activo = FALSE WHERE id = ?';
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
    res.json({ mensaje: 'Producto eliminado' });
  });
});

// Obtener un producto por ID
app.get('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM productos WHERE id = ?';
  
  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al obtener producto' });
    }
    if (results.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(results[0]);
  });
});

// Obtener productos por categoría
app.get('/api/productos/categoria/:categoria', (req, res) => {
  const { categoria } = req.params;
  const query = 'SELECT * FROM productos WHERE categoria = ? AND activo = TRUE';
  
  db.query(query, [categoria], (err, results) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al obtener productos' });
    }
    res.json(results);
  });
});

// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`
  http://localhost:${PORT}
  `);
});

// ============================================
// ADMIN - CRUD DE PRODUCTOS
// ============================================

// Crear nuevo producto (solo admin)
app.post('/api/admin/productos', auth.verifyAdmin, (req, res) => {
  const { nombre, descripcion, precio, stock, categoria, talla, color, imagen_url } = req.body;
  
  const query = `
    INSERT INTO productos (nombre, descripcion, precio, stock, categoria, talla, color, imagen_url, activo)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)
  `;
  
  db.query(query, [nombre, descripcion, precio, stock, categoria, talla, color, imagen_url], (err, result) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al crear producto' });
    }
    res.status(201).json({ 
      mensaje: 'Producto creado exitosamente', 
      id: result.insertId 
    });
  });
});

// Editar producto (solo admin)
app.put('/api/admin/productos/:id', auth.verifyAdmin, (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, categoria, talla, color, imagen_url } = req.body;
  
  const query = `
    UPDATE productos 
    SET nombre = ?, descripcion = ?, precio = ?, stock = ?, 
        categoria = ?, talla = ?, color = ?, imagen_url = ?
    WHERE id = ?
  `;
  
  db.query(query, [nombre, descripcion, precio, stock, categoria, talla, color, imagen_url, id], (err, result) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al actualizar producto' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto actualizado exitosamente' });
  });
});

// Eliminar producto (solo admin)
app.delete('/api/admin/productos/:id', auth.verifyAdmin, (req, res) => {
  const { id } = req.params;
  
  // Soft delete: marcar como inactivo en vez de eliminar
  const query = 'UPDATE productos SET activo = FALSE WHERE id = ?';
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error:', err);
      return res.status(500).json({ error: 'Error al eliminar producto' });
    }
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ mensaje: 'Producto eliminado exitosamente' });
  });
});