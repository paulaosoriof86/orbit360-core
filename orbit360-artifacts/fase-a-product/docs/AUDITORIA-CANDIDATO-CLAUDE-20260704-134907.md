# Auditoría candidato Claude 2026-07-04 13:49

ZIP auditado: Prototype Development Request - 2026-07-04T134907.811.zip
Comparado contra: Prototype Development Request - 2026-07-04T114805.866.zip
Estado: auditoría de frontend/prototipo. No empalmar sin revisión final.

## Resumen

La candidata es incremental y de bajo riesgo. Cambió 5 archivos:

- core/importa.js
- core/integraciones-panel.js
- index.html
- docs/BITACORA-CAMBIOS.md
- docs/REPORTE-SMOKE.md

No cambió data/store.js. No cambió tools/orbit360-validate-marketing-integraciones.mjs. Los archivos backend LAB protegidos no aparecen en el ZIP o no fueron modificados.

## Mejoras reales detectadas

### 1. P0 moneda de hoja

core/importa.js ya separa moneda explícita de moneda sugerida por país. La traza multihoja agrega _monedaSugeridaHoja y no escribe moneda por país si no fue detectada explícitamente.

Estado: mejora real. Mantener.

### 2. P0 clientes sin default GTQ

IMPORT_MAP.clientes.build eliminó el default peligroso GTQ. Si falta país o moneda, marca requiereValidacion y estado requiere_validacion.

Estado: mejora real, pero requiere ajuste menor porque el mapa de campos de clientes aún no incluye columna moneda/divisa/currency. Si la fuente trae moneda explícita, puede no mapearse a rec.moneda.

### 3. P0 documentos soporte

SCOPE.documentos cambió a parchesPendientes. Ya no declara creación directa de clientes.

Estado: mejora real. Falta ajustar copy visible para que no diga que completa la ficha.

### 4. Listado producción 2025-2026

HOJA_SOPORTE incluye produccion/producción, por lo que la hoja se excluye del flujo de movimientos. Esto está alineado con la regla confirmada por Paula: ignorar esa hoja y esperar fuente real de pólizas separada.

Estado: mejora real. Mantener.

### 5. Texto LAB en panel de integraciones

La columna visible cambió de LAB a Prueba.

Estado: mejora parcial. Aún quedan estados técnicos visibles en el panel.

## Validaciones ejecutadas

- Inventario de ZIP: 96 archivos.
- Comparación contra candidata anterior: 5 archivos modificados, 0 agregados, 0 eliminados.
- node --check en JS de core, modules y data: sin errores de sintaxis.
- grep modules/localStorage: sin localStorage ejecutable nuevo en módulos; solo comentarios existentes.
- Verificación de backend protegido: data/store.js sin cambios; herramientas orbit360 sin cambios.

## Pendientes para Claude antes de nuevo paquete

### P0-134907-01 — Clientes: mapear moneda explícita

Archivo: core/importa.js
Área: IMPORT_MAP.clientes.fields

Agregar campo moneda con sinónimos:

- moneda
- divisa
- currency

Motivo: build ya respeta moneda explícita, pero si el mapper no llena rec.moneda, una fuente válida con moneda explícita podría quedar en requiere_validacion innecesariamente.

### P0-134907-02 — Estado de cuenta bancario no debe escribir finmovs

Archivo: core/importa.js
Área: IMPORT_MAP.estados-banco y SCOPE.estados-banco

Problema: estados-banco sigue con coll finmovs y SCOPE crea finmovs. Según contrato de fuentes separadas, estado de cuenta bancario debe ir a conciliación, no a finmovs, y no debe crear cobros sin conciliación.

Esperado en prototipo:

- cambiar destino conceptual a conciliaciónBanco o bandeja de conciliación;
- no escribir finmovs desde estados-banco;
- no crear cobros directos;
- mostrar estado honesto de conciliación pendiente.

### P1-134907-03 — Copy visible de documentos sigue diciendo completa la ficha

Archivo: core/importa.js
Área: KINDS.documentos.desc

Texto actual indica que el motor extrae datos y completa la ficha. Debe cambiar a: propone cambios al expediente para revisión/aprobación.

### P1-134907-04 — SCOPE.documentos usa palabra técnica diff

Archivo: core/importa.js
Área: SCOPE.documentos.label

Cambiar copy visible de diff por lenguaje de usuario: propuestas de actualización o cambios pendientes de aprobación.

### P1-134907-05 — Panel de integraciones mantiene estados técnicos

Archivo: core/integraciones-panel.js

Aunque LAB cambió a Prueba, el panel aún puede mostrar pendiente_backend, pendiente_configuracion y botón con texto Simulando. Debe mapear estados técnicos a texto usuario:

- pendiente_backend -> pendiente de conexión
- pendiente_configuracion -> pendiente de configuración
- sin_estado -> sin estado
- Simulando -> Probando

### P1-134907-06 — Documentación de smoke no debe afirmar smoke visual completo si no hay evidencia reproducible

Archivo: docs/REPORTE-SMOKE.md

El reporte dice verificado en vivo. Mantener si Claude efectivamente lo ejecutó, pero agregar alcance: smoke de prototipo local/visual de Claude, no smoke backend ni Firestore.

## Decisión

La candidata 134907 avanza y mejora la anterior. No parece regresiva respecto a backend protegido. Todavía no debe considerarse cerrada porque quedan pendientes P0/P1 de importador y copy visible.

## Instrucción corta para Claude

Corregir solamente los pendientes P0/P1 listados arriba. No tocar backend protegido, no tocar data/store.js, no tocar firestore.rules, no tocar tools/orbit360-*. Entregar nuevo ZIP completo con bitácora y reporte de smoke actualizado.
