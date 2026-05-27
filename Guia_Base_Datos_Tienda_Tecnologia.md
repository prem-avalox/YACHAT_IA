# Guia completa de la base de datos de tienda de tecnologia

## 1. Proposito del proyecto

Esta base de datos fue creada para una tienda de tecnologia que vende componentes de computador y accesorios. Su objetivo principal no es solamente guardar productos, sino organizar la informacion tecnica necesaria para que un agente de inteligencia artificial pueda recomendar componentes compatibles.

La base de datos permite responder preguntas como:

- Que procesador es compatible con determinada placa madre.
- Que memoria RAM funciona con una placa madre.
- Que fuente de poder necesita una tarjeta grafica.
- Que gabinete puede alojar una placa madre y una tarjeta grafica.
- Que combinacion de componentes puede formar una PC completa.

En resumen, la base de datos guarda la informacion y el agente LLM la interpreta para recomendar productos.

## 2. Idea general de funcionamiento

La base de datos esta organizada alrededor de una tabla principal llamada `productos`.

Esa tabla guarda la informacion comun de todos los productos, por ejemplo:

- Nombre del producto.
- Modelo.
- Marca.
- Categoria.
- Precio.
- Stock.
- Garantia.
- Estado del producto.

Pero cada tipo de componente tiene caracteristicas tecnicas distintas. Por ejemplo, un procesador tiene socket, nucleos e hilos; una placa madre tiene socket, tipo de RAM y formato; una tarjeta grafica tiene VRAM, consumo recomendado y largo fisico.

Por esa razon, la base de datos separa la informacion en dos niveles:

1. Informacion general del producto en `productos`.
2. Informacion tecnica en una tabla de especificaciones segun la categoria.

Ejemplo:

Un procesador Ryzen 5 se guarda primero en `productos`. Luego sus datos tecnicos se guardan en `especificaciones_procesador`.

## 3. Tablas principales

### 3.1. Tabla `categorias`

Guarda los tipos de productos que existen en la tienda.

Ejemplos:

- Placa madre.
- Procesador.
- Memoria RAM.
- Tarjeta grafica.
- Fuente de poder.
- Almacenamiento.
- Gabinete.
- Monitor.
- Periferico.

Campos importantes:

- `id_categoria`: identificador unico de la categoria.
- `nombre`: nombre de la categoria.
- `descripcion`: explicacion de la categoria.

Esta tabla evita escribir manualmente el nombre de la categoria en cada producto.

### 3.2. Tabla `marcas`

Guarda las marcas disponibles.

Ejemplos:

- ASUS.
- MSI.
- Gigabyte.
- Intel.
- AMD.
- Kingston.
- Corsair.
- Samsung.
- Logitech.

Campos importantes:

- `id_marca`: identificador unico de la marca.
- `nombre`: nombre de la marca.

Esta tabla evita repetir marcas y ayuda a mantener los datos ordenados.

### 3.3. Tabla `productos`

Es la tabla central de la base de datos. Todo producto debe existir primero aqui.

Campos importantes:

- `id_producto`: identificador unico del producto.
- `id_categoria`: categoria a la que pertenece el producto.
- `id_marca`: marca del producto.
- `nombre`: nombre comercial.
- `modelo`: modelo exacto del producto.
- `descripcion`: descripcion corta.
- `precio`: precio del producto.
- `stock`: cantidad disponible.
- `garantia_meses`: garantia en meses.
- `estado`: puede ser `disponible`, `agotado` o `descontinuado`.
- `fecha_registro`: fecha en la que se registro el producto.

La tabla `productos` se conecta con `categorias` y `marcas` mediante claves foraneas.

Ejemplo de producto:

```sql
AMD Ryzen 5 5600X
Categoria: Procesador
Marca: AMD
Precio: 159.99
Stock: 12
Estado: disponible
```

## 4. Tablas de especificaciones tecnicas

Las tablas de especificaciones guardan la informacion tecnica de cada tipo de componente. Todas usan `id_producto` como clave principal y tambien como conexion hacia `productos`.

Esto significa que un producto no se repite: existe una vez en `productos` y una vez en su tabla tecnica correspondiente.

### 4.1. `especificaciones_placa_madre`

Guarda las caracteristicas tecnicas de las placas madre.

Campos principales:

