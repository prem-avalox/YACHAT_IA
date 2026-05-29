# Guia Windows: instalar YA!CHAT IA y conectar n8n con la pagina web

Esta guia es para que cualquier integrante del equipo pueda clonar el repositorio, levantar todos los servicios y probar el webhook de n8n conectado con la pagina web.

## 1. Que hace el proyecto

YA!CHAT IA es un chat widget para una tienda de componentes de PC.

El usuario escribe algo como:

```text
quiero una pc para jugar league of legends
```

La pagina manda ese mensaje al backend. El backend consulta memoria de sesion en Redis, obtiene contexto semantico con ChromaDB/LangChain/Ollama, manda todo al webhook de n8n, n8n consulta PostgreSQL y devuelve un JSON limpio para construir tarjetas de recomendaciones.

Flujo completo:

```text
Pagina web / widget
  -> Backend Express: http://localhost:3000/api/agent/chat
  -> Redis: memoria por sessionId
  -> Python semantic_query.py
  -> LangChain + ChromaDB + Ollama embeddings
  -> n8n webhook: http://localhost:5678/webhook/yachat
  -> PostgreSQL: productos reales y especificaciones
  -> n8n arma recomendaciones compatibles
  -> Backend guarda respuesta en Redis
  -> Widget renderiza tarjetas
```

Responsabilidades:

- PostgreSQL: fuente real de productos, precios, stock y compatibilidad.
- ChromaDB: indice vectorial para interpretar consultas por significado.
- Ollama: genera embeddings locales con `nomic-embed-text`.
- LangChain: conecta Python con ChromaDB y Ollama.
- n8n: flujo visual del agente; recibe webhook, consulta SQL y arma JSON final.
- Redis: memoria de conversaciones por `sessionId`.
- Web/backend Express: une pagina, memoria, capa semantica y n8n.

Redis no evita alucinaciones por si solo. Las alucinaciones se reducen porque las recomendaciones salen de PostgreSQL y reglas de compatibilidad. Redis solo recuerda contexto.

## 2. Requisitos en Windows

Instalar:

1. Git: https://git-scm.com/download/win
2. Node.js LTS 18 o superior: https://nodejs.org/
3. Python 3.10 o superior: https://www.python.org/downloads/
4. Docker Desktop: https://www.docker.com/products/docker-desktop/
5. Ollama: https://ollama.com/download

Durante la instalacion de Python, marcar:

```text
Add python.exe to PATH
```

Despues de instalar Docker Desktop, abrirlo y esperar a que diga que esta corriendo.

## 3. Clonar el repositorio

Abrir PowerShell:

```powershell
cd $HOME\Desktop
git clone https://github.com/prem-avalox/YACHAT_IA.git
cd YACHAT_IA
```

## 4. Crear archivos .env

Crear `.env` en la raiz:

```powershell
Copy-Item .env.example .env
```

El contenido esperado es:

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventario_pyme
```

Crear `.env` para la pagina:

```powershell
Copy-Item techcore-ec-1\.env.example techcore-ec-1\.env
```

Contenido esperado:

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

Si cambian usuario/password de PostgreSQL, deben cambiarlo en ambos `.env` y en las credenciales PostgreSQL de n8n.

## 5. Instalar dependencias Python

Desde la raiz del repo:

```powershell
python -m venv env
.\env\Scripts\Activate.ps1
pip install -r requirements.txt
```

Si PowerShell bloquea la activacion del entorno virtual:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\env\Scripts\Activate.ps1
```

## 6. Instalar dependencias de la pagina

```powershell
cd techcore-ec-1
npm install
cd ..
```

## 7. Levantar PostgreSQL y Redis con Docker

El proyecto ya trae `docker-compose.yml` para PostgreSQL.

Levantar PostgreSQL:

```powershell
docker compose up -d
```

Verificar:

```powershell
docker ps
```

Debe aparecer un contenedor llamado:

```text
yachat_postgres
```

Levantar Redis:

```powershell
docker run -d --name yachat_redis -p 6379:6379 redis:8
```

Si el contenedor ya existe:

```powershell
docker start yachat_redis
```

Verificar Redis:

```powershell
docker exec yachat_redis redis-cli ping
```

Debe responder:

```text
PONG
```

## 8. Importar la base de datos PostgreSQL

Entrar al contenedor PostgreSQL e importar el SQL del repo:

```powershell
docker exec -i yachat_postgres psql -U postgres -d inventario_pyme < database/sql/v1_tienda_tecnologia_postgresql.sql
```

Verificar que existe la vista del agente:

```powershell
docker exec -it yachat_postgres psql -U postgres -d inventario_pyme -c "select count(*) from vista_catalogo_agente;"
```

Debe devolver un conteo mayor que cero.

## 9. Levantar Ollama y modelos

Abrir la app de Ollama en Windows.

Luego en PowerShell:

