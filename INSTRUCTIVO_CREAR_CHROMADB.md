# Instructivo para preparar el entorno y crear ChromaDB

Este instructivo explica, paso a paso y sin depender de otros documentos, todo lo que una persona debe instalar, verificar y ejecutar para crear la base ChromaDB del proyecto.

El objetivo de esta primera parte es llegar hasta este resultado:

```text
Base de Datos IA/
  chroma_db/
```

Es decir, crear correctamente la carpeta `chroma_db`, que es donde queda guardada la base vectorial generada por el proyecto.

---

## 1. Archivos que debe tener la persona antes de empezar

Antes de ejecutar cualquier comando, la persona debe tener una carpeta del proyecto con estos archivos:

```text
Base de Datos IA/
  crear_chromadb.py
  consultar_chromadb.py
  Guia_Base_Datos_Tienda_Tecnologia.md
  tienda_tecnologia_postgresql.sql
```

Para crear ChromaDB, el archivo principal es:

```text
crear_chromadb.py
```

Los archivos que se van a convertir en contenido para ChromaDB son:

```text
Guia_Base_Datos_Tienda_Tecnologia.md
tienda_tecnologia_postgresql.sql
```

El archivo `consultar_chromadb.py` no crea la base, pero sirve despues para comprobar que la base se creo correctamente.

---

## 2. Que debe estar instalado en la computadora

Para ejecutar el proyecto se necesita:

1. Python.
2. pip.
3. La libreria ChromaDB.

No basta con tener los archivos del proyecto. La computadora tambien debe tener Python y la dependencia de ChromaDB instalada.

---

## 3. Instalar Python en Windows

### Paso 1: Descargar Python

Entrar a la pagina oficial:

```text
https://www.python.org/downloads/
```

Descargar la version recomendada para Windows.

Se recomienda instalar una version moderna de Python 3, por ejemplo Python 3.11 o superior.

### Paso 2: Ejecutar el instalador

Abrir el instalador descargado.

Antes de presionar `Install Now`, activar esta opcion:

```text
Add python.exe to PATH
```

Este paso es muy importante.

Si no se marca esa casilla, Windows puede no reconocer el comando `python` desde PowerShell.

### Paso 3: Instalar

Despues de marcar `Add python.exe to PATH`, presionar:

```text
Install Now
```

Esperar hasta que termine la instalacion.

---

## 4. Verificar que Python esta instalado

Abrir PowerShell.

Ejecutar:

```powershell
python --version
```

Si Python esta instalado correctamente, debe aparecer algo parecido a:

```text
Python 3.11.9
```

o:

```text
Python 3.12.3
```

No tiene que ser exactamente ese numero. Lo importante es que aparezca `Python 3`.

Si el comando no funciona, probar:

```powershell
py --version
```

Si `py --version` funciona pero `python --version` no, se puede usar `py` en lugar de `python` para ejecutar los scripts.

Ejemplo:

```powershell
py crear_chromadb.py
```

en vez de:

```powershell
python crear_chromadb.py
```

---

## 5. Verificar que pip esta instalado

`pip` es el instalador de librerias de Python.

ChromaDB se instala usando `pip`.

En PowerShell ejecutar:

```powershell
pip --version
```

Si funciona, debe aparecer algo parecido a:

```text
pip 24.0 from ...
```

Si `pip --version` no funciona, probar:

```powershell
python -m pip --version
```

o:

```powershell
py -m pip --version
```

Si alguno de esos comandos funciona, entonces pip esta disponible.

---

## 6. Entrar a la carpeta correcta del proyecto

Todos los comandos del proyecto deben ejecutarse desde la carpeta donde esta `crear_chromadb.py`.

En este caso, la carpeta del proyecto es:

```text
C:\Users\Anthony\Documents\Base de Datos IA
```

En PowerShell ejecutar:

```powershell
cd "C:\Users\Anthony\Documents\Base de Datos IA"
```

Las comillas son importantes porque la ruta contiene espacios.

Despues de entrar a la carpeta, ejecutar:

```powershell
dir
```

Debe aparecer una lista de archivos similar a esta:

```text
crear_chromadb.py
consultar_chromadb.py
Guia_Base_Datos_Tienda_Tecnologia.md
tienda_tecnologia_postgresql.sql
```

Si no aparece `crear_chromadb.py`, significa que no estas dentro de la carpeta correcta.

---

## 7. Instalar la dependencia necesaria: ChromaDB

La libreria necesaria para este proyecto es:

```text
chromadb
```

Instalarla con este comando:

```powershell
pip install chromadb
```

Si el comando anterior no funciona, usar:

```powershell
python -m pip install chromadb
```

