import os
import psycopg2
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

def probar_motores():
    print("Iniciando pruebas de infraestructura YACHAT_IA...\n")
    
    # ---------------------------------------------------------
    # TEST 1: Motor Determinista (PostgreSQL)
    # ---------------------------------------------------------
    print("🔍 Probando PostgreSQL...")
    load_dotenv()
    try:
        conn = psycopg2.connect(
            dbname="inventario_pyme",
            user=os.getenv('DB_USER', os.environ.get('USER')),
            password=os.getenv('DB_PASSWORD', ''),
            host=os.getenv('DB_HOST', 'localhost'),
            port=os.getenv('DB_PORT', '5432')
        )
        cursor = conn.cursor()
        cursor.execute("SELECT nombre, precio FROM productos LIMIT 2;")
        productos_sql = cursor.fetchall()
        print(f"✅ SQL OK. Se encontraron productos: {productos_sql}\n")
        conn.close()
    except Exception as e:
        print(f"❌ Error en SQL: {e}\n")

    # ---------------------------------------------------------
    # TEST 2: Motor Semántico (ChromaDB + Ollama)
    # ---------------------------------------------------------
    print("🧠 Probando ChromaDB y Embeddings locales...")
    try:
        embeddings = OllamaEmbeddings(model="nomic-embed-text")
        # Apuntamos a la carpeta que creaste
        ruta_chroma = os.path.join(os.path.dirname(__file__), 'chroma_data')
        
        vectorstore = Chroma(persist_directory=ruta_chroma, embedding_function=embeddings)
        
        # Hacemos una pregunta "humana"
        pregunta = "quiero una gráfica potente para jugar a 4k"
        resultados = vectorstore.similarity_search(pregunta, k=1)
        
        print(f"✅ Semántica OK. Para '{pregunta}', la IA encontró:")
        print(f"   -> {resultados[0].page_content}")
        
    except Exception as e:
        print(f"❌ Error en ChromaDB: {e}")

if __name__ == "__main__":
    probar_motores()