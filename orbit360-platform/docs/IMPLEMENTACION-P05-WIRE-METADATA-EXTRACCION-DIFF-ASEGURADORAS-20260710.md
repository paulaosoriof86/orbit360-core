# IMPLEMENTACIÓN P0.5 — WIRE METADATA-ONLY, EXTRACCIÓN PROPUESTA Y DIFF DE ASEGURADORAS

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni main.

## 1. Carril y objetivo

Carril principal: **B — backend reusable, seguridad, Orbit.store e importadores**.

Impacto preparado:

- Carril A: UX futura de Aseguradoras, Cotizador, Comparativo y Academia.
- Carril C: primer inventario real sanitizado de cotizadores/tarifarios.

Objetivo P0.5:

```txt
referencia documental autorizada
→ lectura estructural metadata-only
→ clasificación del archivo
→ propuesta de persistencia
→ extracción semántica propuesta con evidencia
→ diff crear/actualizar/omitir/conflicto
→ decisión humana
→ validado pendiente de habilitación
```

P0.5 no carga datos reales, no habilita tarifas, no ejecuta macros ni fórmulas y no incluye writer operativo.

## 2. Necesidad

P0.4 permitió inventariar la estructura de XLSX/XLSM. Faltaba enlazar ese inventario con la ficha maestra de Aseguradoras y preparar la futura lectura de:

- tasas y factores;
- primas mínimas;
- prima neta y total;
- gastos de emisión o expedición;
- IVA/impuestos;
- recargos por fraccionamiento;
- cuotas y plazos;
- Visa Cuotas;
- asistencias;
- catálogos de marcas/líneas/modelos;
- reglas por tipo/uso de vehículo;
- edad, sexo, maternidad y composición familiar;
- coberturas, límites, deducibles, beneficios, exclusiones y condiciones;
- secciones de presentación de la cotización.

La lectura no puede convertir un valor encontrado en tarifa oficial. Debe generar propuesta, evidencia, diff y validación.

## 3. Archivos implementados

### Core

```txt
orbit360-platform/core/document-source-wire-p05.js
orbit360-platform/core/extraction-proposal-p05.js
```

### Pruebas

```txt
tools/orbit360-test-document-source-wire-p05.mjs
tools/orbit360-test-extraction-proposal-p05.mjs
tools/orbit360-test-document-source-p05-e2e.mjs
tools/orbit360-test-document-source-p05-hardening.mjs
```

### CI

```txt
.github/workflows/orbit360-document-source-p05-smoke.yml
```

## 4. Wire metadata-only

`document-source-wire-p05.js` acepta exclusivamente:

- tenant;
- aseguradora;
- país/moneda;
- dimensiones del producto;
- nombre del archivo;
- `fileRef`/referencia documental;
- hash;
- versión;
- motivo;
- actor y rol activo.

Solicita al proveedor:

```txt
includeCellValues: false
includeBinaryPayload: false
includeCustomerPayload: false
includeSecrets: false
executeMacros: false
calculateFormulas: false
```

No recibe bytes, base64, tokens ni contenido VBA.

### Roles

Lectura/inventario:

- SuperAdmin;
- Dirección;
- Admin/AdminTenant;
- Operativo.

Confirmación del plan:

- SuperAdmin;
- Dirección;
- Admin/AdminTenant.

El permiso se decide por **rol activo**, no solo por roles asignados.

## 5. Auditoría

La lectura genera eventos separados para:

1. solicitud o denegación;
2. resultado del inventario.

La auditoría conserva:

- actor;
- rol activo;
- tenant;
- aseguradora;
- referencia/hash;
- motivo;
- extensión;
- tipo de fuente propuesto;
- número de hojas;
- presencia de macros o vínculos externos;
- resultado.

No conserva:

- bytes;
- base64;
- credenciales;
- tokens;
- valores de clientes;
- valores crudos de celdas.

El wire puede registrar auditoría mediante `Orbit.store.insert('auditoria', ...)`; no realiza escrituras operativas de aseguradoras/documentos/tarifas.

## 6. Persistencia propuesta

P0.5 construye un dry-run para dos destinos compatibles con la arquitectura actual:

### `documentos`

Registro metadata-only con:

- `documentId` estable;
- fuente y hash;
- aseguradora;
- país/moneda;
- ramo/producto/familia/subtipo/segmento/riesgo/vehículo/uso/plan;
- versión;
- resumen estructural;
- parser;
- capacidades propuestas;
- estado `requiere_validacion`;
- Cotizador y Comparativo deshabilitados.

### `aseguradoras.docs[]`