o:

```powershell
py -m pip install chromadb
```

La instalacion puede tardar varios minutos porque ChromaDB descarga varias dependencias internas.

Durante la instalacion pueden aparecer muchas lineas en la terminal. Eso es normal.

La instalacion termina correctamente si no aparece un error al final y la terminal vuelve a permitir escribir comandos.

---

## 8. Verificar que ChromaDB se instalo correctamente

En PowerShell ejecutar:

```powershell
python -c "import chromadb; print('ChromaDB instalado correctamente')"
```

Si se esta usando `py`, ejecutar:

```powershell
py -c "import chromadb; print('ChromaDB instalado correctamente')"
```

Si todo esta bien, debe aparecer:

```text
ChromaDB instalado correctamente
```

Si aparece un error como:

```text
ModuleNotFoundError: No module named 'chromadb'
```

significa que ChromaDB no se instalo en el Python que se esta usando.

En ese caso, instalar con:

```powershell
python -m pip install chromadb
```

o:

```powershell
py -m pip install chromadb
```

---

## 9. Confirmar que los documentos fuente existen

Antes de crear ChromaDB, confirmar que existen estos dos archivos:

```text
Guia_Base_Datos_Tienda_Tecnologia.md
tienda_tecnologia_postgresql.sql
```

Estos archivos son importantes porque `crear_chromadb.py` los lee y los guarda en la base vectorial.

Si falta uno de ellos, el script no podra completar la creacion.

Para verificar desde PowerShell:

```powershell
dir "Guia_Base_Datos_Tienda_Tecnologia.md"
dir "tienda_tecnologia_postgresql.sql"
```

Si ambos comandos muestran informacion del archivo, entonces estan correctamente ubicados.

---

## 10. Que hace exactamente `crear_chromadb.py`

El script `crear_chromadb.py` automatiza toda la creacion de ChromaDB.

No hay que crear manualmente la carpeta `chroma_db`.

El script se encarga de:

1. Detectar la carpeta donde esta el proyecto.
2. Definir que la base se guardara en `chroma_db`.
3. Leer los documentos fuente.
4. Dividir los documentos en fragmentos.
5. Convertir cada fragmento en un vector numerico.
6. Crear una coleccion llamada `tienda_tecnologia`.
7. Guardar los fragmentos, vectores y metadatos.
8. Mostrar en pantalla el resultado final.

---

## 11. Configuracion principal del script

Dentro de `crear_chromadb.py` hay varias configuraciones importantes.

### Carpeta del proyecto

```python
BASE_DIR = Path(__file__).resolve().parent
```

Esto significa que el script detecta automaticamente la carpeta donde esta guardado.

Por eso los documentos deben estar en la misma carpeta que `crear_chromadb.py`.

### Carpeta donde se guardara la base

```python
DB_DIR = BASE_DIR / "chroma_db"
```

Esto indica que ChromaDB se guardara en:

```text
chroma_db/
```

dentro del proyecto.

### Nombre de la coleccion

```python
COLLECTION_NAME = "tienda_tecnologia"
```

La coleccion es el contenedor interno donde ChromaDB guarda los fragmentos.

En este proyecto la coleccion se llama:

```text
tienda_tecnologia
```

### Tamano del vector

```python
EMBEDDING_DIMENSIONS = 384
```

Cada fragmento de texto se convierte en un vector de 384 posiciones numericas.

### Documentos que se cargaran

```python
SOURCES = [
    BASE_DIR / "Guia_Base_Datos_Tienda_Tecnologia.md",
    BASE_DIR / "tienda_tecnologia_postgresql.sql",
]
```

Esto significa que el script cargara exactamente esos dos archivos.

---

## 12. Como se convierte el texto en vectores

El script usa una funcion local llamada:

```python
LocalHashEmbeddingFunction
```

Esa funcion convierte texto en vectores sin usar internet, sin API key y sin servicios externos.

Funciona de esta manera:

1. Toma el texto del fragmento.
2. Convierte el texto a minusculas.
3. Extrae las palabras.
4. Aplica un hash a cada palabra.
5. Ubica cada palabra en una posicion del vector.
6. Normaliza el vector para que pueda compararse con otros.

Ejemplo conceptual:

```text
Texto:
crear tabla productos

Vector:
[0.00, 0.18, -0.12, 0.00, ..., 0.05]
```

Este proyecto usa una funcion local porque es facil de ejecutar en cualquier computadora.

Punto importante:

La misma funcion debe usarse para crear y para consultar la base.

Por eso `crear_chromadb.py` y `consultar_chromadb.py` contienen la misma clase `LocalHashEmbeddingFunction`.

