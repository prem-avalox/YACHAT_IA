# YACHAT_IA — Agente de Ventas Autónomo para PYME (Consumer Electronics)

> Guia actualizada para el equipo: ver `GUIA_WINDOWS_WEBHOOK_N8N.md`.
> Esa guia explica la instalacion completa en Windows, el webhook de n8n, la pagina web, Redis, Ollama, ChromaDB y las pruebas end-to-end.

Este repositorio contiene la arquitectura de software e infraestructura para **YACHAT_IA**, un agente inteligente diseñado para operar de forma local (*On-Premise*) en entornos de PYMEs comerciales de electrónica de consumo en Ecuador. El sistema combina comprensión semántica avanzada y control transaccional estricto mediante una arquitectura híbrida de datos.

---

## 🛠️ Prerrequisitos para Windows

Antes de iniciar la configuración, asegúrate de tener instaladas las siguientes herramientas en tu sistema operativo:

1. **Git:** [Descargar aquí](https://git-scm.com/download/win) (Asegúrate de agregarlo al PATH durante la instalación).
2. **Python 3.10 o superior:** [Descargar aquí](https://www.python.org/downloads/) (Es **CRÍTICO** marcar la casilla *"Add Python.exe to PATH"* en el instalador).
3. **Docker Desktop:** [Descargar aquí](https://www.docker.com/products/docker-desktop/) (Necesario para levantar la base de datos idéntica de PostgreSQL sin configurar instaladores locales).
4. **Ollama:** [Descargar aquí](https://ollama.com/) (Motor para la ejecución local de modelos e inyección de embeddings).

---

## 🚀 Guía de Instalación y Configuración Paso a Paso (Windows)

Abre tu terminal favorita (se recomienda **PowerShell** o la terminal integrada de **VS Code**) y ejecuta los siguientes comandos:

### Paso 1: Clonar el repositorio y entrar al directorio
```bash
git clone [https://github.com/prem-avalox/YACHAT_IA.git](https://github.com/prem-avalox/YACHAT_IA.git)
cd YACHAT_IA
```
### Paso 2: Crear y activar el entorno virtual de Python
Para mantener las dependencias aisladas de tu sistema operativo:
####  Crear el entorno virtual llamado 'env'
```bash
python -m venv env
```
#### Activar el entorno (Ejecutar según tu terminal)
#### Si usas PowerShell:
```bash
.\env\Scripts\Activate.ps1
```
#### Si usas CMD (Símbolo del sistema):
```bash
.\env\Scripts\activate.bat
```

Sabrás que se activó correctamente porque aparecerá un indicador (env) al inicio de la línea de comandos en tu terminal.
### Paso 3: VITAL Instalar las dependencias del proyecto
```Bash
pip install -r requirements.txt
```
### Paso 4: Configurar las Variables de Entorno (.env)
Para estandarizar las credenciales de conexión sin alterar el código fuente:
En la raíz del proyecto, crea un archivo de texto llamado exactamente .env (puedes duplicar el archivo .env.example si existe).
Pega las credenciales unificadas del equipo:

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
```
### 🐳 Inicialización de la Infraestructura Híbrida
Para que el agente pueda responder, necesitamos encender el motor de base de datos relacional y el motor matemático local.
1. Levantar PostgreSQL con Docker
Asegúrate de tener la aplicación Docker Desktop abierta y ejecutándose en segundo plano.
En tu terminal (dentro de la carpeta del proyecto), levanta el contenedor con el siguiente comando:
```Bash
docker-compose up -d
```
Este comando descargará de forma automática una imagen oficial de PostgreSQL 14, configurará las credenciales del archivo .env y creará la base de datos inventario_pyme en el puerto 5432 de tu máquina en segundos.
2. Descargar el Modelo de Embeddings en Ollama
Asegúrate de tener la aplicación de Ollama ejecutándose de fondo en tu barra de tareas.
En tu terminal, descarga el modelo especializado en traducción semántica local:
```Bash
ollama pull nomic-embed-text
```
### 📊 Ingesta de Datos Iniciales
Con los servicios corriendo de fondo, debes ejecutar los scripts encargados de poblar las bases de datos con nuestro catálogo inicial de tecnología (Consumer Electronics):
```Bash
# 1. Poblar el Motor Determinista (PostgreSQL)
python database/motor_postgres.py

# 2. Poblar el Motor Semántico (ChromaDB)
python database/motor_vectorial.py
```
Si todo ha salido bien, verás mensajes de éxito en tu consola y se habrá generado localmente una carpeta llamada chroma_data/. El entorno híbrido local está 100% operativo en tu computadora.
## 📂 Estructura Modular del Proyecto
Para trabajar de manera organizada en el equipo, respetemos la separación de capas:
* 📂 agent/ 🧠 Capa Cognitiva: Contiene el orquestador basado en LangGraph (máquinas de estado), prompts base y esquemas de salida en formato JSON.
* 📂 database/ 💾 Capa de Almacenamiento: Aloja el catálogo plano de prueba (mock_data.json) y las conexiones de carga hacia PostgreSQL y ChromaDB.
* 📂 tools/ 🔧 Capa de Ejecución (Tool Calling): Aquí se programan las funciones de Python que el LLM usará de forma autónoma (ej. buscar en la base de datos).
* 📄 main.py 🏁 Punto de Entrada: Archivo principal para inicializar y probar las interacciones con el agente de ventas.
### 🛑 Comandos Útiles de Mantenimiento
* Apagar la base de datos Docker (para liberar memoria): docker-compose down
* Verificar contenedores activos: docker ps
* Desactivar el entorno virtual de Python: deactivate

### Para probar el correcto funcionamiento

Si hay problemas probablemente olvidaste instalar el paso 3, por favor instala el archivo **requirements.txt**, en el paso 3 se especifíca.

Para probar de forma "simbólica":
```bash
python test_motores.py
```

te debe salir algo como:

``` bash
Iniciando pruebas de infraestructura YACHAT_IA...

🔍 Probando PostgreSQL...
✅ SQL OK. Se encontraron productos: [('NVIDIA GeForce RTX 4070 Ti', Decimal('850.00')), ('Procesador Intel Core i9-14900K', Decimal('599.00'))]

🧠 Probando ChromaDB y Embeddings locales...
✅ Semántica OK. Para 'quiero una gráfica potente para jugar a 4k', la IA encontró:
   -> NVIDIA GeForce RTX 4070 Ti. Tarjeta gráfica de alto rendimiento, ideal para gaming en 4K, modelado 3D y edición de video profesional. Especificación: Requiere fuente mínima de 750W

```
