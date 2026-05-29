const express = require('express');
const router = express.Router();
const pool = require('../db');

// Obtener o crear carrito por sesión
async function getOrCreateCart(sessionId) {
  let result = await pool.query(
    `SELECT id_carrito FROM carritos WHERE identificador_sesion = $1 AND estado = 'abierto' LIMIT 1`,
    [sessionId]
  );
  if (result.rows.length > 0) return result.rows[0].id_carrito;

  const created = await pool.query(
    `INSERT INTO carritos (identificador_sesion) VALUES ($1) RETURNING id_carrito`,
    [sessionId]
  );
  return created.rows[0].id_carrito;
}

// GET /api/cart/:sessionId - Ver carrito de la sesión
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const cartResult = await pool.query(
      `SELECT id_carrito FROM carritos WHERE identificador_sesion = $1 AND estado = 'abierto' LIMIT 1`,
      [sessionId]
    );
    if (cartResult.rows.length === 0) return res.json({ items: [], total: 0 });

    const cartId = cartResult.rows[0].id_carrito;
    const items = await pool.query(
      `SELECT
        ci.id_item,
        ci.id_producto,
        p.nombre,
        m.nombre AS marca,
        p.modelo,
        ci.cantidad,
        ci.precio_unitario,
        (ci.cantidad * ci.precio_unitario) AS subtotal,
        p.stock
       FROM carrito_items ci
       JOIN productos p ON p.id_producto = ci.id_producto
       JOIN marcas m ON m.id_marca = p.id_marca
       WHERE ci.id_carrito = $1
       ORDER BY ci.fecha_agregado ASC`,
      [cartId]
    );

    const total = items.rows.reduce((sum, i) => sum + parseFloat(i.subtotal), 0);
    res.json({ id_carrito: cartId, items: items.rows, total: total.toFixed(2) });
  } catch (err) {
    console.error('[GET /cart]', err);
    res.status(500).json({ error: 'Error al obtener carrito' });
  }
});

// POST /api/cart/:sessionId/add - Agregar producto al carrito
router.post('/:sessionId/add', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { id_producto, cantidad = 1 } = req.body;

    if (!id_producto) return res.status(400).json({ error: 'id_producto requerido' });

    const prodResult = await pool.query(
      `SELECT precio, stock, estado FROM productos WHERE id_producto = $1`,
      [id_producto]
    );
    if (prodResult.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });

    const prod = prodResult.rows[0];
    if (prod.estado !== 'disponible') return res.status(400).json({ error: 'Producto no disponible' });
    if (prod.stock < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });

    const cartId = await getOrCreateCart(sessionId);

    // Si ya existe en el carrito, actualizar cantidad
    const existing = await pool.query(
      `SELECT id_item, cantidad FROM carrito_items WHERE id_carrito = $1 AND id_producto = $2`,
      [cartId, id_producto]
    );

    if (existing.rows.length > 0) {
      const newQty = existing.rows[0].cantidad + parseInt(cantidad);
      if (newQty > prod.stock) return res.status(400).json({ error: 'Stock insuficiente para esa cantidad' });
      await pool.query(
        `UPDATE carrito_items SET cantidad = $1 WHERE id_item = $2`,
        [newQty, existing.rows[0].id_item]
      );
    } else {
      await pool.query(
        `INSERT INTO carrito_items (id_carrito, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
        [cartId, id_producto, cantidad, prod.precio]
      );
    }

    res.json({ ok: true, message: 'Producto agregado al carrito' });
  } catch (err) {
    console.error('[POST /cart/add]', err);
    res.status(500).json({ error: 'Error al agregar al carrito' });
  }
});

// POST /api/cart/:sessionId/add-many - Agregar múltiples productos (usado por el agente)
router.post('/:sessionId/add-many', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { productos } = req.body; // [{ id_producto, cantidad }]

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ error: 'Lista de productos requerida' });
    }

    const cartId = await getOrCreateCart(sessionId);
    const added = [];
    const errors = [];

    for (const item of productos) {
      const { id_producto, cantidad = 1 } = item;
      const prodResult = await pool.query(
        `SELECT precio, stock, estado, nombre FROM productos WHERE id_producto = $1`,
        [id_producto]
      );
      if (prodResult.rows.length === 0) {
        errors.push({ id_producto, error: 'No encontrado' });
        continue;
      }
      const prod = prodResult.rows[0];
      if (prod.estado !== 'disponible' || prod.stock < cantidad) {
        errors.push({ id_producto, error: 'Sin stock o no disponible' });
        continue;
      }

      const existing = await pool.query(
        `SELECT id_item, cantidad FROM carrito_items WHERE id_carrito = $1 AND id_producto = $2`,
        [cartId, id_producto]
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE carrito_items SET cantidad = $1 WHERE id_item = $2`,
          [existing.rows[0].cantidad + cantidad, existing.rows[0].id_item]
        );
      } else {
        await pool.query(
          `INSERT INTO carrito_items (id_carrito, id_producto, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
          [cartId, id_producto, cantidad, prod.precio]
        );
      }
      added.push({ id_producto, nombre: prod.nombre });
    }

    res.json({ ok: true, added, errors });
  } catch (err) {
    console.error('[POST /cart/add-many]', err);
    res.status(500).json({ error: 'Error al agregar productos' });
  }
});

// DELETE /api/cart/:sessionId/item/:itemId - Eliminar item del carrito
router.delete('/:sessionId/item/:itemId', async (req, res) => {
  try {
    const { sessionId, itemId } = req.params;
    const cartResult = await pool.query(
      `SELECT id_carrito FROM carritos WHERE identificador_sesion = $1 AND estado = 'abierto' LIMIT 1`,
      [sessionId]
    );
    if (cartResult.rows.length === 0) return res.status(404).json({ error: 'Carrito no encontrado' });

    await pool.query(
      `DELETE FROM carrito_items WHERE id_item = $1 AND id_carrito = $2`,
      [itemId, cartResult.rows[0].id_carrito]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /cart/item]', err);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

// DELETE /api/cart/:sessionId/clear - Vaciar carrito
router.delete('/:sessionId/clear', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const cartResult = await pool.query(
      `SELECT id_carrito FROM carritos WHERE identificador_sesion = $1 AND estado = 'abierto' LIMIT 1`,
      [sessionId]
    );
    if (cartResult.rows.length === 0) return res.json({ ok: true });
    await pool.query(`DELETE FROM carrito_items WHERE id_carrito = $1`, [cartResult.rows[0].id_carrito]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /cart/clear]', err);
    res.status(500).json({ error: 'Error al vaciar carrito' });
  }
});

module.exports = router;
