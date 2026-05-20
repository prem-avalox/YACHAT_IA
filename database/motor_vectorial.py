import json
import os
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.documents import Document

def inicializar_vectorial():
    # 1. Conectar con el modelo de embeddings local de Ollama
    print("Conectando con Ollama (nomic-embed-text)...")
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    # 2. Leer el inventario de tecnología
    ruta_json = os.path.join(os.path.dirname(__file__), 'mock_data.json')
    with open(ruta_json, 'r', encoding='utf-8') as file:
        productos = json.load(file)

    # 3. Preparar los "Documentos" para la base vectorial
    documentos = []
    for p in productos:
        # Esto es lo que la IA va a "leer" para entender el concepto
        texto_semantico = f"{p['nombre']}. {p['descripcion']} Especificación: {p.get('especificacion_clave', '')}"
        
        # Guardamos el ID de Postgres para poder cruzar los datos después
        metadatos = {
            "id_sql": p['id'],
            "categoria": p['categoria']
        }
        
        doc = Document(page_content=texto_semantico, metadata=metadatos)
        documentos.append(doc)

    # 4. Crear la base de datos y guardar en el disco
    ruta_chroma = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'chroma_data')
    
    print("Generando el espacio vectorial (esto tomará unos segundos)...")
    vectorstore = Chroma.from_documents(
        documents=documentos,
        embedding=embeddings,
        persist_directory=ruta_chroma
    )

    print(f"✅ ¡Éxito! Motor Semántico inicializado con {len(documentos)} vectores en ChromaDB.")

if __name__ == "__main__":
    inicializar_vectorial()