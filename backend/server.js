require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const auth = require('./auth');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Cliente de Supabase para Storage (importado desde db.js)
const supabase = db.supabase;

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de multer para subida temporal
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ============================================
// ENDPOINT DE PRUEBA
// ============================================
app.get('/', (req, res) => {
  res.json({ 
    mensaje: '🚀 Servidor FashionStyle funcionando con Supabase',
    fecha: new Date(),
    database: 'PostgreSQL (Supabase)'
  });
});

// ============================================
// AUTENTICACIÓN Y REGISTRO
// ============================================
app.post('/api/auth/login', auth.login); 
app.post('/api/auth/register', auth.register); 

app.get('/api/admin/dashboard', auth.verifyAdmin, (req, res) => {
  res.json({ 
    mensaje: `✅ Acceso Concedido al Dashboard. Usuario: ${req.user.email}`,
    userId: req.user.id 
  });
});

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
// PRODUCTOS - PÚBLICOS
// ============================================
app.get('/api/productos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('activo', true)
      .order('fecha_agregado', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error obteniendo productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

app.get('/api/productos/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(data);
  } catch (error) {
    console.error('Error obteniendo producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

app.get('/api/productos/categoria/:categoria', async (req, res) => {
  const { categoria } = req.params;
  
  try {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('categoria', categoria)
      .eq('activo', true);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error obteniendo productos por categoría:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// ============================================
// ADMIN - SUBIR IMAGEN A SUPABASE STORAGE
// ============================================
app.post('/api/admin/upload', auth.verifyAdmin, upload.single('imagen'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  try {
    const fileName = `${Date.now()}-${req.file.originalname}`;

    // Subir imagen a Supabase Storage
    const { data, error } = await supabase.storage
      .from('productos')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Error subiendo a Supabase Storage:', error);
      return res.status(500).json({ error: 'Error al subir imagen: ' + error.message });
    }

    // Obtener URL pública
    const { data: publicUrlData } = supabase.storage
      .from('productos')
      .getPublicUrl(fileName);

    res.json({ imagen_url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Error procesando imagen:', error);
    res.status(500).json({ error: 'Error al procesar imagen' });
  }
});

// ============================================
// ADMIN - CREAR PRODUCTO
// ============================================
app.post('/api/admin/productos', auth.verifyAdmin, async (req, res) => {
  const { nombre, descripcion, precio, stock, categoria, talla, color, imagen_url } = req.body;

  try {
    const { data, error } = await supabase
      .from('productos')
      .insert({
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
        talla,
        color,
        imagen_url: imagen_url || null,
        activo: true
      })
      .select();

    if (error) {
      console.error('Error creando producto:', error);
      return res.status(500).json({ error: 'Error al crear producto: ' + error.message });
    }

    res.status(201).json({ 
      id: data[0].id,
      mensaje: 'Producto creado exitosamente',
      producto: data[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// ============================================
// ADMIN - EDITAR PRODUCTO
// ============================================
app.put('/api/admin/productos/:id', auth.verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, categoria, talla, color, imagen_url } = req.body;

  try {
    const { data, error } = await supabase
      .from('productos')
      .update({
        nombre,
        descripcion,
        precio: parseFloat(precio),
        stock: parseInt(stock),
        categoria,
        talla,
        color,
        imagen_url: imagen_url || null
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error actualizando producto:', error);
      return res.status(500).json({ error: 'Error al actualizar producto: ' + error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ 
      mensaje: 'Producto actualizado exitosamente',
      producto: data[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// ============================================
// ADMIN - ELIMINAR PRODUCTO (marcar inactivo)
// ============================================
app.delete('/api/admin/productos/:id', auth.verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabase
      .from('productos')
      .update({ activo: false })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error eliminando producto:', error);
      return res.status(500).json({ error: 'Error al eliminar producto: ' + error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ 
      mensaje: 'Producto eliminado exitosamente',
      producto: data[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ============================================
// PEDIDOS - CREAR PEDIDO CON TRANSACCIÓN
// ============================================
app.post('/api/pedidos', async (req, res) => {
  const { userId, cliente, items, total, metodoPago, numeroOperacion, comprobanteUrl } = req.body;

  const finalUserId = userId || 1;

  if (!cliente || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ mensaje: 'Datos de pedido inválidos' });
  }

  const codigoSeguimiento = 'PED-' + Date.now().toString().slice(-8) + Math.random().toString(36).substr(2, 4).toUpperCase();

  try {
    // 1. Crear pedido
    const { data: pedidoData, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        usuario_id: finalUserId,
        codigo_seguimiento: codigoSeguimiento,
        total: parseFloat(total),
        direccion_envio: cliente.direccion,
        metodo_compra: userId ? 'con_cuenta' : 'invitado'
      })
      .select();

    if (pedidoError) throw pedidoError;
    const pedidoId = pedidoData[0].id;

    // 2. Crear pago
    const { error: pagoError } = await supabase
      .from('pagos')
      .insert({
        pedido_id: pedidoId,
        monto: parseFloat(total),
        metodo_pago: metodoPago,
        numero_operacion: numeroOperacion,
        comprobante_url: comprobanteUrl,
        estado: 'pendiente'
      });

    if (pagoError) throw pagoError;

    // 3. Procesar items
    for (const item of items) {
      const productoId = item.producto_id || item.id || item.productoId;
      const cantidad = parseInt(item.cantidad);
      const precio = parseFloat(item.precio || item.precio_unitario || 0);
      const subtotal = parseFloat((precio * cantidad).toFixed(2));

      // Verificar y actualizar stock
      const { data: producto, error: productoError } = await supabase
        .from('productos')
        .select('stock')
        .eq('id', productoId)
        .single();

      if (productoError || !producto || producto.stock < cantidad) {
        throw new Error(`Stock insuficiente para producto ${productoId}`);
      }

      // Actualizar stock
      const { error: stockError } = await supabase
        .from('productos')
        .update({ stock: producto.stock - cantidad })
        .eq('id', productoId);

      if (stockError) throw stockError;

      // Insertar detalle
      const { error: detalleError } = await supabase
        .from('detalle_pedidos')
        .insert({
          pedido_id: pedidoId,
          producto_id: productoId,
          cantidad: cantidad,
          precio_unitario: precio,
          subtotal: subtotal
        });

      if (detalleError) throw detalleError;
    }

    res.status(201).json({ 
      pedidoId, 
      codigoSeguimiento,
      mensaje: 'Pedido creado correctamente' 
    });

  } catch (error) {
    console.error('Error en pedido:', error);
    res.status(500).json({ mensaje: 'Error al procesar pedido: ' + error.message });
  }
});

// ============================================
// SUBIR COMPROBANTE A SUPABASE STORAGE
// ============================================
app.post('/api/upload-comprobante', upload.single('comprobante'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo' });
  }

  try {
    const fileName = `${Date.now()}-${req.file.originalname}`;

    const { data, error } = await supabase.storage
      .from('comprobantes')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from('comprobantes')
      .getPublicUrl(fileName);

    res.json({ url: publicUrlData.publicUrl });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al subir comprobante: ' + error.message });
  }
});

// ============================================
// ADMIN - GESTIÓN DE PEDIDOS
// ============================================

// Obtener todos los pedidos
app.get('/api/admin/pedidos', auth.verifyAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('fecha_pedido', { ascending: false });

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error('Error obteniendo pedidos:', error);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Actualizar estado de pedido
app.put('/api/admin/pedidos/:id/estado', auth.verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  try {
    const { data, error } = await supabase
      .from('pedidos')
      .update({ estado })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ 
      mensaje: 'Estado actualizado',
      pedido: data[0]
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// Obtener detalle de un pedido específico
app.get('/api/admin/pedidos/:id', auth.verifyAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: pedido, error: pedidoError } = await supabase
      .from('pedidos')
      .select('*')
      .eq('id', id)
      .single();

    if (pedidoError) throw pedidoError;

    const { data: detalles, error: detallesError } = await supabase
      .from('detalle_pedidos')
      .select('*, productos(*)')
      .eq('pedido_id', id);

    if (detallesError) throw detallesError;

    res.json({
      ...pedido,
      detalles
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Error al obtener detalle del pedido' });
  }
});
// ============================================
// INICIAR SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log(`
 
    http://localhost:${PORT}              
 
  `);
});