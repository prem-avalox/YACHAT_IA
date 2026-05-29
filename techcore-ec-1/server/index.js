const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { execFile } = require('child_process');
const { randomUUID } = require('crypto');
const {
  appendTurn,
  deleteSession,
  ensureSessionStore,
  getSession,
  getSessionBackendStatus,
  normalizeSessionId,
  trimHistory,
} = require('./sessionStore');

const app = express();
const PORT = process.env.PORT || 3000;
const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const DEFAULT_PYTHON_BIN = process.platform === 'win32'
  ? path.join(WORKSPACE_ROOT, 'env', 'Scripts', 'python.exe')
  : path.join(WORKSPACE_ROOT, 'env', 'bin', 'python');
const PYTHON_BIN = process.env.PYTHON_BIN || DEFAULT_PYTHON_BIN;
const SEMANTIC_SCRIPT = path.join(WORKSPACE_ROOT, 'database/semantic_query.py');

function getSemanticContext(message) {
  return new Promise((resolve) => {
    if (!message || !message.trim()) {
      resolve(null);
      return;
    }

    execFile(
      PYTHON_BIN,
      [SEMANTIC_SCRIPT, message],
      {
        cwd: WORKSPACE_ROOT,
        timeout: 12000,
        env: {
          ...process.env,
          DB_NAME: process.env.DB_NAME || 'inventario_pyme',
        },
      },
      (error, stdout, stderr) => {
        if (error) {
          console.warn('[SEMANTIC]', error.message, stderr || '');
          resolve(null);
          return;
        }

        try {
          resolve(JSON.parse(stdout));
        } catch (parseError) {
          console.warn('[SEMANTIC] Respuesta inválida:', parseError.message);
          resolve(null);
        }
      }
    );
  });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Rutas API
app.use('/api/products', require('./routes/products'));
app.use('/api/cart', require('./routes/cart'));

// Endpoint de estado del agente
app.get('/api/agent/status', async (req, res) => {
  await ensureSessionStore();
  res.json({
    enabled: process.env.AGENT_ENABLED === 'true',
    url: process.env.AGENT_URL || null,
    memory: getSessionBackendStatus(),
    message: process.env.AGENT_ENABLED === 'true'
      ? 'Agente IA conectado'
      : 'Agente IA no configurado — configura AGENT_URL y AGENT_ENABLED=true en .env'
  });
});

// Consultar memoria de una sesión durante pruebas
app.get('/api/agent/session/:sessionId', async (req, res) => {
  try {
    const session = await getSession(req.params.sessionId);
    res.json({
      ...session,
      memory: getSessionBackendStatus(),
    });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo leer la sesión', detail: err.message });
  }
});

// Borrar memoria de una sesión durante pruebas
app.delete('/api/agent/session/:sessionId', async (req, res) => {
  try {
    await deleteSession(req.params.sessionId);
    res.json({ ok: true, sessionId: normalizeSessionId(req.params.sessionId) });
  } catch (err) {
    res.status(500).json({ error: 'No se pudo borrar la sesión', detail: err.message });
  }
});

// Proxy hacia el agente IA
app.post('/api/agent/chat', async (req, res) => {
  if (process.env.AGENT_ENABLED !== 'true') {
    return res.status(503).json({
      error: 'Agente no disponible',
      message: 'El agente IA aún no está configurado. Activa AGENT_ENABLED=true en .env y configura AGENT_URL.'
    });
  }

  try {
    const agentUrl = process.env.AGENT_URL;
    if (!agentUrl) {
      return res.status(503).json({
        error: 'Agente no disponible',
        message: 'Configura AGENT_URL en .env.'
      });
    }

    const message = req.body.message || req.body.chatInput || req.body.text || '';
    const sessionId = normalizeSessionId(
      req.body.sessionId || req.body.session_id || req.body.sessionID || randomUUID()
    );
    const session = await getSession(sessionId);
    const clientHistory = trimHistory(req.body.history);
    const persistedHistory = session.history.length > 0 ? session.history : clientHistory;
    const semantic = await getSemanticContext(String(message));
    const payload = {
      ...req.body,
      sessionId,
      session_id: sessionId,
      history: persistedHistory,
      memory: {
        lastRecommendations: session.lastRecommendations || [],
      },
      semantic,
    };

    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`El agente respondió con status ${response.status}`);
    const data = await response.json();
    await appendTurn(sessionId, message, data.reply || data.message || data.response || '', data.recommendations);
    res.json({
      ...data,
      sessionId,
      memory: {
        provider: getSessionBackendStatus().provider,
        saved: true,
      },
    });
  } catch (err) {
    console.error('[AGENT PROXY]', err.message);
    res.status(502).json({ error: 'Error al comunicarse con el agente', detail: err.message });
  }
});

// Fallback: servir index.html para cualquier ruta no-API
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Iniciar servidor
app.listen(PORT, async () => {
  console.log(`\n✅  TechCore EC corriendo en http://localhost:${PORT}`);
  console.log(`📦  API disponible en http://localhost:${PORT}/api`);

  try {
    const pool = require('./db');
    await pool.query('SELECT 1');
    console.log(`🗄️   PostgreSQL conectado correctamente`);
  } catch (err) {
    console.warn(`⚠️   No se pudo conectar a PostgreSQL: ${err.message}`);
    console.warn(`    Verifica tu .env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)`);
  }

  const agentEnabled = process.env.AGENT_ENABLED === 'true';
  console.log(`🤖  Agente IA: ${agentEnabled ? '✅ habilitado → ' + process.env.AGENT_URL : '❌ deshabilitado'}`);
  console.log('');
});