```powershell
ollama pull nomic-embed-text
ollama pull llama3.1
ollama list
```

Modelo obligatorio:

```text
nomic-embed-text
```

Prueba de Ollama:

```powershell
curl http://localhost:11434/api/tags
```

Debe devolver JSON con modelos.

## 10. Crear indice ChromaDB

Con PostgreSQL y Ollama corriendo:

```powershell
.\env\Scripts\Activate.ps1
python database\motor_vectorial.py
```

Esto crea la carpeta:

```text
chroma_data
```

Prueba semantica:

```powershell
python database\semantic_query.py "quiero una pc para jugar league of legends"
```

Debe devolver JSON con:

```json
{
  "enabled": true,
  "tipo_uso": "gaming_ligero",
  "pc_completa": true
}
```

Si dice `Failed to connect to Ollama`, abrir Ollama o revisar `http://localhost:11434/api/tags`.

## 11. Levantar n8n

No es necesario instalar n8n globalmente. Se puede usar con `npx`.

En una terminal nueva:

```powershell
cd $HOME\Desktop\YACHAT_IA
npx n8n start
```

Abrir:

```text
http://localhost:5678
```

Si pide crear cuenta local, crearla. Es solo para la instancia local.

## 12. Importar workflow de n8n

En n8n:

1. Ir a `Workflows`.
2. Importar desde archivo.
3. Seleccionar:

```text
exports/yachat-n8n-workflow-redis-sessions.json
```

4. Guardar workflow.
5. Configurar credenciales de PostgreSQL.
6. Activar workflow.

### Credenciales PostgreSQL en n8n

En el nodo PostgreSQL o desde Credentials:

```text
Host: localhost
Port: 5432
Database: inventario_pyme
User: postgres
Password: postgres
SSL: Disable
```

Si n8n corre dentro de Docker, `localhost` no apunta a la maquina host. En esta guia usamos `npx n8n start`, por eso `localhost` funciona.

### URL del webhook

El webhook que usa la pagina es:

```text
http://localhost:5678/webhook/yachat
```

Importante:

- `/webhook-test/...` sirve solo cuando se prueba manualmente desde el editor de n8n.
- `/webhook/...` sirve cuando el workflow esta activo.
- La pagina usa `/webhook/yachat`, por eso el workflow debe estar activo.

## 13. Levantar la pagina web

En otra terminal:

```powershell
cd $HOME\Desktop\YACHAT_IA\techcore-ec-1
npm start
```

Abrir:

```text
http://localhost:3000
```

Estado del agente:

```powershell
curl http://localhost:3000/api/agent/status
```

Respuesta esperada:

```json
{
  "enabled": true,
  "url": "http://localhost:5678/webhook/yachat",
  "memory": {
    "provider": "redis"
  }
}
```

Si `provider` sale como `memory`, Redis no esta corriendo.

## 14. Probar conexion pagina -> backend -> n8n

Desde PowerShell:

```powershell
curl -Method POST http://localhost:3000/api/agent/chat `
  -Headers @{ "Content-Type" = "application/json" } `
  -Body '{"sessionId":"demo-001","message":"quiero una pc para jugar league of legends"}'
```

Respuesta esperada:

