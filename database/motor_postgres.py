import psycopg2
import json
import os
from dotenv import load_dotenv # Nueva librería

def inicializar_db():
    load_dotenv() # Carga las variables del archivo .env
    
    try:
        conn = psycopg2.connect(
            dbname="inventario_pyme",
            user=os.getenv('DB_USER', os.environ.get('USER')), # Failsafe para Mac
            password=os.getenv('DB_PASSWORD', ''),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432')
        )
        cursor = conn.cursor()

        # 2. Crear la tabla estricta para consumer electronics
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS productos (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(255) NOT NULL,
                descripcion TEXT,
                precio NUMERIC(10, 2) NOT NULL,
                stock INTEGER NOT NULL,
                categoria VARCHAR(100),
                especificacion_clave TEXT
            )
        ''')

        # 3. Limpiar tabla para evitar duplicados en cada prueba
        cursor.execute('TRUNCATE TABLE productos RESTART IDENTITY;')

        # 4. Leer el archivo JSON (con los datos de RTX, procesadores, etc.)
        ruta_json = os.path.join(os.path.dirname(__file__), 'mock_data.json')
        with open(ruta_json, 'r', encoding='utf-8') as file:
            productos = json.load(file)

        # 5. Insertar los productos
        for p in productos:
            cursor.execute('''
                INSERT INTO productos (nombre, descripcion, precio, stock, categoria, especificacion_clave)
                VALUES (%s, %s, %s, %s, %s, %s)
            ''', (p['nombre'], p['descripcion'], p['precio'], p['stock'], p['categoria'], p.get('especificacion_clave', '')))

        # 6. Guardar y cerrar
        conn.commit()
        print(f"✅ ¡Éxito! Base de datos PostgreSQL inicializada con {len(productos)} componentes de tecnología.")
        
    except Exception as e:
        print(f"❌ Error al conectar con PostgreSQL: {e}")
    finally:
        if 'conn' in locals() and conn is not None:
            cursor.close()
            conn.close()

if __name__ == "__main__":
    inicializar_db()