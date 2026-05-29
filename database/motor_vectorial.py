import os
import shutil

import psycopg2
from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_ollama import OllamaEmbeddings


ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
CHROMA_DIR = os.path.join(ROOT_DIR, "chroma_data")
COLLECTION_NAME = "productos_catalogo"


def _conectar_postgres():
    load_dotenv(os.path.join(ROOT_DIR, ".env"))
    load_dotenv(os.path.join(ROOT_DIR, "techcore-ec-1", ".env"), override=False)

    return psycopg2.connect(
        dbname=os.getenv("DB_NAME", "inventario_pyme"),
        user=os.getenv("DB_USER", os.environ.get("USER")),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )


def _leer_catalogo():
    query = """
        SELECT
            id_producto,
            categoria,
            marca,
            nombre,
            modelo,
            descripcion,
            precio,
            stock,
            garantia_meses,
            placa_socket_cpu,
            placa_tipo_ram,
            placa_formato,
            cpu_socket_cpu,
            cpu_nucleos,
            cpu_hilos,
            cpu_tdp_w,
            ram_tipo,
            ram_capacidad_gb,
            ram_velocidad_mhz,
            gpu_vram_gb,
            gpu_consumo_recomendado_w,
            gpu_largo_mm,
            fuente_potencia_w,
            fuente_certificacion,
            almacenamiento_tipo,
            almacenamiento_capacidad_gb,
            almacenamiento_interfaz,
            gabinete_formato_soportado,
            gabinete_largo_gpu_max_mm
        FROM vista_catalogo_agente
        WHERE estado = 'disponible'
          AND stock > 0
        ORDER BY id_producto
    """

    with _conectar_postgres() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _texto_producto(producto):
    piezas = [
        producto.get("nombre"),
        producto.get("marca"),
        producto.get("categoria"),
        producto.get("modelo"),
        producto.get("descripcion"),
        f"precio {producto.get('precio')}",
    ]

    specs = {
        "socket placa": producto.get("placa_socket_cpu"),
        "ram placa": producto.get("placa_tipo_ram"),
        "formato placa": producto.get("placa_formato"),
        "socket cpu": producto.get("cpu_socket_cpu"),
        "nucleos cpu": producto.get("cpu_nucleos"),
        "hilos cpu": producto.get("cpu_hilos"),
        "tdp cpu": producto.get("cpu_tdp_w"),
        "tipo ram": producto.get("ram_tipo"),
        "capacidad ram": producto.get("ram_capacidad_gb"),
        "velocidad ram": producto.get("ram_velocidad_mhz"),
        "vram gpu": producto.get("gpu_vram_gb"),
        "consumo gpu": producto.get("gpu_consumo_recomendado_w"),
        "largo gpu": producto.get("gpu_largo_mm"),
        "watts fuente": producto.get("fuente_potencia_w"),
        "certificacion fuente": producto.get("fuente_certificacion"),
        "tipo almacenamiento": producto.get("almacenamiento_tipo"),
        "capacidad almacenamiento": producto.get("almacenamiento_capacidad_gb"),
        "interfaz almacenamiento": producto.get("almacenamiento_interfaz"),
        "formato gabinete": producto.get("gabinete_formato_soportado"),
        "largo maximo gpu gabinete": producto.get("gabinete_largo_gpu_max_mm"),
    }

    piezas.extend(f"{k}: {v}" for k, v in specs.items() if v not in (None, ""))
    return ". ".join(str(p) for p in piezas if p not in (None, ""))


def inicializar_vectorial():
    print("Leyendo catálogo real desde PostgreSQL...")
    productos = _leer_catalogo()

    if not productos:
        raise RuntimeError("No se encontraron productos disponibles para indexar en ChromaDB.")

    documentos = []
    ids = []
    for producto in productos:
        metadata = {
            "id_producto": int(producto["id_producto"]),
            "categoria": producto["categoria"],
            "marca": producto["marca"],
            "nombre": producto["nombre"],
            "precio": float(producto["precio"]),
        }
        documentos.append(Document(page_content=_texto_producto(producto), metadata=metadata))
        ids.append(str(producto["id_producto"]))

    if os.path.exists(CHROMA_DIR):
        shutil.rmtree(CHROMA_DIR)

    print("Conectando con Ollama embeddings (nomic-embed-text)...")
    embeddings = OllamaEmbeddings(model="nomic-embed-text")

    print("Generando índice semántico ChromaDB...")
    Chroma.from_documents(
        documents=documentos,
        ids=ids,
        embedding=embeddings,
        collection_name=COLLECTION_NAME,
        persist_directory=CHROMA_DIR,
    )

    print(f"✅ ChromaDB inicializado con {len(documentos)} productos reales.")


if __name__ == "__main__":
    inicializar_vectorial()
