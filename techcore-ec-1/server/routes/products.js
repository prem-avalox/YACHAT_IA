const express = require('express');
const router = express.Router();
const pool = require('../db');

// GET /api/products - Lista todos los productos disponibles con paginación y filtros
router.get('/', async (req, res) => {
  try {
    const { categoria, marca, min_precio, max_precio, buscar, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = ["p.estado = 'disponible'"];
    const params = [];
    let idx = 1;

    if (categoria) {
      params.push(categoria);
      conditions.push(`c.nombre ILIKE $${idx++}`);
    }
    if (marca) {
      params.push(`%${marca}%`);
      conditions.push(`m.nombre ILIKE $${idx++}`);
    }
    if (min_precio) {
      params.push(parseFloat(min_precio));
      conditions.push(`p.precio >= $${idx++}`);
    }
    if (max_precio) {
      params.push(parseFloat(max_precio));
      conditions.push(`p.precio <= $${idx++}`);
    }
    if (buscar) {
      params.push(`%${buscar}%`);
      conditions.push(`(p.nombre ILIKE $${idx++} OR p.descripcion ILIKE $${idx - 1} OR m.nombre ILIKE $${idx - 1})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countQuery = `
      SELECT COUNT(*) FROM productos p
      JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN marcas m ON m.id_marca = p.id_marca
      ${where}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);

    const query = `
      SELECT
        p.id_producto,
        c.nombre AS categoria,
        m.nombre AS marca,
        p.nombre,
        p.modelo,
        p.descripcion,
        p.precio,
        p.stock,
        p.garantia_meses,
        p.estado
      FROM productos p
      JOIN categorias c ON c.id_categoria = p.id_categoria
      JOIN marcas m ON m.id_marca = p.id_marca
      ${where}
      ORDER BY p.id_producto ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `;

    const result = await pool.query(query, params);

    res.json({
      productos: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    console.error('[GET /products]', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/categorias - Lista de categorías disponibles
router.get('/categorias', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.nombre, COUNT(p.id_producto) AS total
      FROM categorias c
      LEFT JOIN productos p ON p.id_categoria = c.id_categoria AND p.estado = 'disponible'
      GROUP BY c.nombre
      ORDER BY c.nombre
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /products/categorias]', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// GET /api/products/:id - Detalle de un producto con todas sus especificaciones
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM vista_catalogo_agente WHERE id_producto = $1`,
      [parseInt(id)]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[GET /products/:id]', err);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
});

// GET /api/products/catalogo/agente - Vista completa para el agente IA (con specs)
router.get('/catalogo/agente', async (req, res) => {
  try {
    const { categoria, max_precio } = req.query;
    let conditions = ["estado = 'disponible'"];
    const params = [];
    let idx = 1;

    if (categoria) {
      params.push(categoria);
      conditions.push(`categoria ILIKE $${idx++}`);
    }
    if (max_precio) {
      params.push(parseFloat(max_precio));
      conditions.push(`precio <= $${idx++}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await pool.query(`SELECT * FROM vista_catalogo_agente ${where} ORDER BY categoria, precio`, params);
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /products/catalogo/agente]', err);
    res.status(500).json({ error: 'Error al obtener catálogo del agente' });
  }
});

module.exports = router;