- `id_producto`: producto asociado.
- `socket_cpu`: socket compatible con procesadores, por ejemplo `AM4`, `AM5` o `LGA1700`.
- `chipset`: chipset de la placa, por ejemplo `B550`, `B650` o `B760`.
- `tipo_ram`: tipo de memoria compatible, por ejemplo `DDR4` o `DDR5`.
- `slots_ram`: cantidad de ranuras de memoria.
- `ram_max_gb`: capacidad maxima de RAM soportada.
- `formato`: formato fisico, por ejemplo `ATX` o `Micro ATX`.
- `pcie_version`: version PCIe.
- `conectores_m2`: cantidad de conectores M.2.
- `soporta_wifi`: indica si tiene WiFi integrado.

Esta tabla es muy importante porque conecta con procesador, RAM, almacenamiento y gabinete.

### 4.2. `especificaciones_procesador`

Guarda las caracteristicas tecnicas de los procesadores.

Campos principales:

- `id_producto`: producto asociado.
- `socket_cpu`: socket del procesador.
- `nucleos`: cantidad de nucleos.
- `hilos`: cantidad de hilos.
- `frecuencia_base_ghz`: frecuencia base.
- `frecuencia_turbo_ghz`: frecuencia maxima turbo.
- `tdp_w`: consumo aproximado en watts.
- `tiene_grafica_integrada`: indica si tiene grafica integrada.

El campo mas importante para compatibilidad es `socket_cpu`, porque debe coincidir con el socket de la placa madre.

### 4.3. `especificaciones_memoria_ram`

Guarda las caracteristicas de las memorias RAM.

Campos principales:

- `id_producto`: producto asociado.
- `tipo_ram`: tipo de memoria, por ejemplo `DDR4` o `DDR5`.
- `capacidad_gb`: capacidad total.
- `modulos`: cantidad de modulos incluidos.
- `velocidad_mhz`: velocidad de la RAM.
- `latencia`: latencia, por ejemplo `CL16` o `CL36`.

El campo mas importante para compatibilidad es `tipo_ram`, porque debe coincidir con el tipo de RAM soportado por la placa madre.

### 4.4. `especificaciones_tarjeta_grafica`

Guarda las caracteristicas de las tarjetas graficas.

Campos principales:

- `id_producto`: producto asociado.
- `memoria_vram_gb`: cantidad de memoria de video.
- `tipo_vram`: tipo de memoria grafica, por ejemplo `GDDR6`.
- `pcie_version`: version PCIe.
- `consumo_recomendado_w`: potencia recomendada de fuente.
- `conectores_energia`: conectores necesarios.
- `largo_mm`: largo fisico de la tarjeta.

Los campos mas importantes para compatibilidad son:

- `consumo_recomendado_w`, para elegir fuente.
- `largo_mm`, para verificar si entra en el gabinete.

### 4.5. `especificaciones_fuente_poder`

Guarda las caracteristicas de las fuentes de poder.

Campos principales:

- `id_producto`: producto asociado.
- `potencia_w`: potencia de la fuente en watts.
- `certificacion`: certificacion, por ejemplo `80 Plus Bronze` o `80 Plus Gold`.
- `modularidad`: tipo de cableado.
- `formato`: formato de la fuente, normalmente `ATX`.
- `conectores_pcie`: cantidad de conectores PCIe para tarjetas graficas.

El campo mas importante para compatibilidad es `potencia_w`, porque debe ser suficiente para la tarjeta grafica.

### 4.6. `especificaciones_almacenamiento`

Guarda las caracteristicas de SSD y HDD.

Campos principales:

- `id_producto`: producto asociado.
- `tipo`: tipo de disco, por ejemplo `SSD` o `HDD`.
- `capacidad_gb`: capacidad.
- `interfaz`: interfaz, por ejemplo `NVMe PCIe` o `SATA III`.
- `formato`: formato fisico, por ejemplo `M.2 2280` o `3.5 pulgadas`.
- `velocidad_lectura_mbps`: velocidad de lectura.
- `velocidad_escritura_mbps`: velocidad de escritura.

Para compatibilidad se revisa principalmente si la placa madre tiene conectores para el tipo de almacenamiento.

### 4.7. `especificaciones_gabinete`

Guarda las caracteristicas de los gabinetes.

Campos principales:

- `id_producto`: producto asociado.
- `formato_soportado`: formatos de placa soportados, por ejemplo `ATX, Micro ATX, Mini ITX`.
- `largo_gpu_max_mm`: largo maximo de tarjeta grafica permitido.
- `altura_disipador_max_mm`: altura maxima del disipador.
- `bahias_25`: bahias para discos de 2.5 pulgadas.
- `bahias_35`: bahias para discos de 3.5 pulgadas.

Esta tabla sirve para validar si la placa madre y la tarjeta grafica entran fisicamente en el gabinete.

### 4.8. `especificaciones_monitor`

Guarda caracteristicas de monitores.

Campos principales:

- `id_producto`: producto asociado.
- `pulgadas`: tamano de pantalla.
- `resolucion`: resolucion.
- `tasa_refresco_hz`: frecuencia de refresco.
- `tipo_panel`: tipo de panel.
- `conectividad`: entradas disponibles.

Los monitores no afectan directamente la compatibilidad interna del computador, pero ayudan al agente a recomendar pantallas segun el uso del cliente.

### 4.9. `especificaciones_periferico`

Guarda caracteristicas de perifericos como mouse, teclado o audifonos.

Campos principales:

- `id_producto`: producto asociado.
- `tipo_periferico`: tipo de periferico.
- `conexion`: tipo de conexion, por ejemplo `USB`, `Bluetooth` o `Wireless`.
- `es_rgb`: indica si tiene iluminacion RGB.

## 5. Tabla de compatibilidades

### 5.1. `compatibilidades_componentes`

Esta tabla guarda reglas escritas en lenguaje simple para explicar al agente y a los desarrolladores como se determina la compatibilidad.

Campos principales:

- `id_compatibilidad`: identificador de la regla.
- `categoria_origen`: componente desde el que parte la regla.
- `categoria_destino`: componente con el que se compara.
- `regla`: condicion tecnica resumida.
- `descripcion`: explicacion de la regla.

Ejemplos de reglas:

```text
Procesador -> Placa madre
Regla: socket_cpu igual
Descripcion: El socket del procesador debe coincidir con el socket de la placa madre.
```

```text
Memoria RAM -> Placa madre
Regla: tipo_ram igual
Descripcion: El tipo de memoria RAM debe coincidir con el tipo soportado por la placa madre.
```

```text
Tarjeta grafica -> Fuente de poder
Regla: potencia_w >= consumo_recomendado_w
Descripcion: La fuente debe cumplir o superar la potencia recomendada por la tarjeta grafica.
```

Esta tabla no reemplaza las consultas SQL. Su funcion es documentar las reglas para que el sistema y el agente sepan como razonar.

## 6. Compatibilidad entre componentes

### 6.1. Procesador y placa madre

Un procesador es compatible con una placa madre si ambos tienen el mismo `socket_cpu`.

Ejemplo:

```text
Procesador: AMD Ryzen 5 5600X
socket_cpu: AM4

Placa madre: ASUS Prime B550M-A
socket_cpu: AM4

Resultado: compatible
```

Consulta ejemplo:

```sql
SELECT cpu.nombre AS procesador, placa.nombre AS placa_madre
FROM productos cpu
JOIN especificaciones_procesador ecpu ON ecpu.id_producto = cpu.id_producto
JOIN especificaciones_placa_madre eplaca ON eplaca.socket_cpu = ecpu.socket_cpu
JOIN productos placa ON placa.id_producto = eplaca.id_producto
WHERE cpu.id_producto = 4;
```

### 6.2. Memoria RAM y placa madre

Una memoria RAM es compatible con una placa madre si ambas usan el mismo `tipo_ram`.

Ejemplo:

```text
RAM: Kingston Fury Beast 16GB DDR4
tipo_ram: DDR4

Placa madre: ASUS Prime B550M-A
tipo_ram: DDR4

Resultado: compatible
```

Consulta ejemplo:

```sql
SELECT placa.nombre AS placa_madre, ram.nombre AS memoria_ram
FROM productos placa
JOIN especificaciones_placa_madre eplaca ON eplaca.id_producto = placa.id_producto
JOIN especificaciones_memoria_ram eram ON eram.tipo_ram = eplaca.tipo_ram
JOIN productos ram ON ram.id_producto = eram.id_producto
WHERE placa.id_producto = 1;
```