Fila operativa superficial, compatible con `modules/aseguradoras.js`, para mostrar:

- archivo;
- tipo de fuente;
- dimensiones;
- versión;
- referencia;
- tarifas/reglas/salida/presentación/impresión propuestas;
- estado.

El inventario profundo permanece en `documentos`; abrir y guardar la ficha no debe depender de reinyectar todo el snapshot del libro dentro de `docs[]`.

## 7. Versionado y concurrencia

Casos:

```txt
mismo hash → omit_same_hash
misma combinación y versión lógica, hash distinto → new_version_proposed
fuente nueva → create_document_proposed
```

Antes de confirmar se calcula `currentDocsFingerprint`.

Si el arreglo `aseguradora.docs[]` cambió entre dry-run y confirmación:

```txt
ESTADO_ACTUAL_CAMBIO_REEJECUTAR_DRY_RUN
```

No se permite aplicar un parche calculado sobre una versión anterior de la ficha.

## 8. Propuestas semánticas

`extraction-proposal-p05.js` normaliza conceptos con:

- clave estable por aseguradora + país + producto + dimensiones + concepto + calificadores;
- valor y tipo;
- unidad/moneda;
- vigencia;
- confianza;
- documento y versión fuente;
- evidencia;
- estado;
- requerimiento de validación.

### Evidencia obligatoria

Para Excel:

```txt
hoja + rango
```

Opcionalmente:

- referencia de fórmula;
- método del parser;
- hash de evidencia.

Para PDF/imagen futuro:

```txt
página o bloque
```

Sin evidencia válida la propuesta queda `sin_evidencia` y no puede validarse.

## 9. Diff

Acciones:

```txt
create_proposed
update_proposed
omit_same_value
invalid_requires_validation
conflict_requires_validation
```

El diff nunca escribe.

Conflictos ocurren cuando la misma clave produce valores diferentes. No pueden cerrarse confirmando ambos valores. Debe:

- confirmarse/corregirse uno;
- rechazarse el otro con motivo;
- o reclasificarse la dimensión/calificador correspondiente.

Si quedan dos registros aceptados con la misma clave y valores distintos:

```txt
CONFLICTO_NO_RESUELTO
```

El plan se bloquea y no genera registros.

## 10. Decisión humana

Acciones permitidas:

```txt
confirm
correct
reject
```

Todas requieren motivo.

Los registros aceptados quedan:

```txt
estado: validado_pendiente_habilitacion
habilitadoCotizador: false
habilitadoComparativo: false
```

La validación documental y la habilitación para motores son gates distintos.

## 11. Pruebas cubiertas

- rol activo Admin vs Asesor;
- solicitud metadata-only;
- auditoría sin payload;
- conservación de fuentes anteriores;
- documento + patch de aseguradora;
- fingerprint de concurrencia;
- mismo hash omitido;
- interoperabilidad P0.4 → P0.5;
- producto y tipo de vehículo preservados;
- evidencia hoja/rango;
- propuesta nueva/actualización/omisión;
- conflicto semántico;
- conflicto no resuelto bloqueado;
- corrección y rechazo;
- segundo gate de habilitación;
- conceptos de Autos, Motos, Gastos Médicos y pagos.

## 12. Estado honesto

```txt
CONTRATOS_IMPLEMENTADOS
SMOKES_SINTETICOS_PREPARADOS
WORKFLOW_CONFIGURADO
CI_VISIBLE_PENDIENTE
NO_CARGADO_EN_INDEX
PROVEEDORES_REALES_NO_CONECTADOS
SIN_DATOS_REALES
SIN_WRITER_OPERATIVO
SIN_HABILITACION_COTIZADOR_COMPARATIVO
```

## 13. Impacto Academia

Rutas futuras:

### Operativo

- inventariar una fuente;
- entender metadata-only;
- revisar hojas, impresión y alertas;
- no confundir inventario con tarifa activa.

### Admin/Dirección

- confirmar fuente;
- revisar versión;
- resolver conflictos;
- corregir/rechazar propuestas;
- habilitar mediante segundo gate.

### Asesor

- no administra fuentes;
- consume únicamente conocimiento habilitado.

## 14. Siguiente acción

P0.5 cierra la preparación abstracta. El siguiente bloque debe ser Carril C:

1. recibir un cotizador Excel real representativo;
2. producir inventario sanitizado;
3. revisar hojas/roles/impresión/versionado;
4. producir primer reporte de extracción propuesta;
5. documentar vacíos del parser;
6. ajustar contratos solo con evidencia real;
7. después continuar adapter PDF.

No corresponde iniciar Cotizador o Comparativo antes de validar al menos una fuente real completa.
