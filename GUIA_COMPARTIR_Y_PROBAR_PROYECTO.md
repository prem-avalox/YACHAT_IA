# Guia para compartir y probar YA!CHAT IA

Esta guia explica como levantar el proyecto completo en otra computadora:

- Pagina web con widget de chat.
- Backend Express.
- PostgreSQL como base real de productos.
- ChromaDB + LangChain + Ollama para busqueda semantica.
- Redis para memoria de sesiones.
- n8n como flujo principal del agente.

## 1. Que archivos pasar al equipo

Pasa la carpeta completa `YACHAT_IA`, pero no es necesario incluir carpetas pesadas generadas localmente.

Desde la carpeta padre del proyecto puedes crear un zip asi:

```bash
cd /ruta/donde/esta/la/carpeta
zip -r YACHAT_IA_entrega.zip YACHAT_IA \
  -x "YACHAT_IA/env/*" \
  -x "YACHAT_IA/techcore-ec-1/node_modules/*" \
  -x "YACHAT_IA/chroma_data/*" \
  -x "YACHAT_IA/.git/*" \
  -x "YACHAT_IA/*.log" \
  -x "YACHAT_IA/**/.DS_Store"
```

El equipo debe regenerar `env`, `node_modules` y `chroma_data` en su propia maquina.

Archivo importante para n8n:

```text
exports/yachat-n8n-workflow-redis-sessions.json
```

Ese es el workflow actualizado con soporte para `history` y `memory`.

## 2. Requisitos

Cada integrante necesita instalar:

- Node.js 18 o superior.
- Python 3.10 o superior.
- PostgreSQL o Docker Desktop.
- Ollama.
- Redis.
- n8n.

En Mac con Homebrew:

```bash
brew install node python postgresql@14 redis ollama
```

Si usan Docker para PostgreSQL, no necesitan instalar PostgreSQL local.

## 3. Variables de entorno

En la raiz del proyecto crear `.env`:

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```

En `techcore-ec-1/.env` crear:

```bash
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

Si alguien usa otro usuario o password de PostgreSQL, debe cambiar `DB_USER` y `DB_PASSWORD` en ambos `.env`.

## 4. Instalar dependencias

Desde la raiz del proyecto:

```bash
cd YACHAT_IA
python -m venv env
source env/bin/activate
pip install -r requirements.txt
```

En Windows PowerShell:

```powershell
cd YACHAT_IA
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

Instalar dependencias de la web:

```bash
cd techcore-ec-1
npm install
cd ..
```

## 5. Levantar servicios base

### Opcion recomendada: PostgreSQL con Docker

Desde la raiz:

```bash
docker-compose up -d
```

Esto crea una base `inventario_pyme` con:

- usuario: `postgres`
- password: `postgres`
- puerto: `5432`

### Redis

En Mac:

```bash
brew services start redis
redis-cli ping
```

Debe responder:

```text
PONG
```

Si no tienen Homebrew, pueden usar Docker:

```bash
docker run -d --name yachat_redis -p 6379:6379 redis:8
```

### Ollama

Levantar Ollama y descargar modelos:

```bash
ollama pull nomic-embed-text
ollama pull llama3.1
ollama list
```

El modelo obligatorio para ChromaDB es `nomic-embed-text`. `llama3.1` se usa si n8n llama a Ollama como LLM.

## 6. Crear base de datos e indice semantico

Con PostgreSQL corriendo, importar el SQL:

```bash
psql -h localhost -U postgres -d inventario_pyme -f database/sql/v1_tienda_tecnologia_postgresql.sql
```

Si la base no existe:

```bash
createdb -h localhost -U postgres inventario_pyme
psql -h localhost -U postgres -d inventario_pyme -f database/sql/v1_tienda_tecnologia_postgresql.sql
```

Luego crear el indice de ChromaDB:

```bash
source env/bin/activate
python database/motor_vectorial.py
```

Esto genera la carpeta `chroma_data/`.

Prueba rapida de la capa semantica:

```bash
python database/semantic_query.py "quiero una pc para jugar league of legends"
```

Debe devolver JSON con:

```json
{
  "enabled": true,
  "tipo_uso": "gaming_ligero",
  "pc_completa": true
}
```

## 7. Importar workflow en n8n

Levantar n8n:

```bash
npx n8n start
```

Abrir:

```text
http://localhost:5678
```

Importar este archivo:

```text
exports/yachat-n8n-workflow-redis-sessions.json
```

Luego revisar el nodo PostgreSQL del workflow:

- Host: `localhost`
- Port: `5432`
- Database: `inventario_pyme`
- User: `postgres`
- Password: `postgres`
- SSL: `Disable`

Importante: activar el workflow en n8n. Si no esta activo, la URL `/webhook/yachat` no responde.

Webhook de produccion esperado:

```text
http://localhost:5678/webhook/yachat
```

## 8. Levantar la pagina web

En otra terminal:

```bash
cd YACHAT_IA/techcore-ec-1
npm start
```

Abrir:

```text
http://localhost:3000
```

Estado del agente:

```bash
curl http://localhost:3000/api/agent/status
```

Debe mostrar:

```json
{
  "enabled": true,
  "memory": {
    "provider": "redis"
  }
}
```

## 9. Pruebas manuales

Probar chat por API:

```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"demo-001","message":"quiero una pc para jugar league of legends"}'
```

Debe responder algo parecido a:

```json
{
  "reply": "Encontré 3 configuraciones compatibles...",
  "recommendations": [
    {
      "label": "Recomendada para e-sports",
      "total": 569.94,
      "products": []
    }
  ],
  "sessionId": "demo-001",
  "memory": {
    "provider": "redis",
    "saved": true
  }
}
```

Ver memoria guardada en Redis:

```bash
curl http://localhost:3000/api/agent/session/demo-001
```

Debe mostrar `history` y `lastRecommendations`.

Borrar una sesion:

```bash
curl -X DELETE http://localhost:3000/api/agent/session/demo-001
```

## 10. Suite de regresion

Desde la raiz:

```bash
node scripts/agent-regression-tests.mjs
```

Debe terminar con:

```text
All regression cases passed.
```

La suite prueba casos como:

- League of Legends.
- PC gamer de 1500.
- DaVinci Resolve con ProRes 422.
- Ableton Live con Ozone.
- GPU para DaVinci.

## 11. Orden recomendado para levantar todo

En resumen, abrir terminales separadas:

Terminal 1:

```bash
docker-compose up -d
brew services start redis
brew services start ollama
```

Terminal 2:

```bash
cd YACHAT_IA
npx n8n start
```

Terminal 3:

```bash
cd YACHAT_IA/techcore-ec-1
npm start
```

Terminal 4 para pruebas:

```bash
cd YACHAT_IA
node scripts/agent-regression-tests.mjs
```

## 12. Como explicar la arquitectura

Flujo general:

```text
Widget web
  -> Backend Express
  -> Redis: recupera memoria de sesion
  -> ChromaDB/LangChain/Ollama: interpreta semanticamente el mensaje
  -> n8n webhook
  -> PostgreSQL: consulta productos reales
  -> n8n: arma recomendaciones compatibles
  -> Backend Express
  -> Redis: guarda historial y recomendaciones
  -> Widget web: renderiza tarjetas
```

Responsabilidades:

- PostgreSQL: fuente real de productos, precios, stock y especificaciones.
- ChromaDB: busqueda semantica sobre el catalogo.
- Ollama: embeddings locales para ChromaDB y modelo local si se usa en n8n.
- LangChain: capa Python que conecta ChromaDB con Ollama.
- n8n: flujo visual que recibe el webhook, consulta SQL y arma el JSON final.
- Redis: memoria por `sessionId`; guarda historial y ultimas recomendaciones.
- Web/backend: integra todo y expone `/api/agent/chat` al widget.

Redis no evita alucinaciones por si solo. Lo que reduce alucinaciones es validar contra PostgreSQL y reglas de compatibilidad. Redis solo recuerda la conversacion.

## 13. Problemas comunes

### `Workflow Webhook Error`

Revisar que el workflow este activo en n8n y que la URL sea:

```text
http://localhost:5678/webhook/yachat
```

### `fetch failed` desde la web

Normalmente significa que n8n no esta corriendo en `localhost:5678`.

### `Failed to connect to Ollama`

Ollama no esta corriendo. Revisar:

```bash
ollama list
curl http://localhost:11434/api/tags
```

### `memory.provider` sale como `memory` y no `redis`

Redis no esta corriendo. Revisar:

```bash
redis-cli ping
```

### Postgres no conecta en n8n

Crear de nuevo las credenciales del nodo PostgreSQL en n8n. Las credenciales no siempre se importan con el workflow.

### La web responde, pero las recomendaciones son raras

Revisar en este orden:

1. PostgreSQL tiene la base importada.
2. Ollama esta corriendo.
3. `chroma_data/` fue generado con `python database/motor_vectorial.py`.
4. n8n esta usando el workflow actualizado.
5. El nodo PostgreSQL en n8n tiene credenciales correctas.
