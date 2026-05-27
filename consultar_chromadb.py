from pathlib import Path
import hashlib
import math
import re

import chromadb


BASE_DIR = Path(__file__).resolve().parent
DB_DIR = BASE_DIR / "chroma_db"
COLLECTION_NAME = "tienda_tecnologia"
EMBEDDING_DIMENSIONS = 384


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


def main():
    pregunta = input("Pregunta: ").strip()

    if not pregunta:
        print("Debes escribir una pregunta.")
        return

    client = chromadb.PersistentClient(path=str(DB_DIR))
    collection = client.get_collection(
        COLLECTION_NAME,
        embedding_function=LocalHashEmbeddingFunction(),
    )

    results = collection.query(
        query_texts=[pregunta],
        n_results=3,
    )

    print("\nResultados mas relevantes:\n")

    for index, document in enumerate(results["documents"][0], start=1):
        metadata = results["metadatas"][0][index - 1]
        print(f"--- Resultado {index} ---")
        print(f"Archivo: {metadata['archivo']} | Fragmento: {metadata['fragmento']}")
        print(document[:900])
        print()


if __name__ == "__main__":
    main()
