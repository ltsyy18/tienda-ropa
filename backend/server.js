const express = require('express');
const cors = require('cors');
const db = require('./db');
const auth = require('./auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads')); // Para servir imágenes
app.use('/comprobantes', express.static('comprobantes')); // Para servir comprobantes

// Las tablas relacionadas con pedidos, detalle_pedidos y pagos se
// asumen ya creadas en la base de datos (no las creamos desde el servidor).

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Si es un comprobante, va a la carpeta comprobantes
    const folder = file.fieldname === 'comprobante' ? 'comprobantes' : 'uploads';
    // Crear la carpeta si no existe
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }
    cb(null, folder);
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
// PEDIDOS (Checkout)
// ============================================
// Crear un pedido y decrementar stock en transacción
app.post('/api/pedidos', (req, res) => {
  const userId = req.user?.id || 1; // Temporal: si no hay usuario autenticado, usamos ID 1
  const { cliente, items, total, metodoPago, numeroOperacion, comprobanteUrl } = req.body;

  if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'Datos de pedido inválidos' });
  }

  db.query('START TRANSACTION', async (err) => {
    if (err) {
      console.error('Error iniciando transacción:', err);
      return res.status(500).json({ mensaje: 'Error interno' });
    }

    // Generar código de seguimiento único
    const codigoSeguimiento = 'PED-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();

    const pedidoQuery = `
      INSERT INTO pedidos (
        usuario_id, 
        codigo_seguimiento, 
        total, 
        direccion_envio, 
        metodo_compra
      ) VALUES (?, ?, ?, ?, ?)
    `;
    const pedidoValues = [
      userId,
      codigoSeguimiento,
      total,
      cliente.direccion,
      'invitado'
    ];

    db.query(pedidoQuery, pedidoValues, (err, result) => {
      if (err) {
        console.error('Error insertando pedido:', err);
        return db.query('ROLLBACK', () => res.status(500).json({ mensaje: 'Error interno al crear pedido' }));
      }

      const pedidoId = result.insertId;

      // Insertar el pago
      const pagoQuery = `
        INSERT INTO pagos (
          pedido_id,
          monto,
          metodo_pago,
          numero_operacion,
          comprobante_url,
          estado
        ) VALUES (?, ?, ?, ?, ?, 'pendiente')
      `;
      
      db.query(pagoQuery, [pedidoId, total, metodoPago, numeroOperacion, comprobanteUrl], (err) => {
        if (err) {
          console.error('Error insertando pago:', err);
          return db.query('ROLLBACK', () => res.status(500).json({ mensaje: 'Error interno al registrar el pago' }));
        }

        const processItem = (index) => {
          if (index >= items.length) {
            return db.query('COMMIT', (err) => {
              if (err) {
                console.error('Error en commit:', err);
                return db.query('ROLLBACK', () => res.status(500).json({ mensaje: 'Error interno al confirmar pedido' }));
              }
              return res.status(201).json({ 
                pedidoId, 
                codigoSeguimiento,
                mensaje: 'Pedido creado correctamente' 
              });
            });
          }

          const it = items[index];
          const productoId = it.producto_id || it.id || it.productoId;
          const cantidad = it.cantidad;
          const precio = it.precio || it.precio_unitario || 0;
          const subtotal = (precio * cantidad).toFixed(2);

          // Verificar y actualizar stock
          const updateStockQuery = 'UPDATE productos SET stock = stock - ? WHERE id = ? AND stock >= ?';
          db.query(updateStockQuery, [cantidad, productoId, cantidad], (err, updateResult) => {
            if (err) {
              console.error('Error actualizando stock:', err);
              return db.query('ROLLBACK', () => res.status(500).json({ mensaje: 'Error interno al actualizar stock' }));
            }

            if (updateResult.affectedRows === 0) {
              return db.query('ROLLBACK', () => res.status(409).json({ mensaje: `Stock insuficiente para el producto ${productoId}` }));
            }

            // Insertar detalle del pedido
            const detalleQuery = `
              INSERT INTO detalle_pedidos (
                pedido_id,
                producto_id,
                cantidad,
                precio_unitario,
                subtotal
              ) VALUES (?, ?, ?, ?, ?)
            `;
            
            db.query(detalleQuery, [pedidoId, productoId, cantidad, precio, subtotal], (err) => {
              if (err) {
                console.error('Error insertando detalle_pedido:', err);
                return db.query('ROLLBACK', () => res.status(500).json({ mensaje: 'Error interno al insertar detalle' }));
              }

              processItem(index + 1);
            });
          });
        };

        processItem(0);
      });
    });
  });
});

// ============================================
// SUBIDA DE COMPROBANTES
// ============================================
app.post('/api/upload-comprobante', upload.single('comprobante'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  const comprobanteUrl = `${req.protocol}://${req.get('host')}/comprobantes/${req.file.filename}`;
  res.json({ url: comprobanteUrl });
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