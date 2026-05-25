import os
from contextlib import contextmanager
from typing import Any

import psycopg2
from dotenv import load_dotenv


DB_NAME = "inventario_pyme"


@contextmanager
def obtener_conexion():
    load_dotenv()
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )
    try:
        yield conn
    finally:
        conn.close()


def ingresar_producto(
    categoria: str,
    marca: str,
    nombre: str,
    modelo: str,
    descripcion: str,
    precio: float,
    stock: int,
    garantia_meses: int = 12,
    estado: str = "disponible",
) -> int:
    """Registra un articulo en la tabla central productos."""
    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT id_categoria FROM categorias WHERE nombre = %s;",
                (categoria,),
            )
            categoria_row = cursor.fetchone()
            if categoria_row is None:
                raise ValueError(f"No existe la categoria: {categoria}")

            cursor.execute("SELECT id_marca FROM marcas WHERE nombre = %s;", (marca,))
            marca_row = cursor.fetchone()
            if marca_row is None:
                raise ValueError(f"No existe la marca: {marca}")

            cursor.execute(
                """
                INSERT INTO productos (
                    id_categoria, id_marca, nombre, modelo, descripcion,
                    precio, stock, garantia_meses, estado
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id_producto;
                """,
                (
                    categoria_row[0],
                    marca_row[0],
                    nombre,
                    modelo,
                    descripcion,
                    precio,
                    stock,
                    garantia_meses,
                    estado,
                ),
            )
            id_producto = cursor.fetchone()[0]
            conn.commit()
            return id_producto


def ingresar_especificaciones(id_producto: int, categoria: str, **datos: Any) -> None:
    """Guarda las caracteristicas tecnicas que permiten validar compatibilidad."""
    esquemas = {
        "Placa madre": (
            "especificaciones_placa_madre",
            {
                "socket_cpu",
                "chipset",
                "tipo_ram",
                "slots_ram",
                "ram_max_gb",
                "formato",
                "pcie_version",
                "conectores_m2",
                "soporta_wifi",
            },
        ),
        "Procesador": (
            "especificaciones_procesador",
            {
                "socket_cpu",
                "nucleos",
                "hilos",
                "frecuencia_base_ghz",
                "frecuencia_turbo_ghz",
                "tdp_w",
                "tiene_grafica_integrada",
            },
        ),
        "Memoria RAM": (
            "especificaciones_memoria_ram",
            {"tipo_ram", "capacidad_gb", "modulos", "velocidad_mhz", "latencia"},
        ),
        "Tarjeta grafica": (
            "especificaciones_tarjeta_grafica",
            {
                "memoria_vram_gb",
                "tipo_vram",
                "pcie_version",
                "consumo_recomendado_w",
                "conectores_energia",
                "largo_mm",
            },
        ),
        "Fuente de poder": (
            "especificaciones_fuente_poder",
            {
                "potencia_w",
                "certificacion",
                "modularidad",
                "formato",
                "conectores_pcie",
            },
        ),
        "Almacenamiento": (
            "especificaciones_almacenamiento",
            {
                "tipo",
                "capacidad_gb",
                "interfaz",
                "formato",
                "velocidad_lectura_mbps",
                "velocidad_escritura_mbps",
            },
        ),
        "Gabinete": (
            "especificaciones_gabinete",
            {
                "formato_soportado",
                "largo_gpu_max_mm",
                "altura_disipador_max_mm",
                "bahias_25",
                "bahias_35",
            },
        ),
        "Monitor": (
            "especificaciones_monitor",
            {
                "pulgadas",
                "resolucion",
                "tasa_refresco_hz",
                "tipo_panel",
                "conectividad",
            },
        ),
        "Periferico": (
            "especificaciones_periferico",
            {"tipo_periferico", "conexion", "es_rgb"},
        ),
    }
    esquema = esquemas.get(categoria)
    if esquema is None:
        raise ValueError(f"No hay tabla de especificaciones para: {categoria}")
    if not datos:
        raise ValueError("Debes enviar al menos una especificacion tecnica.")

    tabla, columnas_validas = esquema
    columnas_invalidas = set(datos) - columnas_validas
    if columnas_invalidas:
        columnas = ", ".join(sorted(columnas_invalidas))
        raise ValueError(f"Especificaciones no validas para {categoria}: {columnas}")

    columnas = ["id_producto", *datos.keys()]
    valores = [id_producto, *datos.values()]
    placeholders = ", ".join(["%s"] * len(columnas))
    columnas_sql = ", ".join(columnas)

    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                f"INSERT INTO {tabla} ({columnas_sql}) VALUES ({placeholders});",
                valores,
            )
            conn.commit()