---

## 13. Como se divide el contenido de los documentos

Los documentos completos pueden ser muy largos.

Por eso el script los divide en partes mas pequenas llamadas fragmentos.

La funcion que hace eso es:

```python
def split_text(text, max_chars=1200, overlap=150):
```

Esto significa:

```text
Cada fragmento tendra hasta 1200 caracteres.
Cada nuevo fragmento repetira 150 caracteres del fragmento anterior.
```

Ese solapamiento de 150 caracteres ayuda a no cortar ideas importantes entre un fragmento y otro.

Ejemplo:

```text
Fragmento 1: caracteres 0 a 1200
Fragmento 2: caracteres 1050 a 2250
Fragmento 3: caracteres 2100 a 3300
```

La repeticion entre fragmentos mejora la busqueda porque conserva contexto.

---

## 14. Crear ChromaDB

Cuando ya se verifico Python, pip, ChromaDB y los archivos fuente, ejecutar:

```powershell
python crear_chromadb.py
```

Si se esta usando `py`, ejecutar:

```powershell
py crear_chromadb.py
```

Este comando crea la base.

Si todo sale correctamente, se mostrara algo parecido a:

```text
Base ChromaDB creada en: C:\Users\Anthony\Documents\Base de Datos IA\chroma_db
Coleccion: tienda_tecnologia
Fragmentos guardados: 35
```

El numero de fragmentos puede cambiar dependiendo del contenido de los documentos.

---

## 15. Que ocurre durante la ejecucion

Cuando se ejecuta:

```powershell
python crear_chromadb.py
```

ocurre lo siguiente:

1. Python abre el archivo `crear_chromadb.py`.
2. El script importa la libreria `chromadb`.
3. Se define la ubicacion de la base: `chroma_db`.
4. Se crea un cliente persistente de ChromaDB.
5. Se elimina la coleccion anterior si ya existia.
6. Se crea nuevamente la coleccion `tienda_tecnologia`.
7. Se abre el archivo `Guia_Base_Datos_Tienda_Tecnologia.md`.
8. Se divide ese archivo en fragmentos.
9. Se abre el archivo `tienda_tecnologia_postgresql.sql`.
10. Se divide ese archivo en fragmentos.
11. Cada fragmento se convierte en vector.
12. Cada fragmento recibe un identificador unico.
13. Cada fragmento recibe metadatos.
14. Todo se guarda dentro de ChromaDB.
15. Se crea o actualiza la carpeta `chroma_db`.

---

## 16. Que son los ids y metadatos que se guardan

Cada fragmento guardado en ChromaDB tiene un identificador.

El script crea ids con esta forma:

```python
ids.append(f"{source.stem}_{index}")
```

Ejemplo:

```text
Guia_Base_Datos_Tienda_Tecnologia_1
tienda_tecnologia_postgresql_3
```

Tambien se guardan metadatos:

```python
{
    "archivo": source.name,
    "fragmento": index,
}
```

Ejemplo:

```text
archivo: tienda_tecnologia_postgresql.sql
fragmento: 3
```

Esto permite saber de que archivo y de que fragmento salio cada resultado.

---

## 17. Verificar que se creo `chroma_db`

Despues de ejecutar el script, revisar la carpeta del proyecto.

Debe aparecer:

```text
chroma_db/
```

Tambien se puede verificar desde PowerShell:

```powershell
dir
```

La lista debe incluir:

```text
chroma_db
```

Para ver que hay dentro:

```powershell
dir chroma_db
```

Normalmente aparecera un archivo como:

```text
chroma.sqlite3
```

y pueden aparecer otras carpetas internas.

Importante:

La base ChromaDB es la carpeta completa `chroma_db`, no solamente el archivo `chroma.sqlite3`.

---

## 18. Probar que ChromaDB funciona

Despues de crear la base, ejecutar:

```powershell
python consultar_chromadb.py
```

o:

```powershell
py consultar_chromadb.py
```

El programa mostrara:

```text
Pregunta:
```

Escribir una pregunta relacionada con los documentos.

Ejemplo:

```text
Como se crea la tabla productos?
```

Si todo esta funcionando, apareceran resultados como:

```text
Resultados mas relevantes:

--- Resultado 1 ---
Archivo: tienda_tecnologia_postgresql.sql | Fragmento: 3
...
```

Eso confirma que:

1. La base `chroma_db` existe.
2. La coleccion `tienda_tecnologia` fue creada.
3. Los documentos fueron cargados.
4. Los fragmentos se pueden consultar.

---

## 19. Que hace `consultar_chromadb.py`

Este archivo no crea la base.

Sirve para comprobar que la base ya creada funciona correctamente.