### 6.3. Tarjeta grafica y fuente de poder

Una fuente es compatible con una tarjeta grafica si la potencia de la fuente es mayor o igual al consumo recomendado por la grafica.

Ejemplo:

```text
GPU: NVIDIA RTX 4060
consumo_recomendado_w: 550

Fuente: Corsair CX650
potencia_w: 650

Resultado: compatible
```

Consulta ejemplo:

```sql
SELECT gpu.nombre AS tarjeta_grafica, fuente.nombre AS fuente_poder
FROM productos gpu
JOIN especificaciones_tarjeta_grafica egpu ON egpu.id_producto = gpu.id_producto
JOIN especificaciones_fuente_poder efuente ON efuente.potencia_w >= egpu.consumo_recomendado_w
JOIN productos fuente ON fuente.id_producto = efuente.id_producto
WHERE gpu.id_producto = 9;
```

### 6.4. Tarjeta grafica y gabinete

Una tarjeta grafica es compatible con un gabinete si el largo maximo permitido por el gabinete es mayor o igual al largo de la tarjeta.

Ejemplo:

```text
GPU: RTX 4060
largo_mm: 244

Gabinete: Cooler Master MasterBox Q300L
largo_gpu_max_mm: 360

Resultado: compatible
```

### 6.5. Placa madre y gabinete

Una placa madre es compatible con un gabinete si el gabinete soporta el formato de la placa.

Ejemplo:

```text
Placa madre: Micro ATX
Gabinete soporta: Micro ATX, Mini ITX

Resultado: compatible
```

## 7. Vista para el agente

### 7.1. `vista_catalogo_agente`

La vista `vista_catalogo_agente` une la informacion de varias tablas en una sola consulta.

Esto es importante porque el agente LLM necesita consultar el catalogo de forma simple. En vez de hacer muchos `JOIN` cada vez, puede consultar la vista.

Consulta:

```sql
SELECT * FROM vista_catalogo_agente;
```

La vista incluye:

- Datos generales del producto.
- Categoria.
- Marca.
- Precio.
- Stock.
- Estado.
- Especificaciones de placa madre.
- Especificaciones de procesador.
- Especificaciones de RAM.
- Especificaciones de GPU.
- Especificaciones de fuente.
- Especificaciones de almacenamiento.
- Especificaciones de gabinete.
- Especificaciones de monitor.
- Especificaciones de periferico.

Esta vista funciona como una version resumida y completa del catalogo para el agente.

## 8. Como el agente LLM entiende la base de datos

El agente LLM no "adivina" la compatibilidad. El agente sigue un proceso basado en los datos guardados.

Cuando un cliente escribe algo como:

```text
Quiero una PC gamer economica con Ryzen 5.
```

El agente puede seguir estos pasos:

1. Identifica la intencion del usuario.
   - El cliente quiere una PC gamer.
   - El cliente quiere que sea economica.
   - El cliente menciona Ryzen 5.

2. Busca productos relacionados.
   - Busca procesadores cuyo nombre contenga `Ryzen 5`.
   - Revisa que esten disponibles.
   - Revisa el precio y stock.

3. Lee las especificaciones tecnicas.
   - Obtiene el `socket_cpu` del procesador.
   - Por ejemplo, `AM4`.

4. Busca una placa madre compatible.
   - Busca placas madre con el mismo `socket_cpu`.
   - Si el procesador es `AM4`, busca placas `AM4`.

5. Busca memoria RAM compatible.
   - Revisa el `tipo_ram` de la placa madre.
   - Si la placa usa `DDR4`, busca RAM `DDR4`.

6. Selecciona una tarjeta grafica.
   - Puede elegir una grafica disponible segun presupuesto y uso.

7. Valida la fuente de poder.
   - Compara `potencia_w` de la fuente con `consumo_recomendado_w` de la grafica.

8. Valida el gabinete.
   - Comprueba que soporte el formato de la placa madre.
   - Comprueba que tenga espacio para la tarjeta grafica.

9. Calcula el precio aproximado.
   - Suma los precios de los componentes seleccionados.

10. Responde al cliente.
   - Presenta una recomendacion clara.
   - Explica por que los componentes son compatibles.
   - Puede ofrecer alternativas si el presupuesto no alcanza.

## 9. Ejemplo completo de armado compatible

Una consulta para generar combinaciones basicas compatibles puede ser:

```sql
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
```

Esta consulta combina:

- CPU compatible con placa.
- RAM compatible con placa.
- GPU disponible.
- Fuente suficiente para la GPU.
- Gabinete compatible con placa y GPU.

El resultado puede ser usado por el agente para recomendar una PC completa.

## 10. Como ingresar nuevos datos

Para agregar un nuevo componente se deben seguir dos pasos obligatorios.

### Paso 1: insertar el producto general

Ejemplo para agregar un nuevo procesador:

```sql
INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(2, 5, 'AMD Ryzen 5 7600', '100-100001015BOX',
'Procesador AM5 de 6 nucleos para gaming y productividad.',
229.99, 10, 36, 'disponible')
RETURNING id_producto;
```

El `RETURNING id_producto` muestra el ID que PostgreSQL asigno al producto. Ese ID se usa en la tabla de especificaciones.

### Paso 2: insertar las especificaciones tecnicas

Ejemplo:

```sql
INSERT INTO especificaciones_procesador
(id_producto, socket_cpu, nucleos, hilos, frecuencia_base_ghz, frecuencia_turbo_ghz, tdp_w, tiene_grafica_integrada)
VALUES
(19, 'AM5', 6, 12, 3.80, 5.10, 65, TRUE);
```

Importante: el numero `19` debe reemplazarse por el `id_producto` real que devolvio el paso anterior.

## 11. Ejemplos para ingresar productos por categoria

### 11.1. Nueva placa madre

```sql
INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(1, 1, 'ASUS TUF Gaming B650M-PLUS', 'TUF-B650M-PLUS',
'Placa madre AM5 con DDR5 y formato Micro ATX.',
189.99, 6, 36, 'disponible')
RETURNING id_producto;
```

```sql
INSERT INTO especificaciones_placa_madre
(id_producto, socket_cpu, chipset, tipo_ram, slots_ram, ram_max_gb, formato, pcie_version, conectores_m2, soporta_wifi)
VALUES
(20, 'AM5', 'B650', 'DDR5', 4, 128, 'Micro ATX', 'PCIe 4.0', 2, FALSE);
```

### 11.2. Nueva memoria RAM

```sql
INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(3, 7, 'Corsair Vengeance 16GB DDR5', 'CMK16GX5M2B5600C36',
'Kit de memoria RAM 2x8GB DDR5 5600MHz.',
69.99, 12, 60, 'disponible')
RETURNING id_producto;
```

```sql
INSERT INTO especificaciones_memoria_ram
(id_producto, tipo_ram, capacidad_gb, modulos, velocidad_mhz, latencia)
VALUES
(21, 'DDR5', 16, 2, 5600, 'CL36');
```

### 11.3. Nueva tarjeta grafica

```sql
INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(4, 8, 'NVIDIA GeForce RTX 4070 12GB', 'RTX-4070-12GB',
'Tarjeta grafica para gaming en 1440p.',
599.99, 5, 24, 'disponible')
RETURNING id_producto;
```

```sql
INSERT INTO especificaciones_tarjeta_grafica
(id_producto, memoria_vram_gb, tipo_vram, pcie_version, consumo_recomendado_w, conectores_energia, largo_mm)
VALUES
(22, 12, 'GDDR6X', 'PCIe 4.0', 650, '1x 8-pin', 242);
```

### 11.4. Nueva fuente de poder

```sql
INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(5, 7, 'Corsair RM750e 80 Plus Gold', 'CP-9020262',
'Fuente de poder ATX de 750W modular con certificacion Gold.',
119.99, 8, 60, 'disponible')
RETURNING id_producto;
```

```sql
INSERT INTO especificaciones_fuente_poder
(id_producto, potencia_w, certificacion, modularidad, formato, conectores_pcie)
VALUES
(23, 750, '80 Plus Gold', 'Full modular', 'ATX', 4);
```

### 11.5. Nuevo gabinete

```sql
INSERT INTO productos
(id_categoria, id_marca, nombre, modelo, descripcion, precio, stock, garantia_meses, estado)
VALUES
(7, 7, 'Corsair 3000D Airflow', 'CC-9011251-WW',
'Gabinete ATX con buen flujo de aire.',
84.99, 7, 24, 'disponible')
RETURNING id_producto;
```

