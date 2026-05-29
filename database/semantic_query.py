import json
import os
import re
import sys

from dotenv import load_dotenv
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings


ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
CHROMA_DIR = os.path.join(ROOT_DIR, "chroma_data")
COLLECTION_NAME = "productos_catalogo"
FULL_BUILD_CATEGORIES = [
    "Procesador",
    "Placa madre",
    "Memoria RAM",
    "Tarjeta grafica",
    "Fuente de poder",
    "Almacenamiento",
    "Gabinete",
]
CATEGORY_KEYWORDS = [
    ("Tarjeta grafica", r"\b(gpu|gr[aá]fica|video|rtx|radeon|nvidia|dlss|vram)\b"),
    ("Procesador", r"\b(cpu|procesador|ryzen|intel|core|núcleos|nucleos)\b"),
    ("Placa madre", r"\b(placa|motherboard|mainboard|b550|b650|z790|am4|am5|lga)\b"),
    ("Memoria RAM", r"\b(ram|memoria|ddr4|ddr5)\b"),
    ("Fuente de poder", r"\b(fuente|psu|watts|watt|bronze|gold|platinum)\b"),
    ("Almacenamiento", r"\b(ssd|hdd|nvme|almacenamiento|disco|m\.2|sata)\b"),
    ("Gabinete", r"\b(gabinete|case|chasis|torre|atx|micro atx)\b"),
    ("Monitor", r"\b(monitor|pantalla|hz|pulgadas|144hz|240hz|oled)\b"),
    ("Periferico", r"\b(mouse|teclado|aud[ií]fonos|auriculares|perif[eé]rico)\b"),
]
WORKSTATION_KEYWORDS = (
    r"davinci|resolve|color grading|pro\s*res|prores|"
    r"producci[oó]n musical|produccion musical|ableton|mixing|mastering|"
    r"ozone|plugins?|vst|audio|fl studio|logic pro|reaper|cubase"
)


def _inferir_tipo_uso(texto):
    t = texto.lower()
    if re.search(r"\b(league of legends|lol|valorant|cs2|counter strike|dota|minecraft|roblox|rocket league|overwatch|fortnite)\b", t):
        return "gaming_ligero"
    if re.search(r"\b(gamer|gaming|jugar|juegos|warzone|fortnite|valorant|1440p|4k|fps|stream)\b", t):
        return "gaming"
    if re.search(rf"\b({WORKSTATION_KEYWORDS}|edici[oó]n|editar|video|render|renderizar|dise[nñ]o|blender|arquitectura|3d)\b", t):
        return "productividad_creativa"
    if re.search(r"\b(oficina|excel|word|correo|navegar|clases|estudio|b[aá]sica)\b", t):
        return "oficina"
    return "general"


def _quiere_pc_completa(texto):
    t = texto.lower()
    return bool(re.search(r"\b(pc|computadora|ordenador|setup|build|armar|completa|torre|equipo|workstation|estaci[oó]n de trabajo|m[aá]quina|maquina)\b", t))


def _es_solicitud_de_equipo_por_uso(texto, tipo_uso, keyword_categories):
    t = texto.lower()
    if keyword_categories and re.search(
        r"\b(gpu|gr[aá]fica|tarjeta|procesador|cpu|placa|motherboard|ram|memoria|ssd|hdd|nvme|fuente|psu|gabinete|monitor|mouse|teclado)\b",
        t,
    ):
        return False

    if tipo_uso in {"gaming", "gaming_ligero", "oficina"} and not keyword_categories:
        return True

    if tipo_uso == "productividad_creativa":
        if re.search(rf"\b({WORKSTATION_KEYWORDS})\b", t):
            return True
        if re.search(r"\b(una|uno|algo|equipo|maquina|m[aá]quina)\s+que\s+me\s+sirv", t):
            return True

    return False


def _presupuesto_sugerido(tipo_uso, texto):
    t = texto.lower()
    if re.search(r"\b(4k|ultra|gama alta|alto rendimiento)\b", t):
        return 1800
    if re.search(r"\b(1440p|warzone|stream|streaming)\b", t):
        return 1500
    if re.search(r"\b(davinci|resolve|color grading|pro\s*res|prores|profesional)\b", t):
        return 1900
    if re.search(r"\b(producci[oó]n musical|produccion musical|ableton|mixing|mastering|ozone|plugins?|vst)\b", t):
        return 1600
    if tipo_uso == "gaming_ligero":
        return 700
    if tipo_uso == "oficina":
        return 650
    if tipo_uso == "productividad_creativa":
        return 1400
    if tipo_uso == "gaming":
        return 1200
    return None


def _categorias_por_keywords(texto):
    t = texto.lower()
    categorias = []
    for categoria, pattern in CATEGORY_KEYWORDS:
        if re.search(pattern, t) and categoria not in categorias:
            categorias.append(categoria)
    return categorias


def buscar_semantico(query, k=20):
    load_dotenv(os.path.join(ROOT_DIR, ".env"))
    if not os.path.exists(os.path.join(CHROMA_DIR, "chroma.sqlite3")):
        return {
            "enabled": False,
            "reason": "chroma_index_missing",
            "query": query,
            "matches": [],
            "categories": [],
        }

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DIR,
    )

    keyword_categories = _categorias_por_keywords(query)
    docs = vectorstore.similarity_search_with_score(query, k=k)
    matches = []
    seen_categories = []
    for rank, (doc, distance) in enumerate(docs, start=1):
        meta = doc.metadata
        categoria = meta.get("categoria")
        if categoria and categoria not in seen_categories:
            seen_categories.append(categoria)

        matches.append({
            "rank": rank,
            "distance": float(distance),
            "relevance": float(1 / (1 + max(distance, 0))),
            "id_producto": int(meta.get("id_producto")),
            "categoria": categoria,
            "marca": meta.get("marca"),
            "nombre": meta.get("nombre"),
            "precio": float(meta.get("precio", 0)),
        })

    tipo_uso = _inferir_tipo_uso(query)
    pc_completa = _quiere_pc_completa(query) or _es_solicitud_de_equipo_por_uso(query, tipo_uso, keyword_categories)
    presupuesto_sugerido = _presupuesto_sugerido(tipo_uso, query) if pc_completa else None
    if keyword_categories and not pc_completa:
        matches = [m for m in matches if m["categoria"] in keyword_categories] or matches

    categories = FULL_BUILD_CATEGORIES if pc_completa else (keyword_categories or seen_categories[:4])
    if not categories:
        categories = FULL_BUILD_CATEGORIES

    return {
        "enabled": True,
        "query": query,
        "tipo_uso": tipo_uso,
        "presupuesto_sugerido": presupuesto_sugerido,
        "pc_completa": pc_completa,
        "categories": categories,
        "matches": matches,
    }


if __name__ == "__main__":
    consulta = " ".join(sys.argv[1:]).strip()
    if not consulta:
        print(json.dumps({"enabled": False, "reason": "empty_query", "matches": [], "categories": []}))
        raise SystemExit(0)

    print(json.dumps(buscar_semantico(consulta), ensure_ascii=False))
