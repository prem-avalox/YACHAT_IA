/**
 * =====================================================
 * TechCore AI Agent Widget v1.0
 * =====================================================
 * Este script es el "producto" que se le vende a la PYME.
 * Se instala con una sola línea en cualquier página web:
 *
 *   <script src="[url]/widget/agent-widget.js"
 *     data-store-api="https://mi-tienda.com"
 *     data-agent-api="https://mi-tienda.com/api/agent">
 *   </script>
 *
 * El widget se encarga de:
 *   1. Inyectar el botón flotante y el chat en la página
 *   2. Enviar mensajes al agente IA (cuando esté configurado)
 *   3. Renderizar recomendaciones de productos
 *   4. Agregar productos al carrito directamente
 * =====================================================
 */

(function () {
  'use strict';

  // ---- Leer configuración del script tag ----
  const scriptTag = document.currentScript || (function () {
    const scripts = document.querySelectorAll('script[data-store-api]');
    return scripts[scripts.length - 1];
  })();

  const STORE_API = (scriptTag && scriptTag.getAttribute('data-store-api')) || 'http://localhost:3000';
  const AGENT_API = (scriptTag && scriptTag.getAttribute('data-agent-api')) || 'http://localhost:3000/api/agent';

  // ---- Estilos del widget ----
  const WIDGET_STYLES = `
    #tc-agent-btn {
      position: fixed;
      bottom: 28px;
      right: 28px;
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #00e5ff, #00b8d4);
      border: none;
      border-radius: 50%;
      cursor: pointer;
      z-index: 9998;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 26px;
      box-shadow: 0 4px 24px rgba(0, 229, 255, 0.35), 0 2px 8px rgba(0,0,0,0.4);
      transition: transform 0.2s, box-shadow 0.2s;
      animation: tc-pulse 3s ease-in-out infinite;
    }
    #tc-agent-btn:hover {
      transform: scale(1.08);
      box-shadow: 0 6px 32px rgba(0, 229, 255, 0.5), 0 2px 8px rgba(0,0,0,0.4);
    }
    #tc-agent-btn.open { animation: none; background: linear-gradient(135deg, #ff6d00, #e65100); }

    @keyframes tc-pulse {
      0%, 100% { box-shadow: 0 4px 24px rgba(0, 229, 255, 0.35), 0 2px 8px rgba(0,0,0,0.4); }
      50% { box-shadow: 0 4px 32px rgba(0, 229, 255, 0.6), 0 2px 8px rgba(0,0,0,0.4); }
    }

    #tc-agent-tooltip {
      position: fixed;
      bottom: 98px;
      right: 28px;
      background: #16161d;
      border: 1px solid rgba(0, 229, 255, 0.25);
      color: #e8eaf6;
      font-family: 'IBM Plex Mono', monospace, sans-serif;
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      white-space: nowrap;
      z-index: 9998;
      pointer-events: none;
      opacity: 1;
      transition: opacity 0.3s;
    }
    #tc-agent-tooltip::after {
      content: '';
      position: absolute;
      bottom: -6px;
      right: 22px;
      width: 12px;
      height: 6px;
      background: #16161d;
      clip-path: polygon(0 0, 100% 0, 50% 100%);
      border-left: 1px solid rgba(0, 229, 255, 0.25);
      border-right: 1px solid rgba(0, 229, 255, 0.25);
    }

    #tc-agent-panel {
      position: fixed;
      bottom: 100px;
      right: 28px;
      width: 380px;
      max-width: calc(100vw - 40px);
      height: 560px;
      max-height: calc(100vh - 140px);
      background: #0a0a0c;
      border: 1px solid #1e1e28;
      border-radius: 16px;
      z-index: 9997;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,229,255,0.08);
      transform: translateY(20px) scale(0.96);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s;
    }
    #tc-agent-panel.open {
      transform: translateY(0) scale(1);
      opacity: 1;
      pointer-events: all;
    }

    #tc-panel-header {
      background: linear-gradient(135deg, #111116, #16161d);
      border-bottom: 1px solid #1e1e28;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    #tc-panel-header .tc-avatar {
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #00e5ff22, #00e5ff11);
      border: 1px solid rgba(0, 229, 255, 0.3);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    #tc-panel-header .tc-title { flex: 1; }
    #tc-panel-header .tc-title strong {
      display: block;
      font-family: 'Rajdhani', 'IBM Plex Mono', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: #e8eaf6;
    }
    #tc-panel-header .tc-title span {
      font-size: 11px;
      color: #00e5ff;
      font-family: 'IBM Plex Mono', monospace;
    }

    #tc-panel-header .tc-status-dot {
      width: 7px;
      height: 7px;
      background: #00e676;
      border-radius: 50%;
      animation: tc-blink 2s ease-in-out infinite;
    }
    #tc-panel-header .tc-status-dot.offline { background: #ff1744; animation: none; }

    @keyframes tc-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    #tc-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      scrollbar-width: thin;
      scrollbar-color: #1e1e28 transparent;
    }
    #tc-messages::-webkit-scrollbar { width: 4px; }
    #tc-messages::-webkit-scrollbar-thumb { background: #1e1e28; border-radius: 2px; }

    .tc-msg {
      display: flex;
      gap: 8px;
      animation: tc-fadein 0.25s ease;
    }
    @keyframes tc-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

    .tc-msg.user { flex-direction: row-reverse; }

    .tc-msg-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .tc-msg.agent .tc-msg-avatar { background: rgba(0, 229, 255, 0.1); border: 1px solid rgba(0, 229, 255, 0.2); }
    .tc-msg.user .tc-msg-avatar { background: rgba(255, 109, 0, 0.15); border: 1px solid rgba(255, 109, 0, 0.2); }

    .tc-msg-bubble {
      max-width: 82%;
      padding: 10px 13px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.55;
    }
    .tc-msg.agent .tc-msg-bubble {
      background: #16161d;
      border: 1px solid #1e1e28;
      color: #c8cdd8;
      border-radius: 4px 12px 12px 12px;
    }
    .tc-msg.user .tc-msg-bubble {
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.2);
      color: #e8eaf6;
      border-radius: 12px 4px 12px 12px;
    }

    .tc-msg-bubble strong { color: #00e5ff; }

    /* Recomendaciones del agente */
    .tc-recommendations {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
    }

    .tc-rec-card {
      background: #0a0a0c;
      border: 1px solid #1e1e28;
      border-radius: 8px;
      padding: 10px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .tc-rec-icon { font-size: 20px; flex-shrink: 0; }

    .tc-rec-info { flex: 1; min-width: 0; }
    .tc-rec-name {
      font-size: 12px;
      font-weight: 600;
      color: #e8eaf6;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .tc-rec-meta { font-size: 10px; color: #8892a4; margin-top: 1px; }
    .tc-rec-price { font-size: 14px; font-weight: 700; color: #e8eaf6; white-space: nowrap; }

    .tc-rec-add {
      background: rgba(0, 229, 255, 0.1);
      border: 1px solid rgba(0, 229, 255, 0.25);
      color: #00e5ff;
      font-size: 11px;
      font-weight: 600;
      padding: 5px 10px;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.15s;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .tc-rec-add:hover { background: rgba(0, 229, 255, 0.2); }

    .tc-add-all-btn {
      background: #00e5ff;
      color: #0a0a0c;
      border: none;
      border-radius: 6px;
      padding: 9px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      width: 100%;
      margin-top: 6px;
      transition: background 0.15s;
    }
    .tc-add-all-btn:hover { background: #00b8d4; }

    .tc-build-card {
      background: #0a0a0c;
      border: 1px solid #1e1e28;
      border-radius: 8px;
      padding: 12px;
    }

    .tc-build-header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: baseline;
      margin-bottom: 8px;
    }

    .tc-build-title {
      color: #e8eaf6;
      font-size: 13px;
      font-weight: 700;
    }

    .tc-build-total {
      color: #00e5ff;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .tc-build-list {
      display: flex;
      flex-direction: column;
      gap: 5px;
      margin: 0 0 10px;
      padding: 0;
      list-style: none;
    }

    .tc-build-item {
      color: #8892a4;
      display: flex;
      justify-content: space-between;
      gap: 8px;
      font-size: 11px;
      line-height: 1.35;
    }

    .tc-build-item span:first-child {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* Typing indicator */
    .tc-typing {
      display: flex;
      gap: 4px;
      align-items: center;
      padding: 12px 14px;
    }
    .tc-typing span {
      width: 7px;
      height: 7px;
      background: #4a5568;
      border-radius: 50%;
      animation: tc-bounce 1.2s ease-in-out infinite;
    }
    .tc-typing span:nth-child(2) { animation-delay: 0.2s; }
    .tc-typing span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes tc-bounce {
      0%, 80%, 100% { transform: translateY(0); }
      40% { transform: translateY(-6px); }
    }

    #tc-input-area {
      border-top: 1px solid #1e1e28;
      padding: 12px;
      display: flex;
      gap: 8px;
      background: #111116;
    }

    #tc-input {
      flex: 1;
      background: #0a0a0c;
      border: 1px solid #1e1e28;
      border-radius: 8px;
      color: #e8eaf6;
      font-size: 13px;
      padding: 9px 12px;
      outline: none;
      font-family: inherit;
      resize: none;
      line-height: 1.4;
      max-height: 80px;
    }
    #tc-input:focus { border-color: rgba(0, 229, 255, 0.4); }
    #tc-input::placeholder { color: #4a5568; }

    #tc-send-btn {
      background: #00e5ff;
      border: none;
      border-radius: 8px;
      color: #0a0a0c;
      font-size: 18px;
      width: 38px;
      cursor: pointer;
      flex-shrink: 0;
      transition: background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #tc-send-btn:hover { background: #00b8d4; }
    #tc-send-btn:disabled { background: #1e1e28; color: #4a5568; cursor: not-allowed; }

    #tc-panel-footer {
      padding: 8px 14px;
      border-top: 1px solid #1e1e28;
      text-align: center;
      font-size: 10px;
      color: #2d3748;
      font-family: 'IBM Plex Mono', monospace;
      letter-spacing: 0.5px;
    }

    .tc-quick-btns {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }

    .tc-quick-btn {
      background: #16161d;
      border: 1px solid #1e1e28;
      color: #8892a4;
      font-size: 11px;
      padding: 5px 10px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
    }
    .tc-quick-btn:hover { border-color: rgba(0, 229, 255, 0.3); color: #00e5ff; background: rgba(0, 229, 255, 0.05); }

    .tc-agent-offline-banner {
      background: rgba(255, 109, 0, 0.08);
      border: 1px solid rgba(255, 109, 0, 0.2);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 11px;
      color: #ff9800;
      line-height: 1.5;
      margin-bottom: 4px;
    }
  `;

  // ---- Inyectar estilos ----
  const styleEl = document.createElement('style');
  styleEl.textContent = WIDGET_STYLES;
  document.head.appendChild(styleEl);

  // ---- Estado del widget ----
  let isOpen = false;
  let isAgentOnline = false;
  let conversationHistory = [];
  let tooltipHidden = false;

  // ---- Crear elementos del DOM ----
  const tooltip = document.createElement('div');
  tooltip.id = 'tc-agent-tooltip';
  tooltip.textContent = '🤖 ¿En qué te ayudo hoy?';

  const btn = document.createElement('button');
  btn.id = 'tc-agent-btn';
  btn.title = 'Asistente IA TechCore';
  btn.textContent = '🤖';

  const panel = document.createElement('div');
  panel.id = 'tc-agent-panel';
  panel.innerHTML = `
    <div id="tc-panel-header">
      <div class="tc-avatar">🤖</div>
      <div class="tc-title">
        <strong>Asistente TechCore</strong>
        <span id="tc-status-text">Cargando…</span>
      </div>
      <div class="tc-status-dot offline" id="tc-status-dot"></div>
    </div>
    <div id="tc-messages"></div>
    <div id="tc-input-area">
      <textarea id="tc-input" placeholder="Escribe tu consulta… (ej: quiero armar una PC gaming con $900)" rows="1"></textarea>
      <button id="tc-send-btn" title="Enviar">➤</button>
    </div>
    <div id="tc-panel-footer">powered by TechCore AI Agent</div>
  `;

  document.body.appendChild(tooltip);
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  // ---- Verificar estado del agente ----
  async function checkAgentStatus() {
    try {
      const res = await fetch(`${STORE_API}/api/agent/status`);
      const data = await res.json();
      isAgentOnline = data.enabled;

      const dot = document.getElementById('tc-status-dot');
      const statusText = document.getElementById('tc-status-text');

      if (isAgentOnline) {
        dot.classList.remove('offline');
        statusText.textContent = 'En línea · listo para ayudarte';
      } else {
        dot.classList.add('offline');
        statusText.textContent = 'Modo demo · agente no configurado';
      }
    } catch {
      isAgentOnline = false;
    }
  }

  // ---- Mostrar mensaje inicial ----
  function showWelcome() {
    const msgs = document.getElementById('tc-messages');
    msgs.innerHTML = '';

    if (!isAgentOnline) {
      const banner = document.createElement('div');
      banner.className = 'tc-agent-offline-banner';
      banner.innerHTML = `⚠️ <strong>Agente IA no conectado.</strong><br>
        Para activarlo, configura <code>AGENT_ENABLED=true</code> y <code>AGENT_URL</code> en tu archivo <code>.env</code>.
        <br>El widget está listo para conectarse cuando el equipo despliegue el agente.`;
      msgs.appendChild(banner);
    }

    addAgentMessage(
      `¡Hola! Soy el asistente de <strong>TechCore EC</strong> 👋<br><br>
      Puedo ayudarte a <strong>armar tu PC</strong>, encontrar componentes compatibles y ajustarnos a tu presupuesto.<br><br>
      ¿Qué necesitas hoy?`,
      [
        { text: '🎮 PC Gaming ~$800', value: 'Quiero armar una PC gaming con un presupuesto de $800' },
        { text: '🎨 PC para edición', value: 'Necesito una PC para edición de video y diseño' },
        { text: '💼 PC de oficina', value: 'Busco una PC económica para trabajo de oficina' },
        { text: '🔍 Ver todo el catálogo', value: 'Muéstrame todos los productos disponibles' },
      ]
    );
  }

  // ---- Agregar mensaje del agente ----
  function addAgentMessage(html, quickReplies = []) {
    const msgs = document.getElementById('tc-messages');
    const msgEl = document.createElement('div');
    msgEl.className = 'tc-msg agent';

    let quickHTML = '';
    if (quickReplies.length) {
      quickHTML = `<div class="tc-quick-btns">
        ${quickReplies.map(q => `<button class="tc-quick-btn" onclick="window._tcSendQuick('${escapeAttr(q.value)}')">${q.text}</button>`).join('')}
      </div>`;
    }

    msgEl.innerHTML = `
      <div class="tc-msg-avatar">🤖</div>
      <div class="tc-msg-bubble">${html}${quickHTML}</div>
    `;
    msgs.appendChild(msgEl);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function escapeAttr(str) {
    return str.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
  }

  // ---- Agregar mensaje del usuario ----
  function addUserMessage(text) {
    const msgs = document.getElementById('tc-messages');
    const msgEl = document.createElement('div');
    msgEl.className = 'tc-msg user';
    msgEl.innerHTML = `
      <div class="tc-msg-avatar">👤</div>
      <div class="tc-msg-bubble">${text}</div>
    `;
    msgs.appendChild(msgEl);
    msgs.scrollTop = msgs.scrollHeight;
  }

  // ---- Typing indicator ----
  function showTyping() {
    const msgs = document.getElementById('tc-messages');
    const el = document.createElement('div');
    el.className = 'tc-msg agent';
    el.id = 'tc-typing-indicator';
    el.innerHTML = `
      <div class="tc-msg-avatar">🤖</div>
      <div class="tc-msg-bubble tc-typing"><span></span><span></span><span></span></div>
    `;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function removeTyping() {
    const el = document.getElementById('tc-typing-indicator');
    if (el) el.remove();
  }

  // ---- Renderizar recomendaciones de productos ----
  function renderRecommendations(products, totalLabel) {
    const ICONS = {
      'Procesador': '🔲', 'Placa madre': '🔌', 'Memoria RAM': '🧮',
      'Tarjeta grafica': '🎮', 'Fuente de poder': '⚡', 'Almacenamiento': '💾',
      'Gabinete': '🖥', 'Monitor': '🖥️', 'Periferico': '🖱',
    };

    const allIds = products.map(p => p.id_producto);

    const html = `
      <div class="tc-recommendations">
        ${products.map(p => `
          <div class="tc-rec-card">
            <span class="tc-rec-icon">${ICONS[p.categoria] || '📦'}</span>
            <div class="tc-rec-info">
              <div class="tc-rec-name">${p.nombre}</div>
              <div class="tc-rec-meta">${p.marca} · ${p.categoria}</div>
            </div>
            <span class="tc-rec-price">$${parseFloat(p.precio).toFixed(2)}</span>
            <button class="tc-rec-add" onclick="window._tcAddProduct(${p.id_producto}, '${escapeAttr(p.nombre)}')">+ Carrito</button>
          </div>
        `).join('')}
        ${products.length > 1 ? `
          <button class="tc-add-all-btn" onclick="window._tcAddAll(${JSON.stringify(allIds)})">
            🛒 Agregar todo al carrito ${totalLabel ? '· ' + totalLabel : ''}
          </button>
        ` : ''}
      </div>
    `;
    return html;
  }

  function renderBuildRecommendations(recommendations) {
    const html = `
      <div class="tc-recommendations">
        ${recommendations.map((rec, index) => {
          const products = Array.isArray(rec.products) ? rec.products : [];
          const ids = products.map(p => p.id_producto).filter(Boolean);
          const label = rec.label || rec.option || `Opción ${index + 1}`;
          const total = Number(rec.total || rec.total_price || 0);
          return `
            <div class="tc-build-card">
              <div class="tc-build-header">
                <span class="tc-build-title">${label}</span>
                <span class="tc-build-total">$${total.toFixed(2)}</span>
              </div>
              <ul class="tc-build-list">
                ${products.map(p => `
                  <li class="tc-build-item">
                    <span>${p.categoria || 'Producto'} · ${p.nombre}</span>
                    <span>$${Number(p.precio || 0).toFixed(2)}</span>
                  </li>
                `).join('')}
              </ul>
              ${ids.length ? `
                <button class="tc-add-all-btn" onclick="window._tcAddAll(${JSON.stringify(ids)})">
                  🛒 Elegir esta opción
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
    return html;
  }

  // ---- Enviar mensaje al agente ----
  async function sendMessage(text) {
    if (!text.trim()) return;

    const input = document.getElementById('tc-input');
    const sendBtn = document.getElementById('tc-send-btn');
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    addUserMessage(text);
    conversationHistory.push({ role: 'user', content: text });
    showTyping();

    if (!isAgentOnline) {
      // Modo demo sin agente
      await sleep(900);
      removeTyping();
      handleDemoMode(text);
      sendBtn.disabled = false;
      return;
    }

    try {
      const res = await fetch(`${AGENT_API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          session_id: getSessionId(),
          history: conversationHistory.slice(-8), // últimos 8 mensajes
          store_api: STORE_API,
        }),
      });

      removeTyping();

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // El webhook de n8n responde: { reply: string, recommendations: [...] }.
      // Se conserva compatibilidad con el formato demo anterior: { message, products }.
      let responseText = data.reply || data.message || data.response || 'No pude procesar tu solicitud.';
      conversationHistory.push({ role: 'assistant', content: responseText });

      if (Array.isArray(data.recommendations) && data.recommendations.length > 0) {
        responseText += renderBuildRecommendations(data.recommendations);
      } else if (data.products && data.products.length > 0) {
        const total = data.total ? `Total: $${parseFloat(data.total).toFixed(2)}` : '';
        responseText += renderRecommendations(data.products, total);
      }

      addAgentMessage(responseText);
    } catch (err) {
      removeTyping();
      addAgentMessage(`⚠️ Error al comunicarme con el agente: <em>${err.message}</em>. Verifica la conexión.`);
      console.error('[TechCore Widget]', err);
    }

    sendBtn.disabled = false;
  }

  // ---- Modo demo (sin agente real) ----
  async function handleDemoMode(text) {
    const lower = text.toLowerCase();
    let response = '';
    let products = [];

    try {
      // Buscar productos reales en la API de la tienda
      if (lower.includes('gaming') || lower.includes('juego') || lower.includes('jugar')) {
        const res = await fetch(`${STORE_API}/api/products?limit=100`);
        const data = await res.json();
        products = data.productos.filter(p =>
          ['Tarjeta grafica', 'Procesador', 'Memoria RAM'].includes(p.categoria)
        ).slice(0, 4);
        response = `¡Perfecto para gaming! 🎮 Aquí te muestro los componentes clave. <strong>Nota:</strong> cuando el agente IA esté activo, te armaré una build completa y compatible según tu presupuesto exacto.`;
      } else if (lower.includes('edici') || lower.includes('diseño') || lower.includes('render')) {
        const res = await fetch(`${STORE_API}/api/products?limit=100`);
        const data = await res.json();
        products = data.productos.filter(p =>
          ['Tarjeta grafica', 'Procesador', 'Memoria RAM', 'Almacenamiento'].includes(p.categoria)
        ).slice(0, 4);
        response = `Para edición y diseño necesitas RAM abundante, buena GPU y almacenamiento rápido 🎨. Estos son los componentes más relevantes:`;
      } else if (lower.includes('catálogo') || lower.includes('catalogo') || lower.includes('todo') || lower.includes('productos')) {
        const res = await fetch(`${STORE_API}/api/products?limit=100`);
        const data = await res.json();
        products = data.productos.slice(0, 5);
        response = `Aquí te muestro una selección de nuestro catálogo. Tenemos <strong>${data.total} productos</strong> disponibles. Puedes explorar el catálogo completo arriba ⬆️`;
      } else if (lower.includes('precio') || lower.includes('barato') || lower.includes('económic')) {
        const res = await fetch(`${STORE_API}/api/products?sort=price-asc&limit=5`);
        const data = await res.json();
        products = data.productos.slice(0, 4);
        response = `Estos son algunos de nuestros componentes más accesibles 💰:`;
      } else {
        response = `Entiendo que buscas: <em>"${text}"</em><br><br>
          🔧 <strong>Modo demo activo</strong> — El agente IA completo aún no está conectado.<br>
          Cuando esté listo, podré:<br>
          • Armar builds completas y compatibles<br>
          • Ajustarme a tu presupuesto exacto<br>
          • Verificar compatibilidades automáticamente<br>
          • Agregar todo al carrito de un click<br><br>
          Por ahora puedes explorar el catálogo manualmente 👆`;
      }
    } catch {
      response = `⚠️ No pude conectar con el catálogo de la tienda. Verifica que el servidor esté corriendo.`;
    }

    if (products.length > 0) {
      response += renderRecommendations(products, '');
    }

    addAgentMessage(response);
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function getSessionId() {
    let sid = localStorage.getItem('techcore_session');
    if (!sid) {
      sid = 'tc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
      localStorage.setItem('techcore_session', sid);
    }
    return sid;
  }

  // ---- Funciones globales para botones dentro del chat ----
  window._tcSendQuick = function (text) {
    sendMessage(text);
  };

  window._tcAddProduct = async function (id_producto, nombre) {
    if (window.TechCoreStore && window.TechCoreStore.addToCart) {
      await window.TechCoreStore.addToCart(id_producto, nombre);
    } else {
      try {
        const sid = getSessionId();
        const res = await fetch(`${STORE_API}/api/cart/${sid}/add`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id_producto, cantidad: 1 }),
        });
        const data = await res.json();
        if (data.ok) {
          showWidgetToast(`✓ ${nombre} agregado`);
          if (window.TechCoreStore) window.TechCoreStore.loadCart();
        }
      } catch (err) {
        console.error('[Widget] Error agregando al carrito:', err);
      }
    }
  };

  window._tcAddAll = async function (ids) {
    const sid = getSessionId();
    const productos = ids.map(id => ({ id_producto: id, cantidad: 1 }));
    try {
      const res = await fetch(`${STORE_API}/api/cart/${sid}/add-many`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productos }),
      });
      const data = await res.json();
      if (data.ok) {
        showWidgetToast(`✅ ${data.added.length} producto(s) agregado(s) al carrito`);
        if (window.TechCoreStore) window.TechCoreStore.loadCart();
        addAgentMessage(`✅ Agregué <strong>${data.added.length} productos</strong> a tu carrito. ¡Puedes verlo arriba a la derecha! 🛒`);
      }
    } catch (err) {
      console.error('[Widget] Error en add-many:', err);
    }
  };

  // ---- Toast del widget ----
  function showWidgetToast(msg) {
    if (window.TechCoreStore && window.TechCoreStore.showToast) {
      window.TechCoreStore.showToast(msg);
    }
  }

  // ---- Toggle ----
  function openWidget() {
    isOpen = true;
    btn.classList.add('open');
    btn.textContent = '✕';
    panel.classList.add('open');
    tooltip.style.opacity = '0';
    document.getElementById('tc-input').focus();
  }

  function closeWidget() {
    isOpen = false;
    btn.classList.remove('open');
    btn.textContent = '🤖';
    panel.classList.remove('open');
  }

  btn.addEventListener('click', () => {
    if (isOpen) closeWidget();
    else openWidget();
  });

  // ---- Input ----
  const inputEl = document.getElementById('tc-input');
  const sendBtnEl = document.getElementById('tc-send-btn');

  inputEl.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 80) + 'px';
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputEl.value.trim());
    }
  });

  sendBtnEl.addEventListener('click', () => sendMessage(inputEl.value.trim()));

  // ---- Inicialización ----
  async function init() {
    await checkAgentStatus();
    showWelcome();

    // Ocultar tooltip después de 5 segundos
    setTimeout(() => {
      tooltip.style.opacity = '0';
      setTimeout(() => tooltip.remove(), 300);
    }, 5000);
  }

  // Esperar a que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ---- API pública del widget ----
  window.TechCoreAgent = {
    open: openWidget,
    close: closeWidget,
    sendMessage,
    isOpen: () => isOpen,
    isAgentOnline: () => isAgentOnline,
  };

  console.log(
    '%c🤖 TechCore AI Widget cargado',
    'color:#00e5ff;font-family:monospace;font-weight:bold',
    `\nStore API: ${STORE_API}`,
    `\nAgent API: ${AGENT_API}`,
    `\nAgente IA: verificando…`
  );

})();
