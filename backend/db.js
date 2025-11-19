// backend/db.js - Conexión con Supabase usando el SDK oficial
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Cliente de Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Test de conexión
(async () => {
  try {
    const { data, error } = await supabase.from('productos').select('count').limit(1);
    if (error && error.code !== 'PGRST116') throw error;
    console.log('✅ Conectado exitosamente a Supabase');
  } catch (err) {
    console.error('❌ Error conectando a Supabase:', err.message);
  }
})();

// Wrapper para mantener compatibilidad con sintaxis tipo MySQL
const db = {
  query: async (sql, params, callback) => {
    // Si no hay callback, params es el callback
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    try {
      // Parsear la query SQL para convertirla a operaciones de Supabase
      const sqlUpper = sql.toUpperCase().trim();

      // SELECT
      if (sqlUpper.startsWith('SELECT')) {
        const tableMatch = sql.match(/FROM\s+(\w+)/i);
        if (!tableMatch) throw new Error('No se pudo determinar la tabla');
        
        const table = tableMatch[1];
        let query = supabase.from(table).select('*');

        // WHERE con =
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        if (whereMatch && params.length > 0) {
          query = query.eq(whereMatch[1], params[0]);
        }

        // WHERE activo = TRUE
        if (sql.includes('activo = TRUE')) {
          query = query.eq('activo', true);
        }

        // ORDER BY
        if (sql.includes('ORDER BY')) {
          const orderMatch = sql.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
          if (orderMatch) {
            query = query.order(orderMatch[1], { ascending: !orderMatch[2] || orderMatch[2].toUpperCase() === 'ASC' });
          }
        }

        const { data, error } = await query;
        if (error) throw error;

        if (callback) callback(null, data || []);
        return data || [];
      }

      // INSERT
      else if (sqlUpper.startsWith('INSERT')) {
        const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
        if (!tableMatch) throw new Error('No se pudo determinar la tabla');
        
        const table = tableMatch[1];
        const columnsMatch = sql.match(/\((.*?)\)\s*VALUES/i);
        if (!columnsMatch) throw new Error('No se pudieron determinar las columnas');
        
        const columns = columnsMatch[1].split(',').map(c => c.trim());
        const insertData = {};
        columns.forEach((col, i) => {
          insertData[col] = params[i];
        });

        const { data, error } = await supabase.from(table).insert(insertData).select();
        if (error) throw error;

        if (callback) {
          callback(null, {
            insertId: data && data.length > 0 ? data[0].id : null,
            affectedRows: data ? data.length : 0,
            rows: data
          });
        }
        return data;
      }

      // UPDATE
      else if (sqlUpper.startsWith('UPDATE')) {
        const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
        if (!tableMatch) throw new Error('No se pudo determinar la tabla');
        
        const table = tableMatch[1];
        const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        
        if (!setMatch || !whereMatch) throw new Error('UPDATE incompleto');

        const updates = {};
        const setPairs = setMatch[1].split(',');
        setPairs.forEach((pair, i) => {
          const [col] = pair.trim().split('=');
          updates[col.trim()] = params[i];
        });

        const whereValue = params[params.length - 1];
        const { data, error } = await supabase
          .from(table)
          .update(updates)
          .eq(whereMatch[1], whereValue)
          .select();

        if (error) throw error;

        if (callback) {
          callback(null, {
            affectedRows: data ? data.length : 0,
            rows: data
          });
        }
        return data;
      }

      // DELETE (marcar como inactivo)
      else if (sqlUpper.startsWith('DELETE') || sql.includes('SET activo = FALSE')) {
        const tableMatch = sql.match(/(?:FROM|UPDATE)\s+(\w+)/i);
        const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
        
        if (!tableMatch || !whereMatch) throw new Error('DELETE incompleto');

        const { data, error } = await supabase
          .from(tableMatch[1])
          .update({ activo: false })
          .eq(whereMatch[1], params[0])
          .select();

        if (error) throw error;

        if (callback) {
          callback(null, {
            affectedRows: data ? data.length : 0
          });
        }
        return data;
      }

      // BEGIN / COMMIT / ROLLBACK (no necesarios con Supabase)
      else if (sqlUpper === 'BEGIN' || sqlUpper === 'COMMIT' || sqlUpper === 'ROLLBACK') {
        if (callback) callback(null, { message: 'Transaction command acknowledged' });
        return;
      }

      else {
        throw new Error('Tipo de query no soportado: ' + sqlUpper.substring(0, 20));
      }

    } catch (error) {
      console.error('Error en query:', error);
      if (callback) callback(error, null);
      throw error;
    }
  },

  // Acceso directo al cliente de Supabase para operaciones complejas
  supabase
};

module.exports = db;