```sql
INSERT INTO especificaciones_gabinete
(id_producto, formato_soportado, largo_gpu_max_mm, altura_disipador_max_mm, bahias_25, bahias_35)
VALUES
(24, 'ATX, Micro ATX, Mini ITX', 360, 170, 2, 2);
```

## 12. Carrito de compras

La base tambien incluye dos tablas para simular una compra en una pagina web.

### 12.1. `carritos`

Guarda carritos de compra.

Campos principales:

- `id_carrito`: identificador del carrito.
- `identificador_sesion`: identifica la sesion del usuario.
- `estado`: puede ser `abierto`, `cerrado` o `cancelado`.
- `fecha_creacion`: fecha en la que se creo el carrito.

### 12.2. `carrito_items`

Guarda los productos agregados a un carrito.

Campos principales:

- `id_item`: identificador del item.
- `id_carrito`: carrito al que pertenece.
- `id_producto`: producto agregado.
- `cantidad`: cantidad del producto.
- `precio_unitario`: precio al momento de agregarlo.
- `fecha_agregado`: fecha en la que se agrego.

Estas tablas permiten que, despues de una recomendacion del agente, el usuario pueda agregar componentes al carrito.

## 13. Flujo completo entre usuario, agente y base de datos

El flujo esperado es:

1. El usuario escribe una solicitud en la pagina web.
2. El agente LLM interpreta la solicitud.
3. El agente consulta la base de datos.
4. La base devuelve productos, precios, stock y especificaciones.
5. El agente compara las reglas de compatibilidad.
6. El agente arma una recomendacion.
7. El usuario acepta o pide cambios.
8. Los productos pueden agregarse al carrito.

Ejemplo:

```text
Usuario:
Quiero una PC economica para jugar Valorant.

Agente:
Busca componentes disponibles.
Prioriza buen precio.
Valida compatibilidad.
Propone una configuracion.
Explica por que funciona.
```

## 14. Reglas importantes para mantener la base correcta

Para que la base de datos funcione bien:

- No se debe insertar una especificacion tecnica sin que exista primero el producto en `productos`.
- El `id_categoria` debe coincidir con la tabla tecnica usada.
- Un procesador debe ir en `especificaciones_procesador`, no en otra tabla.
- Una placa madre debe tener correctamente definido su `socket_cpu`, `tipo_ram` y `formato`.
- Una RAM debe tener correctamente definido su `tipo_ram`.
- Una GPU debe tener definido su `consumo_recomendado_w` y `largo_mm`.
- Una fuente debe tener correctamente definida su `potencia_w`.
- Un gabinete debe tener bien definido `formato_soportado` y `largo_gpu_max_mm`.
- El campo `estado` debe usarse para saber si el producto se puede recomendar.

## 15. Errores comunes

### Error 1: insertar solo en `productos`

Si se inserta un procesador en `productos` pero no en `especificaciones_procesador`, el agente no podra saber su socket, nucleos ni consumo.

### Error 2: usar mal el `id_producto`

Si se inserta una especificacion con un `id_producto` equivocado, el producto quedara asociado a datos tecnicos incorrectos.

### Error 3: escribir sockets distintos

Ejemplo:

```text
AM4
Am4
AMD AM4
```

Aunque significan algo parecido para una persona, para SQL son textos diferentes. Se recomienda usar siempre el mismo formato.

### Error 4: ingresar una RAM DDR5 para una placa DDR4

La base de datos permite guardar ambos productos, pero la consulta de compatibilidad no los unira porque `tipo_ram` no coincide.

### Error 5: olvidar el estado del producto

Si un producto esta `agotado` o `descontinuado`, el agente no deberia recomendarlo como opcion principal.

## 16. Resumen final

La base de datos funciona como un catalogo tecnico para una tienda de componentes.

La tabla `productos` guarda los datos generales. Las tablas `especificaciones_*` guardan los datos tecnicos de cada tipo de producto. La tabla `compatibilidades_componentes` documenta las reglas de compatibilidad. La vista `vista_catalogo_agente` facilita que el agente consulte toda la informacion en una sola estructura.

El agente LLM usa esta base para interpretar lo que pide el cliente, buscar productos disponibles, comparar caracteristicas tecnicas y recomendar una configuracion compatible.

La clave del sistema es que los datos tecnicos esten completos y escritos de forma consistente.