```json
{
  "reply": "Encontré 3 configuraciones compatibles...",
  "recommendations": [
    {
      "label": "Recomendada para e-sports",
      "total": 569.94,
      "products": [
        {
          "id_producto": 28,
          "categoria": "Procesador",
          "nombre": "AMD Ryzen 5 4500"
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

Ver memoria guardada:

```powershell
curl http://localhost:3000/api/agent/session/demo-001
```

Debe mostrar:

- `history`
- `lastRecommendations`
- `memory.provider = redis`

Borrar una sesion:

```powershell
curl -Method DELETE http://localhost:3000/api/agent/session/demo-001
```

## 15. Probar desde la pagina

Abrir:

```text
http://localhost:3000
```

Abrir el widget de chat y escribir:

```text
quiero una pc gamer de 1500
```

Debe mostrar:

- respuesta breve,
- 3 tarjetas de recomendacion,
- productos por tarjeta,
- boton para elegir opcion.

## 16. Suite automatica de pruebas

Con todo corriendo:

- PostgreSQL
- Redis
- Ollama
- n8n activo
- pagina web

Ejecutar desde la raiz:

```powershell
node scripts\agent-regression-tests.mjs
```

Resultado esperado:

```text
All regression cases passed.
```

Casos que prueba:

- PC para League of Legends.
- PC gamer de 1500.
- Workstation para DaVinci Resolve y ProRes 422.
- Workstation para Ableton Live, mixing/mastering y Ozone.
- GPU para DaVinci.

## 17. Orden recomendado para levantar todo

Terminal 1:

```powershell
cd $HOME\Desktop\YACHAT_IA
docker compose up -d
docker start yachat_redis
```

Terminal 2:

```powershell
ollama list
```

Si no responde, abrir la app de Ollama.

Terminal 3:

```powershell
cd $HOME\Desktop\YACHAT_IA
npx n8n start
```

Terminal 4:

```powershell
cd $HOME\Desktop\YACHAT_IA\techcore-ec-1
npm start
```

Terminal 5 para pruebas:

```powershell
cd $HOME\Desktop\YACHAT_IA
node scripts\agent-regression-tests.mjs
```

## 18. Como explicar el webhook

La pagina no llama directo a n8n desde el navegador. La pagina llama al backend:

```text
POST http://localhost:3000/api/agent/chat
```

El backend hace tres cosas antes de llamar a n8n:

1. Recupera memoria de sesion desde Redis usando `sessionId`.
2. Ejecuta `database/semantic_query.py` para obtener contexto semantico.
3. Envia a n8n:

```json
{
  "sessionId": "demo-001",
  "message": "quiero una pc gamer de 1500",
  "history": [],
  "memory": {
    "lastRecommendations": []
  },
  "semantic": {
    "enabled": true,
    "tipo_uso": "gaming",
    "categories": []
  }
}
```

n8n recibe eso por:

```text
POST http://localhost:5678/webhook/yachat
```

n8n consulta PostgreSQL, arma recomendaciones y responde:

```json
{
  "reply": "Texto breve para el usuario",
  "recommendations": [
    {
      "label": "Alto rendimiento",
      "total": 1489.93,
      "products": []
    }
  ]
}
```

El backend guarda esa respuesta en Redis y la pagina renderiza las tarjetas.

## 19. Archivos importantes

```text
techcore-ec-1/server/index.js
```

Backend Express. Expone `/api/agent/chat`, llama Python semantico, llama n8n y guarda memoria.

```text
techcore-ec-1/server/sessionStore.js
```

Memoria de sesiones con Redis. Si Redis no esta disponible, usa memoria local temporal.

```text
techcore-ec-1/public/widget/agent-widget.js
```

Widget de chat embebido en la pagina.

```text
database/semantic_query.py
```

Consulta semantica contra ChromaDB usando embeddings de Ollama.

```text
database/motor_vectorial.py
```

Crea el indice ChromaDB desde PostgreSQL.

```text
database/sql/v1_tienda_tecnologia_postgresql.sql
```

Schema, datos y vista `vista_catalogo_agente`.

```text
exports/yachat-n8n-workflow-redis-sessions.json
```

Workflow de n8n para importar.

```text
scripts/agent-regression-tests.mjs
```

Pruebas automatizadas end-to-end.

## 20. Errores comunes

### `Workflow Webhook Error`

El workflow no esta activo o se esta usando URL incorrecta.

Solucion:

- Activar workflow en n8n.
- Usar `http://localhost:5678/webhook/yachat`.
- No usar `/webhook-test/yachat` desde la pagina.

### `fetch failed` en el backend

Normalmente n8n no esta corriendo.

Revisar:

```powershell
curl http://localhost:5678
```

### `Failed to connect to Ollama`

Ollama no esta corriendo.

Revisar:

```powershell
curl http://localhost:11434/api/tags
```

### `memory.provider` sale `memory`

Redis no esta corriendo.

Revisar:

```powershell
docker exec yachat_redis redis-cli ping
```

### n8n no conecta con PostgreSQL

Revisar credenciales PostgreSQL del nodo:

```text
Host: localhost
Database: inventario_pyme
User: postgres
Password: postgres
SSL: Disable
```

### La capa semantica no encuentra ChromaDB

Falta correr:

```powershell
python database\motor_vectorial.py
```

### La pagina abre pero el agente no responde

Revisar en este orden:

1. `docker ps`
2. `curl http://localhost:11434/api/tags`
3. `curl http://localhost:3000/api/agent/status`
4. n8n abierto y workflow activo.
5. Credenciales PostgreSQL de n8n.
6. `node scripts\agent-regression-tests.mjs`

## 21. Checklist de la reunion

Antes de mostrar la demo:

- Docker Desktop abierto.
- PostgreSQL activo.
- Redis activo.
- Ollama abierto.
- `npx n8n start` corriendo.
- Workflow importado y activo.
- Credenciales PostgreSQL en n8n configuradas.
- `npm start` corriendo en `techcore-ec-1`.
- `curl http://localhost:3000/api/agent/status` muestra `enabled: true` y `provider: redis`.
- `node scripts\agent-regression-tests.mjs` pasa.

Demo sugerida:

1. Abrir `http://localhost:3000`.
2. Abrir widget.
3. Preguntar: `quiero una pc para jugar league of legends`.
4. Mostrar tarjetas.
5. Preguntar: `quiero una computadora para color grading en davinci resolve con pro res 422`.
6. Mostrar respuesta tipo workstation.
7. Mostrar en Redis/session endpoint que se guardo la conversacion:

```powershell
curl http://localhost:3000/api/agent/session/demo-001
```
