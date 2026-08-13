# ACADEMIA — Cliente 360, Pólizas y Vehículos: read-model canónico y ficha completa

Fecha: 2026-07-31  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Objetivo de aprendizaje

Enseñar que persistir datos correctamente no garantiza que una interfaz los muestre correctamente. Orbit 360 separa:

`fuente → contrato canónico → persistencia → read-model/proyección visual → experiencia por rol`.

Un error en cualquiera de las últimas dos capas puede producir `0/0`, `NaN`, `undefined`, campos vacíos o una navegación regresiva aunque los documentos existan en el store.

## Caso práctico

Después de migrar Pólizas y Vehículos, la interfaz antigua seguía buscando aliases legacy. El resultado visible podía contradecir el backend: la ficha encontraba pólizas que la lista reportaba como cero y un vehículo persistido con `anioModelo/placaNormalizada/chasisFuente/motorFuente` aparecía sin esos datos porque el frontend esperaba `anio/placa/chasis/motor`.

La corrección apropiada no es reimportar ni inventar valores. Se crea una proyección de lectura sin escritura y se corrige el owner de navegación.

## Reglas que debe enseñar Academia

### 1. Alias visual no es escritura

Una proyección puede traducir nombres canónicos a nombres que una vista legacy aún necesita, siempre que:

- no llame `insert/update/remove`;
- no cambie el contrato de persistencia;
- sea temporal o tenga owner/retirada definida;
- tenga prueba anti-regresión.

### 2. Faltante honesto

`undefined` y `NaN` nunca son estados de producto. Si la fuente no contiene un dato, la interfaz muestra `Pendiente de completar` o un estado equivalente y conserva la calidad de datos.

### 3. Ficha completa de Póliza

La Póliza no es solo prima. Debe permitir consultar:

- identidad contractual y número;
- cliente/asegurado;
- aseguradora y asesor;
- ramo, subramo/producto y tipo;
- estado y vigencia;
- país/moneda;
- suma asegurada y riesgo;
- prima neta, gastos, impuestos y total;
- frecuencia/forma/conducto de pago;
- objeto asegurado o vehículo;
- recibos/cartera;
- historial, renovaciones y endosos;
- calidad de la información.

### 4. Póliza y Vehículo como pantallas contextuales

La lectura principal se hace en pantalla completa, conservando contexto y enlaces de regreso a Cliente 360. Un modal queda para acciones acotadas, no para sustituir la ficha principal.

### 5. Rendimiento como contrato funcional

Una lista de cientos de clientes no debe recalcular todas las colecciones completas por cada fila. El patrón recomendado es índice/caché invalidable por colección y resumen reutilizable.

### 6. Diferencia entre defectos

- `FUNCTIONAL_DEFECT`: el frontend consume aliases equivocados, usa navegación incorrecta o bloquea la interfaz.
- `DATA_CONTRACT_FAILURE`: el dato que la ficha necesita no fue persistido desde la fuente.
- `VALIDATOR_STALE`: la plataforma funciona pero el validador espera un contrato viejo.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo de ejecución/observación del gate falla y no prueba el producto.

## Por rol

### Dirección

Debe poder abrir Cliente → Póliza → Vehículo y revisar los datos completos, prima/cartera y calidad sin salir del contexto del cliente.

### Operativo

Debe identificar faltantes, gestionar correcciones y consultar recibos/cartera con una vista responsive utilizable en tableta.

### Asesor

Debe consultar únicamente sus clientes/relacionados según scope, ver la ficha completa y solicitar gestión cuando un dato requiera corrección; no obtiene por esta vista permisos adicionales de escritura.

## Error frecuente a evitar

No considerar “cerrado” un módulo solo porque conteos/hidratación pasaron. El gate previo a revisión humana debe incluir coherencia lista/ficha, navegación, ausencia de valores técnicos visibles, rendimiento y responsive mínimo.

## Evidencia reusable

- owner: `modules/policy-receipts-v1199-detail-guard.js` versión `20260731.1`;
- prueba sintética: `tools/orbit360-test-client360-policy-vehicle-readmodel-v1199c-20260731.mjs`;
- ledger Claude: `docs/SINCRONIZACION-CLAUDE-ACUMULADA-20260731.md`.
