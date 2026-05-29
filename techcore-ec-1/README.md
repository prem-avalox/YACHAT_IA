# TechCore EC

Pagina web de demostracion para YA!CHAT IA.

Esta carpeta contiene:

- Frontend de la tienda.
- Widget de chat embebible.
- Backend Express.
- Proxy hacia n8n.
- Memoria de sesiones con Redis.
- Conexion a PostgreSQL para productos y carrito.

La guia completa de instalacion esta en:

```text
../GUIA_WINDOWS_WEBHOOK_N8N.md
```

## Configuracion rapida

Desde esta carpeta:

```bash
npm install
cp .env.example .env
npm start
```

En Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm start
```

La pagina queda en:

```text
http://localhost:3000
```

## Variables principales

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventario_pyme
DB_USER=postgres
DB_PASSWORD=postgres

AGENT_ENABLED=true
AGENT_URL=http://localhost:5678/webhook/yachat

REDIS_URL=redis://localhost:6379
AI_SESSION_TTL_SECONDS=86400
AI_SESSION_MAX_HISTORY=12
```

## Endpoints importantes

```text
GET  /api/agent/status
POST /api/agent/chat
GET  /api/agent/session/:sessionId
DELETE /api/agent/session/:sessionId
```

El widget llama a:

```text
POST http://localhost:3000/api/agent/chat
```

El backend llama a n8n:

```text
POST http://localhost:5678/webhook/yachat
```

## Formato que recibe el backend

```json
{
  "sessionId": "demo-001",
  "message": "quiero una pc gamer de 1500"
}
```

## Formato que devuelve al widget

```json
{
  "reply": "Texto breve para el usuario",
  "recommendations": [
    {
      "label": "Alto rendimiento",
      "total": 1489.93,
      "products": [
        {
          "id_producto": 1,
          "categoria": "Procesador",
          "nombre": "AMD Ryzen 5 7600",
          "marca": "AMD",
          "precio": 199.99
        }
      ]
    }
  ],
  "sessionId": "demo-001",
  "memory": {
    "provider": "redis",
    "saved": true
  }
}
```
