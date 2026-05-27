from pathlib import Path
import hashlib
import math
import re

import chromadb


BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "chroma_db"
COLLECTION_NAME = "tienda_tecnologia"
EMBEDDING_DIMENSIONS = 384

SOURCES = [
    BASE_DIR / "Guia_Base_Datos_Tienda_Tecnologia.md",
    BASE_DIR / "tienda_tecnologia_postgresql.sql",
]


class LocalHashEmbeddingFunction:
    def name(self):
        return "local_hash_embedding"

    def __call__(self, input):
        return self.embed_documents(input)

    def embed_documents(self, input):
        return [self._embed(text) for text in input]

    def embed_query(self, input):
        return [self._embed(text) for text in input]

    def _embed(self, text):
        vector = [0.0] * EMBEDDING_DIMENSIONS
        words = re.findall(r"\w+", text.lower(), flags=re.UNICODE)

        for word in words:
            digest = hashlib.md5(word.encode("utf-8")).digest()
            index = int.from_bytes(digest[:4], "little") % EMBEDDING_DIMENSIONS
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign

        norm = math.sqrt(sum(value * value for value in vector))
        if norm:
            vector = [value / norm for value in vector]

        return vector


def split_text(text, max_chars=1200, overlap=150):
    chunks = []
    start = 0

    while start < len(text):
        end = start + max_chars
        chunk = text[start:end].strip()

        if chunk:
            chunks.append(chunk)

        start = end - overlap

    return chunks


def main():
    client = chromadb.PersistentClient(path=str(DB_DIR))
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass

    collection = client.get_or_create_collection(
        COLLECTION_NAME,
        embedding_function=LocalHashEmbeddingFunction(),
    )

    documents = []
    ids = []
    metadatas = []

    for source in SOURCES:
        text = source.read_text(encoding="utf-8")
        chunks = split_text(text)

        for index, chunk in enumerate(chunks, start=1):
            documents.append(chunk)
            ids.append(f"{source.stem}_{index}")
            metadatas.append(
                {
                    "archivo": source.name,
                    "fragmento": index,
                }
            )

    collection.upsert(
        ids=ids,
        documents=documents,
        metadatas=metadatas,
    )

    print(f"Base ChromaDB creada en: {DB_DIR}")
    print(f"Coleccion: {COLLECTION_NAME}")
    print(f"Fragmentos guardados: {len(documents)}")


if __name__ == "__main__":
    main()