def explicar_reglas_compatibilidad() -> list[dict[str, str]]:
    """Devuelve las reglas de compatibilidad que debe usar el agente."""
    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT categoria_origen, categoria_destino, regla, descripcion
                FROM compatibilidades_componentes
                ORDER BY id_compatibilidad;
                """
            )
            return [
                {
                    "origen": row[0],
                    "destino": row[1],
                    "regla": row[2],
                    "descripcion": row[3],
                }
                for row in cursor.fetchall()
            ]


def placas_compatibles_con_procesador(id_procesador: int) -> list[dict[str, Any]]:
    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT pm.id_producto, pm.nombre, pm.modelo, epm.socket_cpu, pm.precio, pm.stock
                FROM productos cpu
                JOIN especificaciones_procesador ecpu ON ecpu.id_producto = cpu.id_producto
                JOIN especificaciones_placa_madre epm ON epm.socket_cpu = ecpu.socket_cpu
                JOIN productos pm ON pm.id_producto = epm.id_producto
                WHERE cpu.id_producto = %s
                  AND pm.estado = 'disponible'
                  AND pm.stock > 0
                ORDER BY pm.precio;
                """,
                (id_procesador,),
            )
            return _filas_como_diccionarios(
                cursor,
                ["id_producto", "nombre", "modelo", "socket_cpu", "precio", "stock"],
            )


def memorias_compatibles_con_placa(id_placa_madre: int) -> list[dict[str, Any]]:
    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT ram.id_producto, ram.nombre, ram.modelo, eram.tipo_ram,
                       eram.capacidad_gb, eram.velocidad_mhz, ram.precio, ram.stock
                FROM productos placa
                JOIN especificaciones_placa_madre epm ON epm.id_producto = placa.id_producto
                JOIN especificaciones_memoria_ram eram ON eram.tipo_ram = epm.tipo_ram
                JOIN productos ram ON ram.id_producto = eram.id_producto
                WHERE placa.id_producto = %s
                  AND ram.estado = 'disponible'
                  AND ram.stock > 0
                ORDER BY ram.precio;
                """,
                (id_placa_madre,),
            )
            return _filas_como_diccionarios(
                cursor,
                [
                    "id_producto",
                    "nombre",
                    "modelo",
                    "tipo_ram",
                    "capacidad_gb",
                    "velocidad_mhz",
                    "precio",
                    "stock",
                ],
            )


def fuentes_compatibles_con_gpu(id_tarjeta_grafica: int) -> list[dict[str, Any]]:
    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT fuente.id_producto, fuente.nombre, fuente.modelo, epsu.potencia_w,
                       epsu.certificacion, fuente.precio, fuente.stock
                FROM productos gpu
                JOIN especificaciones_tarjeta_grafica egpu ON egpu.id_producto = gpu.id_producto
                JOIN especificaciones_fuente_poder epsu
                  ON epsu.potencia_w >= egpu.consumo_recomendado_w
                JOIN productos fuente ON fuente.id_producto = epsu.id_producto
                WHERE gpu.id_producto = %s
                  AND fuente.estado = 'disponible'
                  AND fuente.stock > 0
                ORDER BY epsu.potencia_w, fuente.precio;
                """,
                (id_tarjeta_grafica,),
            )
            return _filas_como_diccionarios(
                cursor,
                [
                    "id_producto",
                    "nombre",
                    "modelo",
                    "potencia_w",
                    "certificacion",
                    "precio",
                    "stock",
                ],
            )


def gabinetes_compatibles(id_placa_madre: int, id_tarjeta_grafica: int) -> list[dict[str, Any]]:
    with obtener_conexion() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT gabinete.id_producto, gabinete.nombre, gabinete.modelo,
                       egab.formato_soportado, egab.largo_gpu_max_mm,
                       gabinete.precio, gabinete.stock
                FROM especificaciones_placa_madre epm
                CROSS JOIN especificaciones_tarjeta_grafica egpu
                JOIN especificaciones_gabinete egab
                  ON EXISTS (
                    SELECT 1
                    FROM unnest(string_to_array(egab.formato_soportado, ',')) AS formato
                    WHERE trim(formato) = epm.formato
                  )
                 AND egab.largo_gpu_max_mm >= egpu.largo_mm
                JOIN productos gabinete ON gabinete.id_producto = egab.id_producto
                WHERE epm.id_producto = %s
                  AND egpu.id_producto = %s
                  AND gabinete.estado = 'disponible'
                  AND gabinete.stock > 0
                ORDER BY gabinete.precio;
                """,
                (id_placa_madre, id_tarjeta_grafica),
            )
            return _filas_como_diccionarios(
                cursor,
                [
                    "id_producto",
                    "nombre",
                    "modelo",
                    "formato_soportado",
                    "largo_gpu_max_mm",
                    "precio",
                    "stock",
                ],
            )


def _filas_como_diccionarios(cursor, columnas: list[str]) -> list[dict[str, Any]]:
    return [dict(zip(columnas, fila)) for fila in cursor.fetchall()]
