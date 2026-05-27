-- Base de datos sencilla para una tienda de tecnologia.
-- Objetivo: alimentar un agente LLM que recomiende componentes compatibles.
-- Motor: PostgreSQL

DROP TABLE IF EXISTS carrito_items CASCADE;
DROP TABLE IF EXISTS carritos CASCADE;
DROP TABLE IF EXISTS compatibilidades_componentes CASCADE;
DROP TABLE IF EXISTS especificaciones_periferico CASCADE;
DROP TABLE IF EXISTS especificaciones_monitor CASCADE;
DROP TABLE IF EXISTS especificaciones_gabinete CASCADE;
DROP TABLE IF EXISTS especificaciones_almacenamiento CASCADE;
DROP TABLE IF EXISTS especificaciones_fuente_poder CASCADE;
DROP TABLE IF EXISTS especificaciones_tarjeta_grafica CASCADE;
DROP TABLE IF EXISTS especificaciones_memoria_ram CASCADE;
DROP TABLE IF EXISTS especificaciones_procesador CASCADE;
DROP TABLE IF EXISTS especificaciones_placa_madre CASCADE;
DROP TABLE IF EXISTS productos CASCADE;
DROP TABLE IF EXISTS marcas CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;

CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE,
    descripcion TEXT
);

CREATE TABLE marcas (
    id_marca SERIAL PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE productos (
    id_producto SERIAL PRIMARY KEY,
    id_categoria INT NOT NULL REFERENCES categorias(id_categoria),
    id_marca INT NOT NULL REFERENCES marcas(id_marca),
    nombre VARCHAR(150) NOT NULL,
    modelo VARCHAR(120) NOT NULL,
    descripcion TEXT,
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    garantia_meses INT NOT NULL DEFAULT 12 CHECK (garantia_meses >= 0),
    estado VARCHAR(20) NOT NULL DEFAULT 'disponible',
    fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_producto_modelo UNIQUE (id_marca, modelo),
    CONSTRAINT chk_estado_producto CHECK (
        estado IN ('disponible', 'agotado', 'descontinuado')
    )
);

CREATE TABLE especificaciones_placa_madre (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    socket_cpu VARCHAR(40) NOT NULL,
    chipset VARCHAR(60),
    tipo_ram VARCHAR(20) NOT NULL,
    slots_ram INT NOT NULL CHECK (slots_ram > 0),
    ram_max_gb INT NOT NULL CHECK (ram_max_gb > 0),
    formato VARCHAR(40) NOT NULL,
    pcie_version VARCHAR(20),
    conectores_m2 INT DEFAULT 0 CHECK (conectores_m2 >= 0),
    soporta_wifi BOOLEAN DEFAULT FALSE
);

CREATE TABLE especificaciones_procesador (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    socket_cpu VARCHAR(40) NOT NULL,
    nucleos INT NOT NULL CHECK (nucleos > 0),
    hilos INT NOT NULL CHECK (hilos >= nucleos),
    frecuencia_base_ghz NUMERIC(4, 2) NOT NULL CHECK (frecuencia_base_ghz > 0),
    frecuencia_turbo_ghz NUMERIC(4, 2),
    tdp_w INT NOT NULL CHECK (tdp_w > 0),
    tiene_grafica_integrada BOOLEAN DEFAULT FALSE
);

CREATE TABLE especificaciones_memoria_ram (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    tipo_ram VARCHAR(20) NOT NULL,
    capacidad_gb INT NOT NULL CHECK (capacidad_gb > 0),
    modulos INT NOT NULL DEFAULT 1 CHECK (modulos > 0),
    velocidad_mhz INT NOT NULL CHECK (velocidad_mhz > 0),
    latencia VARCHAR(20)
);

CREATE TABLE especificaciones_tarjeta_grafica (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    memoria_vram_gb INT NOT NULL CHECK (memoria_vram_gb > 0),
    tipo_vram VARCHAR(30),
    pcie_version VARCHAR(20),
    consumo_recomendado_w INT NOT NULL CHECK (consumo_recomendado_w > 0),
    conectores_energia VARCHAR(80),
    largo_mm INT CHECK (largo_mm > 0)
);

CREATE TABLE especificaciones_fuente_poder (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    potencia_w INT NOT NULL CHECK (potencia_w > 0),
    certificacion VARCHAR(40),
    modularidad VARCHAR(30),
    formato VARCHAR(30) NOT NULL DEFAULT 'ATX',
    conectores_pcie INT DEFAULT 0 CHECK (conectores_pcie >= 0)
);

CREATE TABLE especificaciones_almacenamiento (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    tipo VARCHAR(30) NOT NULL,
    capacidad_gb INT NOT NULL CHECK (capacidad_gb > 0),
    interfaz VARCHAR(40) NOT NULL,
    formato VARCHAR(40),
    velocidad_lectura_mbps INT CHECK (velocidad_lectura_mbps >= 0),
    velocidad_escritura_mbps INT CHECK (velocidad_escritura_mbps >= 0)
);

CREATE TABLE especificaciones_gabinete (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    formato_soportado VARCHAR(80) NOT NULL,
    largo_gpu_max_mm INT CHECK (largo_gpu_max_mm > 0),
    altura_disipador_max_mm INT CHECK (altura_disipador_max_mm > 0),
    bahias_25 INT DEFAULT 0 CHECK (bahias_25 >= 0),
    bahias_35 INT DEFAULT 0 CHECK (bahias_35 >= 0)
);

CREATE TABLE especificaciones_monitor (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    pulgadas NUMERIC(4, 1) NOT NULL CHECK (pulgadas > 0),
    resolucion VARCHAR(40) NOT NULL,
    tasa_refresco_hz INT NOT NULL CHECK (tasa_refresco_hz > 0),
    tipo_panel VARCHAR(30),
    conectividad VARCHAR(120)
);

CREATE TABLE especificaciones_periferico (
    id_producto INT PRIMARY KEY REFERENCES productos(id_producto) ON DELETE CASCADE,
    tipo_periferico VARCHAR(50) NOT NULL,
    conexion VARCHAR(50) NOT NULL,
    es_rgb BOOLEAN DEFAULT FALSE
);

-- Tabla opcional para explicar reglas simples al agente.
CREATE TABLE compatibilidades_componentes (
    id_compatibilidad SERIAL PRIMARY KEY,
    categoria_origen VARCHAR(80) NOT NULL,
    categoria_destino VARCHAR(80) NOT NULL,
    regla VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL
);

CREATE TABLE carritos (
    id_carrito SERIAL PRIMARY KEY,
    identificador_sesion VARCHAR(120) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
    fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_estado_carrito CHECK (estado IN ('abierto', 'cerrado', 'cancelado'))
);

CREATE TABLE carrito_items (
    id_item SERIAL PRIMARY KEY,
    id_carrito INT NOT NULL REFERENCES carritos(id_carrito) ON DELETE CASCADE,
    id_producto INT NOT NULL REFERENCES productos(id_producto),
    cantidad INT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario >= 0),
    fecha_agregado TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO categorias (nombre, descripcion) VALUES
('Placa madre', 'Tarjeta principal donde se conectan CPU, RAM, almacenamiento y GPU.'),
('Procesador', 'CPU encargada del procesamiento principal del computador.'),
('Memoria RAM', 'Memoria volatil para ejecucion de programas.'),
('Tarjeta grafica', 'GPU dedicada para videojuegos, diseno, edicion y renderizado.'),
('Fuente de poder', 'Unidad que entrega energia electrica a los componentes.'),
('Almacenamiento', 'Discos SSD o HDD para guardar sistema operativo, juegos y archivos.'),
('Gabinete', 'Chasis donde se instalan los componentes.'),
('Monitor', 'Pantalla para salida de video.'),
('Periferico', 'Teclados, mouse, audifonos y otros accesorios.');

INSERT INTO marcas (nombre) VALUES
('ASUS'), ('MSI'), ('Gigabyte'), ('Intel'), ('AMD'), ('Kingston'), ('Corsair'),
('NVIDIA'), ('Western Digital'), ('Samsung'), ('Cooler Master'), ('Logitech'),
('AOC'), ('Seagate'), ('EVGA');

INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(1, 1, 'ASUS Prime B550M-A', 'PRIME-B550M-A', 'Placa madre AMD AM4 con DDR4 y formato Micro ATX.', 119.99, 8, 24, 'disponible'),
(1, 2, 'MSI PRO B760M-A DDR4', 'PRO-B760M-A-DDR4', 'Placa madre Intel LGA1700 con DDR4 y formato Micro ATX.', 139.99, 6, 24, 'disponible'),
(1, 3, 'Gigabyte B650 AORUS Elite AX', 'B650-AORUS-ELITE-AX', 'Placa madre AMD AM5 con DDR5, WiFi y formato ATX.', 219.99, 5, 36, 'disponible'),
(2, 5, 'AMD Ryzen 5 5600X', '100-100000065BOX', 'Procesador AM4 de 6 nucleos ideal para gaming gama media.', 159.99, 12, 36, 'disponible'),
(2, 4, 'Intel Core i5-12400F', 'BX8071512400F', 'Procesador LGA1700 de 6 nucleos sin grafica integrada.', 149.99, 10, 36, 'disponible'),
(2, 5, 'AMD Ryzen 7 7700X', '100-100000591WOF', 'Procesador AM5 de alto rendimiento para gaming y productividad.', 329.99, 7, 36, 'disponible'),
(3, 6, 'Kingston Fury Beast 16GB DDR4', 'KF432C16BBK2-16', 'Kit de memoria RAM 2x8GB DDR4 3200MHz.', 49.99, 20, 60, 'disponible'),
(3, 7, 'Corsair Vengeance 32GB DDR5', 'CMK32GX5M2B5600C36', 'Kit de memoria RAM 2x16GB DDR5 5600MHz.', 109.99, 14, 60, 'disponible'),
(4, 8, 'NVIDIA GeForce RTX 4060 8GB', 'RTX-4060-8GB', 'Tarjeta grafica eficiente para 1080p y 1440p ligero.', 299.99, 9, 24, 'disponible'),
(4, 5, 'AMD Radeon RX 7800 XT 16GB', 'RX-7800-XT-16GB', 'Tarjeta grafica potente para 1440p.', 499.99, 4, 24, 'disponible'),
(5, 7, 'Corsair CX650 80 Plus Bronze', 'CP-9020278', 'Fuente de poder ATX de 650W con certificacion Bronze.', 74.99, 15, 36, 'disponible'),
(5, 15, 'EVGA SuperNOVA 750 G5', '220-G5-0750-X1', 'Fuente de poder ATX de 750W modular 80 Plus Gold.', 129.99, 8, 60, 'disponible'),
(6, 10, 'Samsung 980 1TB NVMe', 'MZ-V8V1T0B', 'SSD NVMe M.2 de 1TB para sistema y juegos.', 79.99, 18, 36, 'disponible'),
(6, 14, 'Seagate Barracuda 2TB HDD', 'ST2000DM008', 'Disco duro SATA de 2TB para almacenamiento masivo.', 54.99, 16, 24, 'disponible'),
(7, 11, 'Cooler Master MasterBox Q300L', 'MCB-Q300L-KANN-S00', 'Gabinete Micro ATX compacto con buen flujo de aire.', 59.99, 11, 12, 'disponible'),
(7, 7, 'Corsair 4000D Airflow', 'CC-9011200-WW', 'Gabinete ATX con alto flujo de aire.', 104.99, 6, 24, 'disponible'),
(8, 13, 'AOC 24G2 24 pulgadas', '24G2', 'Monitor Full HD IPS de 144Hz para gaming.', 179.99, 7, 24, 'disponible'),
(9, 12, 'Logitech G203 Lightsync', 'G203-LIGHTSNYC', 'Mouse gamer alambrico con RGB.', 29.99, 25, 12, 'disponible');

INSERT INTO especificaciones_placa_madre VALUES
(1, 'AM4', 'B550', 'DDR4', 4, 128, 'Micro ATX', 'PCIe 4.0', 1, FALSE),
(2, 'LGA1700', 'B760', 'DDR4', 4, 128, 'Micro ATX', 'PCIe 4.0', 2, FALSE),
(3, 'AM5', 'B650', 'DDR5', 4, 192, 'ATX', 'PCIe 4.0', 3, TRUE);

INSERT INTO especificaciones_procesador VALUES
(4, 'AM4', 6, 12, 3.70, 4.60, 65, FALSE),
(5, 'LGA1700', 6, 12, 2.50, 4.40, 65, FALSE),
(6, 'AM5', 8, 16, 4.50, 5.40, 105, TRUE);

INSERT INTO especificaciones_memoria_ram VALUES
(7, 'DDR4', 16, 2, 3200, 'CL16'),
(8, 'DDR5', 32, 2, 5600, 'CL36');

INSERT INTO especificaciones_tarjeta_grafica VALUES
(9, 8, 'GDDR6', 'PCIe 4.0', 550, '1x 8-pin', 244),
(10, 16, 'GDDR6', 'PCIe 4.0', 700, '2x 8-pin', 267);

INSERT INTO especificaciones_fuente_poder VALUES
(11, 650, '80 Plus Bronze', 'No modular', 'ATX', 2),
(12, 750, '80 Plus Gold', 'Full modular', 'ATX', 4);

INSERT INTO especificaciones_almacenamiento VALUES
(13, 'SSD', 1000, 'NVMe PCIe', 'M.2 2280', 3500, 3000),
(14, 'HDD', 2000, 'SATA III', '3.5 pulgadas', 220, 200);

INSERT INTO especificaciones_gabinete VALUES
(15, 'Micro ATX, Mini ITX', 360, 159, 2, 1),
(16, 'ATX, Micro ATX, Mini ITX', 360, 170, 2, 2);

INSERT INTO especificaciones_monitor VALUES
(17, 24.0, '1920x1080', 144, 'IPS', 'HDMI, DisplayPort');

INSERT INTO especificaciones_periferico VALUES
(18, 'Mouse', 'USB', TRUE);

INSERT INTO compatibilidades_componentes
(categoria_origen, categoria_destino, regla, descripcion)
VALUES
('Procesador', 'Placa madre', 'socket_cpu igual', 'El socket del procesador debe coincidir con el socket de la placa madre.'),
('Memoria RAM', 'Placa madre', 'tipo_ram igual', 'El tipo de memoria RAM debe coincidir con el tipo soportado por la placa madre, por ejemplo DDR4 o DDR5.'),
('Tarjeta grafica', 'Fuente de poder', 'potencia_w >= consumo_recomendado_w', 'La fuente debe cumplir o superar la potencia recomendada por la tarjeta grafica.'),
('Tarjeta grafica', 'Gabinete', 'largo_gpu_max_mm >= largo_mm', 'El gabinete debe tener espacio suficiente para el largo fisico de la tarjeta grafica.'),
('Placa madre', 'Gabinete', 'formato soportado', 'El gabinete debe soportar el formato de la placa madre, por ejemplo ATX o Micro ATX.'),
('Almacenamiento', 'Placa madre', 'interfaz compatible', 'Los SSD M.2 NVMe requieren una placa madre con conector M.2; los discos SATA requieren puertos SATA.');

CREATE OR REPLACE VIEW vista_catalogo_agente AS
SELECT
    p.id_producto,
    c.nombre AS categoria,
    m.nombre AS marca,
    p.nombre,
    p.modelo,
    p.descripcion,
    p.precio,
    p.stock,
    p.garantia_meses,
    p.estado,
    pm.socket_cpu AS placa_socket_cpu,
    pm.tipo_ram AS placa_tipo_ram,
    pm.formato AS placa_formato,
    pm.ram_max_gb AS placa_ram_max_gb,
    pm.conectores_m2 AS placa_conectores_m2,
    cpu.socket_cpu AS cpu_socket_cpu,
    cpu.nucleos AS cpu_nucleos,
    cpu.hilos AS cpu_hilos,
    cpu.tdp_w AS cpu_tdp_w,
    ram.tipo_ram AS ram_tipo,
    ram.capacidad_gb AS ram_capacidad_gb,
    ram.velocidad_mhz AS ram_velocidad_mhz,
    gpu.memoria_vram_gb AS gpu_vram_gb,
    gpu.consumo_recomendado_w AS gpu_consumo_recomendado_w,
    gpu.largo_mm AS gpu_largo_mm,
    psu.potencia_w AS fuente_potencia_w,
    psu.certificacion AS fuente_certificacion,
    alm.tipo AS almacenamiento_tipo,
    alm.capacidad_gb AS almacenamiento_capacidad_gb,
    alm.interfaz AS almacenamiento_interfaz,
    gab.formato_soportado AS gabinete_formato_soportado,
    gab.largo_gpu_max_mm AS gabinete_largo_gpu_max_mm,
    mon.pulgadas AS monitor_pulgadas,
    mon.resolucion AS monitor_resolucion,
    mon.tasa_refresco_hz AS monitor_tasa_refresco_hz,
    per.tipo_periferico,
    per.conexion AS periferico_conexion
FROM productos p
JOIN categorias c ON c.id_categoria = p.id_categoria
JOIN marcas m ON m.id_marca = p.id_marca
LEFT JOIN especificaciones_placa_madre pm ON pm.id_producto = p.id_producto
LEFT JOIN especificaciones_procesador cpu ON cpu.id_producto = p.id_producto
LEFT JOIN especificaciones_memoria_ram ram ON ram.id_producto = p.id_producto
LEFT JOIN especificaciones_tarjeta_grafica gpu ON gpu.id_producto = p.id_producto
LEFT JOIN especificaciones_fuente_poder psu ON psu.id_producto = p.id_producto
LEFT JOIN especificaciones_almacenamiento alm ON alm.id_producto = p.id_producto
LEFT JOIN especificaciones_gabinete gab ON gab.id_producto = p.id_producto
LEFT JOIN especificaciones_monitor mon ON mon.id_producto = p.id_producto
LEFT JOIN especificaciones_periferico per ON per.id_producto = p.id_producto;

-- Consultas utiles para el agente LLM.

-- 1. Placas madre compatibles con un procesador especifico.
-- Cambiar el id_producto del procesador en el WHERE.
/*
SELECT cpu.nombre AS procesador, pm.nombre AS placa_madre
FROM productos cpu
JOIN especificaciones_procesador ecpu ON ecpu.id_producto = cpu.id_producto
JOIN especificaciones_placa_madre epm ON epm.socket_cpu = ecpu.socket_cpu
JOIN productos pm ON pm.id_producto = epm.id_producto
WHERE cpu.id_producto = 4;
*/

-- 2. Memorias RAM compatibles con una placa madre especifica.
/*
SELECT placa.nombre AS placa_madre, ram.nombre AS memoria_ram
FROM productos placa
JOIN especificaciones_placa_madre epm ON epm.id_producto = placa.id_producto
JOIN especificaciones_memoria_ram eram ON eram.tipo_ram = epm.tipo_ram
JOIN productos ram ON ram.id_producto = eram.id_producto
WHERE placa.id_producto = 1;
*/

-- 3. Fuentes compatibles con una tarjeta grafica especifica.
/*
SELECT gpu.nombre AS tarjeta_grafica, fuente.nombre AS fuente_poder
FROM productos gpu
JOIN especificaciones_tarjeta_grafica egpu ON egpu.id_producto = gpu.id_producto
JOIN especificaciones_fuente_poder epsu ON epsu.potencia_w >= egpu.consumo_recomendado_w
JOIN productos fuente ON fuente.id_producto = epsu.id_producto
WHERE gpu.id_producto = 9;
*/

-- 4. Armados basicos compatibles: CPU + placa + RAM + GPU + fuente + gabinete.
/*
SELECT
    cpu.nombre AS procesador,
    placa.nombre AS placa_madre,
    ram.nombre AS memoria_ram,
    gpu.nombre AS tarjeta_grafica,
    fuente.nombre AS fuente_poder,
    gabinete.nombre AS gabinete,
    (cpu.precio + placa.precio + ram.precio + gpu.precio + fuente.precio + gabinete.precio) AS precio_total
FROM productos cpu
JOIN especificaciones_procesador ecpu ON ecpu.id_producto = cpu.id_producto
JOIN especificaciones_placa_madre eplaca ON eplaca.socket_cpu = ecpu.socket_cpu
JOIN productos placa ON placa.id_producto = eplaca.id_producto
JOIN especificaciones_memoria_ram eram ON eram.tipo_ram = eplaca.tipo_ram
JOIN productos ram ON ram.id_producto = eram.id_producto
JOIN productos gpu ON gpu.id_categoria = (SELECT id_categoria FROM categorias WHERE nombre = 'Tarjeta grafica')
JOIN especificaciones_tarjeta_grafica egpu ON egpu.id_producto = gpu.id_producto
JOIN especificaciones_fuente_poder efuente ON efuente.potencia_w >= egpu.consumo_recomendado_w
JOIN productos fuente ON fuente.id_producto = efuente.id_producto
JOIN especificaciones_gabinete egab ON EXISTS (
        SELECT 1
        FROM unnest(string_to_array(egab.formato_soportado, ',')) AS formato_gabinete
        WHERE trim(formato_gabinete) = eplaca.formato
    )
    AND egab.largo_gpu_max_mm >= egpu.largo_mm
JOIN productos gabinete ON gabinete.id_producto = egab.id_producto
WHERE cpu.estado = 'disponible'
  AND placa.estado = 'disponible'
  AND ram.estado = 'disponible'
  AND gpu.estado = 'disponible'
  AND fuente.estado = 'disponible'
  AND gabinete.estado = 'disponible'
ORDER BY precio_total;
*/
