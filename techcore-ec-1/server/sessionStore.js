const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const SESSION_TTL_SECONDS = parseInt(process.env.AI_SESSION_TTL_SECONDS || '86400', 10);
const MAX_HISTORY_MESSAGES = parseInt(process.env.AI_SESSION_MAX_HISTORY || '12', 10);

const memoryFallback = new Map();

let redisClient = null;
let redisReady = false;
let connectPromise = null;

function normalizeSessionId(sessionId) {
  const value = String(sessionId || '').trim();
  if (!value) return `session_${Date.now()}`;
  return value.replace(/[^a-zA-Z0-9:_-]/g, '_').slice(0, 120);
}

function sessionKey(sessionId) {
  return `yachat:session:${normalizeSessionId(sessionId)}`;
}

function emptySession(sessionId) {
  const normalized = normalizeSessionId(sessionId);
  return {
    sessionId: normalized,
    history: [],
    lastRecommendations: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function connectRedis() {
  if (redisReady) return true;
  if (connectPromise) return connectPromise;

  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => {
    redisReady = false;
    console.warn('[SESSION] Redis no disponible:', err.message);
  });
  redisClient.on('ready', () => {
    redisReady = true;
  });

  connectPromise = redisClient.connect()
    .then(() => {
      redisReady = true;
      return true;
    })
    .catch((err) => {
      redisReady = false;
      console.warn('[SESSION] Usando memoria local porque Redis falló:', err.message);
      return false;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
}

function trimHistory(history) {
  return (Array.isArray(history) ? history : [])
    .filter((item) => item && item.role && typeof item.content === 'string')
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content.slice(0, 2000),
      at: item.at || new Date().toISOString(),
    }))
    .slice(-MAX_HISTORY_MESSAGES);
}

function sanitizeRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) return [];
  return recommendations.slice(0, 3).map((rec) => ({
    label: rec.label || rec.etiqueta || 'Opción',
    total: Number(rec.total || rec.total_price || 0),
    products: Array.isArray(rec.products)
      ? rec.products.map((p) => ({
          id_producto: p.id_producto,
          categoria: p.categoria,
          nombre: p.nombre,
          marca: p.marca,
          precio: Number(p.precio || 0),
        }))
      : [],
  }));
}

async function getSession(sessionId) {
  const normalized = normalizeSessionId(sessionId);
  const key = sessionKey(normalized);

  if (await connectRedis()) {
    const raw = await redisClient.get(key);
    if (!raw) return emptySession(normalized);

    try {
      const parsed = JSON.parse(raw);
      return {
        ...emptySession(normalized),
        ...parsed,
        sessionId: normalized,
        history: trimHistory(parsed.history),
      };
    } catch (err) {
      console.warn('[SESSION] Sesión inválida en Redis:', err.message);
      return emptySession(normalized);
    }
  }

  return memoryFallback.get(key) || emptySession(normalized);
}

async function saveSession(session) {
  const normalized = normalizeSessionId(session.sessionId);
  const data = {
    ...emptySession(normalized),
    ...session,
    sessionId: normalized,
    history: trimHistory(session.history),
    lastRecommendations: sanitizeRecommendations(session.lastRecommendations),
    updatedAt: new Date().toISOString(),
  };
  const key = sessionKey(normalized);

  if (await connectRedis()) {
    await redisClient.set(key, JSON.stringify(data), { EX: SESSION_TTL_SECONDS });
  } else {
    memoryFallback.set(key, data);
  }

  return data;
}

async function appendTurn(sessionId, userMessage, assistantMessage, recommendations) {
  const session = await getSession(sessionId);
  const now = new Date().toISOString();
  const nextHistory = [
    ...session.history,
    { role: 'user', content: String(userMessage || '').slice(0, 2000), at: now },
    { role: 'assistant', content: String(assistantMessage || '').slice(0, 2000), at: now },
  ];

  return saveSession({
    ...session,
    history: nextHistory,
    lastRecommendations: sanitizeRecommendations(recommendations),
  });
}

async function deleteSession(sessionId) {
  const key = sessionKey(sessionId);
  if (await connectRedis()) {
    await redisClient.del(key);
  }
  memoryFallback.delete(key);
}

function getSessionBackendStatus() {
  return {
    provider: redisReady ? 'redis' : 'memory',
    redisUrl: REDIS_URL,
    ttlSeconds: SESSION_TTL_SECONDS,
    maxHistoryMessages: MAX_HISTORY_MESSAGES,
  };
}

module.exports = {
  appendTurn,
  deleteSession,
  ensureSessionStore: connectRedis,
  getSession,
  getSessionBackendStatus,
  normalizeSessionId,
  trimHistory,
};