Cuando se ejecuta:

```powershell
python consultar_chromadb.py
```

el script:

1. Pide una pregunta.
2. Abre la carpeta `chroma_db`.
3. Abre la coleccion `tienda_tecnologia`.
4. Convierte la pregunta en vector usando la misma funcion local.
5. Busca los 3 fragmentos mas relacionados.
6. Muestra el archivo, numero de fragmento y texto encontrado.

La busqueda principal se realiza con:

```python
results = collection.query(
    query_texts=[pregunta],
    n_results=3,
)
```

`n_results=3` significa que devuelve los 3 resultados mas cercanos.

---

## 20. Cuando se debe volver a ejecutar `crear_chromadb.py`

Se debe volver a crear ChromaDB cuando:

- Se edita `Guia_Base_Datos_Tienda_Tecnologia.md`.
- Se edita `tienda_tecnologia_postgresql.sql`.
- Se agrega otro documento al script.
- Se borra la carpeta `chroma_db`.
- Se quiere regenerar la base desde cero.

Comando:

```powershell
python crear_chromadb.py
```

Cada vez que se ejecuta, el script elimina la coleccion anterior y la vuelve a crear.

Esto evita que se dupliquen fragmentos viejos.

---

## 21. Errores frecuentes y solucion

### Error: `python` no se reconoce como comando

Posible causa:

Python no esta instalado o no se agrego al PATH.

Soluciones:

1. Probar:

```powershell
py --version
```

2. Si `py` funciona, ejecutar los scripts con `py`.

```powershell
py crear_chromadb.py
```

3. Si tampoco funciona, reinstalar Python y marcar:

```text
Add python.exe to PATH
```

### Error: `pip` no se reconoce como comando

Solucion:

Usar:

```powershell
python -m pip install chromadb
```

o:

```powershell
py -m pip install chromadb
```

### Error: `ModuleNotFoundError: No module named 'chromadb'`

Significa que falta instalar ChromaDB.

Solucion:

```powershell
python -m pip install chromadb
```

o:

```powershell
py -m pip install chromadb
```

### Error: no encuentra `Guia_Base_Datos_Tienda_Tecnologia.md`

Significa que el archivo no esta en la misma carpeta que `crear_chromadb.py` o que el nombre no coincide.

Solucion:

Revisar que exista exactamente este archivo:

```text
Guia_Base_Datos_Tienda_Tecnologia.md
```

### Error: no encuentra `tienda_tecnologia_postgresql.sql`

Significa que el archivo SQL no esta en la misma carpeta que `crear_chromadb.py` o que el nombre no coincide.

Solucion:

Revisar que exista exactamente este archivo:

```text
tienda_tecnologia_postgresql.sql
```

### Error: no existe la coleccion `tienda_tecnologia`

Posible causa:

Se ejecuto `consultar_chromadb.py` antes de ejecutar `crear_chromadb.py`.

Solucion:

```powershell
python crear_chromadb.py
python consultar_chromadb.py
```

### Error: los resultados no parecen correctos

Posibles causas:

- La pregunta no esta relacionada con los documentos.
- Los documentos fuente no contienen esa informacion.
- La busqueda local por hash tiene limitaciones.

Solucion:

Probar preguntas mas cercanas al contenido real de los documentos.

Ejemplo:

```text
Que tablas tiene la base de datos?
Como se crea la tabla productos?
Que campos tiene la tabla clientes?
```

---

## 22. Lista de comandos completa

Esta es la secuencia completa para una persona que empieza desde cero en Windows:

```powershell
python --version
pip --version
cd "C:\Users\Anthony\Documents\Base de Datos IA"
dir
pip install chromadb
python -c "import chromadb; print('ChromaDB instalado correctamente')"
python crear_chromadb.py
dir chroma_db
python consultar_chromadb.py
```

Si la computadora usa `py` en lugar de `python`, usar esta secuencia:

```powershell
py --version
py -m pip --version
cd "C:\Users\Anthony\Documents\Base de Datos IA"
dir
py -m pip install chromadb
py -c "import chromadb; print('ChromaDB instalado correctamente')"
py crear_chromadb.py
dir chroma_db
py consultar_chromadb.py
```

---

## 23. Resultado final

Al terminar correctamente, debe existir la carpeta:

```text
chroma_db/
```

dentro del proyecto.

Tambien debe funcionar este comando:

```powershell
python consultar_chromadb.py
```

Y al hacer una pregunta deben aparecer resultados con esta estructura:

```text
--- Resultado 1 ---
Archivo: ...
Fragmento: ...
```

Si eso ocurre, la creacion de ChromaDB fue exitosa.

