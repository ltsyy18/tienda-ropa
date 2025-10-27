const jwt = require('jsonwebtoken');
const db = require('./db');

// NOTA: Usamos una constante simple para la clave secreta.
const JWT_SECRET = '000'; 

// Función de Login Unificada: POST /api/auth/login
const login = (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios.' });
    }

    // --- Lógica de Búsqueda de Rol ---
    
    // 1. Intentar buscar como ADMINISTRADOR
    const adminQuery = 'SELECT id, email, password FROM administradores WHERE email = ?';

    db.query(adminQuery, [email], (err, adminResults) => {
        if (err) {
            console.error('Error DB buscando admin:', err);
            return res.status(500).json({ mensaje: 'Error interno del servidor.' });
        }

        if (adminResults.length > 0) {
            const admin = adminResults[0];
            
            // Contraseña de texto plano (según confirmación del usuario)
            if (password === admin.password) {
                // Generar Token JWT con rol 'admin'
                const token = jwt.sign({ id: admin.id, email: admin.email, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
                return res.status(200).json({ token, rol: 'admin', mensaje: 'Bienvenido, Administrador.' });
            }
        }
        
        // 2. Si no es admin (o contraseña incorrecta), intentar buscar como USUARIO (cliente)
        const userQuery = 'SELECT id, email, password, nombre FROM usuarios WHERE email = ? AND tipo = "registrado"';
        // Solo permitimos el login a usuarios de tipo 'registrado' (los 'invitados' no tienen contraseña)

        db.query(userQuery, [email], (err, userResults) => {
            if (err) {
                console.error('Error DB buscando usuario:', err);
                return res.status(500).json({ mensaje: 'Error interno del servidor.' });
            }

            if (userResults.length > 0) {
                const user = userResults[0];

                // Contraseña de texto plano (según confirmación del usuario)
                if (password === user.password) {
                    // Generar Token JWT con rol 'cliente'
                    const token = jwt.sign({ id: user.id, email: user.email, role: 'cliente', nombre: user.nombre }, JWT_SECRET, { expiresIn: '1d' });
                    return res.status(200).json({ token, rol: 'cliente', nombre: user.nombre, mensaje: `Bienvenido, cliente ${user.nombre}.` });
                }
            }
            
            // 3. Si llega aquí, las credenciales son inválidas para ambos roles
            res.status(401).json({ mensaje: 'Credenciales inválidas o usuario no registrado.' });
        });
    });
};

// Función de Registro de Cliente: POST /api/auth/register
const register = (req, res) => {
    const { dni, nombre, apellido, email, password, telefono, direccion } = req.body;

    if (!nombre || !email || !password ) {
        return res.status(400).json({ mensaje: 'Los campos Nombre, Email y Contraseña son obligatorios.' });
    }

    // 1. Verificar si el email o DNI ya existen
    db.query('SELECT email, dni FROM usuarios WHERE email = ? OR dni = ?', [email, dni], (err, results) => {
        if (err) {
            console.error('Error al verificar existencia:', err);
            return res.status(500).json({ mensaje: 'Error interno del servidor.' });
        }
        if (results.length > 0) {
            const existsByEmail = results.some(row => row.email === email);
            const existsByDni = results.some(row => row.dni === dni);

            if (existsByEmail) return res.status(409).json({ mensaje: 'El email ya está registrado.' });
            if (existsByDni) return res.status(409).json({ mensaje: 'El DNI ya está registrado.' });
        }
        
        // 2. Insertar nuevo usuario como 'registrado'
        const query = `
            INSERT INTO usuarios (dni, nombre, apellido, email, password, telefono, direccion, tipo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'registrado')
        `;
        const values = [dni||null, nombre, apellido || null, email, password, telefono || null, direccion || null];

        db.query(query, values, (err, result) => {
            if (err) {
                console.error('Error al insertar usuario:', err);
                return res.status(500).json({ mensaje: 'Error al registrar el usuario.' });
            }
            
            // 3. Login automático después del registro (opcional)
            const token = jwt.sign({ id: result.insertId, email: email, role: 'cliente', nombre: nombre }, JWT_SECRET, { expiresIn: '1d' });
            
            res.status(201).json({ 
                token, 
                rol: 'cliente', 
                nombre: nombre, 
                mensaje: 'Registro exitoso. ¡Bienvenido!' 
            });
        });
    });
};

// --- Middleware BASE (Verifica Token y adjunta req.user) ---
const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ mensaje: 'Acceso denegado. Se requiere Token.' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ mensaje: 'Token inválido o expirado.' });
        }
        
        req.user = decoded; // Adjunta los datos completos del usuario (ID, email, rol)
        next(); 
    });
};

// --- Middleware de Autorización para Administradores ---
const verifyAdmin = (req, res, next) => {
    // 1. Usar el middleware verifyToken primero
    verifyToken(req, res, () => {
        // 2. Verificar si el token decodificado tiene el rol 'admin'
        if (req.user && req.user.role === 'admin') {
            next(); // Es admin, permitir acceso
        } else {
            res.status(403).json({ mensaje: 'Acceso prohibido. Solo para administradores.' });
        }
    });
};


module.exports = {
    login,
    register, // Exportamos la nueva función
    verifyToken,
    verifyAdmin 
};
