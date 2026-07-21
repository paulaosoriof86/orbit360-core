# LEDGER ACUMULADO — FIXES LOCALES, CLAUDE Y ACADEMIA

Fecha de apertura: 2026-07-21  
Proyecto: Orbit 360 — A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 0. Propósito

Este ledger evita que fixes, mejoras visuales, aprendizajes del importador y reglas descubiertas en LAB queden únicamente en la implementación local o se pierdan al recibir una nueva candidata de Claude.

Regla:

```txt
ANTES DE ACEPTAR O EMPALMAR UNA NUEVA CANDIDATA CLAUDE:
1. comparar contra el baseline vivo;
2. revisar este ledger;
3. preservar todos los fixes vigentes;
4. empalmar selectivamente;
5. actualizar Claude y Academia;
6. retirar temporales, no acumular parches.
```

Este documento no contiene secretos ni datos reales.

## 1. Categorías obligatorias

| Clasificación | Uso |
|---|---|
| `REPLICABLE_CLAUDE_INMEDIATO` | Debe incorporarse en la próxima candidata antes del empalme. |
| `REPLICABLE_CLAUDE_ACUMULADO` | Se envía en paquete consolidado de patrones. |
| `ACADEMIA_ACTUALIZAR` | Requiere lección, caso o evaluación. |
| `TENANT_AYS_ONLY` | Configuración o regla exclusiva de A&S. |
| `BACKEND_PROTEGIDO_NO_CLAUDE` | Functions, IAM, vault, store, reglas o scripts internos. |
| `SECRETO_DATO_REAL` | Nunca se comparte ni se publica. |
| `TEMPORAL_RETIRO` | Debe integrarse a owner o retirarse en bloque definido. |

## 2. Inventario del delta posterior al checkpoint sano

Checkpoint de comparación:

```txt
02a5436bc804b3a861f82375b124d05015389b4b
```

HEAD del incidente diagnosticado:

```txt
1284d1ab2bb16bd8eb77e4f39afd83970d68af4b
```

Se registran los archivos modificados o agregados en ese delta para impedir pérdidas silenciosas.

### 2.1 Importador, UX y comportamiento reusable

| Archivo/owner | Cambio o aprendizaje | Clasificación | Estado |
|---|---|---|---|
| `core/aseguradoras-op2-import-ui-guard.js` | Estados y protección UX del importador de aseguradoras. | `REPLICABLE_CLAUDE_ACUMULADO` | Auditar contra owner canónico; evitar bridge permanente. |
| `core/insurer-directory-import-v1202.js` | Parser multihoja, contactos, portales, bancos, dry-run, merge y confirmación reforzada. | `REPLICABLE_CLAUDE_INMEDIATO` + `ACADEMIA_ACTUALIZAR` | Requiere fix atómico; no promover versión actual como cierre. |
| `core/importa-dryrun-p0-wire.js` | Intercepción P0 y escritura controlada sin segundo dry-run. | `REPLICABLE_CLAUDE_ACUMULADO` + `BACKEND_PROTEGIDO_NO_CLAUDE` | Compartir patrón, no implementación protegida. |
| `core/importer-controlled-write-contract-v20260721.js` | Contrato fail-closed para transición confirmada. | `REPLICABLE_CLAUDE_ACUMULADO` | Debe reflejar conducta real, no solo tokens. |
| `modules/importar.js` | Orden de carga y eventos de readiness del importador. | `REPLICABLE_CLAUDE_INMEDIATO` | Integrar en owner estable, sin scripts duplicados. |
| `modules/aseguradoras.js` | Ajustes locales de ficha/directorio. | `REPLICABLE_CLAUDE_INMEDIATO` | Comparar visualmente con candidata futura. |
| `modules/aseguradoras-frontend-projection-v20260716.js` | Proyección visual y aliases no mutantes. | `REPLICABLE_CLAUDE_ACUMULADO` | No permitir que escriba ni sustituya datos. |
| `data/academia-v1217-aseguradoras-op2.js` | Lecciones sobre importación, seguridad, un solo dry-run y causa raíz. | `ACADEMIA_ACTUALIZAR` | Consolidar en Academia vigente; evitar parche de contenido por validador. |
| `tools/orbit360-smoke-directorios-aseguradoras-v1202.mjs` | Smoke de orden real, propuesta no confirmada y alta manual. | `REPLICABLE_CLAUDE_ACUMULADO` | Debe probar comportamiento, no texto nominal. |

### 2.2 Backend y seguridad protegidos

| Archivo/owner | Cambio | Clasificación | Estado |
|---|---|---|---|
| `functions/bank-accounts.js` | Importación, estado, revelado y copia protegida de cuentas. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preservar. |
| `functions/bootstrap.js` | Export de Functions protegidas. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preservar. |
| `functions/package.json` | Dependencias/runtime Functions. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preservar y auditar versiones. |
| `core/aseguradoras-bank-accounts-provider-lab-v20260721.js` | Proveedor LAB de cuentas protegidas. | `BACKEND_PROTEGIDO_NO_CLAUDE` | LAB; no copiar a prototipo. |
| `core/backend-lab-init.js` | Registro/carga de proveedores LAB. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Archivo protegido. |
| `tools/orbit360-inventariar-cuentas-protegidas-aseguradoras-lab-v20260721.mjs` | Inventario read-only de referencias y valores completos. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Owner vigente del diagnóstico. |
| `tools/orbit360-inventariar-functions-aseguradoras-lab-v20260721.mjs` | Inventario de ocho Functions y readiness. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preservar. |
| `tools/orbit360-validar-proveedor-cuentas-aseguradoras-lab-v20260721.mjs` | Validación del proveedor protegido. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preservar. |
| `tools/orbit360-migrar-cuentas-aseguradoras-vault-lab-v20260721-v2.mjs` | Entry point convertido a compatibilidad read-only post-migración. | `BACKEND_PROTEGIDO_NO_CLAUDE` | No volver a usar como migración real. |
| `tools/orbit360-protected-baseline.mjs` | Baseline de archivos protegidos. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Preservar. |

### 2.3 Gates, validadores y pipeline

| Archivo/owner | Cambio | Clasificación | Estado |
|---|---|---|---|
| `.github/workflows/orbit360-aseguradoras-op2-smoke.yml` | Gate amplio: Functions, inventario, preview, navegador e importador. | `BACKEND_PROTEGIDO_NO_CLAUDE` + `TEMPORAL_RETIRO` | Congelado; debe reducirse a único gate de cierre después del diagnóstico. |
| `tools/orbit360-gate-contract-overlay-importers-v20260720.json` | Overlay versionado y tokens del contrato. | `BACKEND_PROTEGIDO_NO_CLAUDE` + `TEMPORAL_RETIRO` | No seguir versionando hasta cerrar causa raíz. |
| `tools/orbit360-gate-contract-registry-extension-v20260720.json` | Registro extendido de gates/importadores. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Sincronizar con freeze y owner final. |
| `tools/orbit360-aseguradoras-import-readiness-v20260720.mjs` | Readiness de navegador y contrato de escritura. | `BACKEND_PROTEGIDO_NO_CLAUDE` | Debe validar invariantes de datos y atomicidad. |
| `tools/orbit360-validar-aseguradoras-op2-group-v1220.mjs` | Validación grupal de Aseguradoras. | `REPLICABLE_CLAUDE_ACUMULADO` | Revisar que no exija temporales. |
| `tools/orbit360-validar-aseguradoras-op2-v1220.mjs` | Validador específico del módulo. | `REPLICABLE_CLAUDE_ACUMULADO` | Revisar contra owner vigente. |
| `tools/orbit360-validar-politica-recursos-aseguradoras-v1218.mjs` | Política de recursos y datos protegidos. | `REPLICABLE_CLAUDE_ACUMULADO` | Compartir regla UX, no backend. |
| `tools/orbit360-aplicar-correccion-cuentas-importador-v20260721-v2.mjs` | Transformación temporal. | `TEMPORAL_RETIRO` | No promover a owner. |
| `tools/orbit360-aplicar-correccion-cuentas-importador-v20260721-v3.mjs` | Transformación temporal adicional. | `TEMPORAL_RETIRO` | Retirar al integrar fix en owner. |

### 2.4 Documentación ya producida

| Documento | Valor conservado | Estado |
|---|---|---|
| `CIERRE-CAUSA-RAIZ-CUENTAS-BANCARIAS-READINESS-DIRECTORIOS-REALES-20260721.md` | Checkpoint sano y migración 91→91. | Evidencia histórica válida. |
| `CIERRE-CAUSA-RAIZ-GATE-POST-MIGRACION-READONLY-20260721.md` | Regla post-migración read-only. | Vigente como criterio; el incidente prueba incumplimiento posterior. |
| `CIERRE-CAUSA-RAIZ-SEGUNDO-DRYRUN-DIRECTORIO-ASEGURADORAS-20260721.md` | Eliminación del segundo dry-run. | Patrón reusable. |
| `INCIDENTE-IMPORTADOR-ASEGURADORAS-PENDIENTES-20260714.md` | Historial del problema del importador. | Debe enlazar al corte actual. |
| `RUNTIME-PREVIEW-READINESS-20260720.md` | Readiness previo. | Evidencia histórica, no autorización actual. |
| `CORTE-FORMAL-ANTI-BUCLE-IMPORTADOR-ASEGURADORAS-20260721.md` | Freeze, causa raíz y reanudación. | Fuente vigente del incidente. |

## 3. Patrones que Claude debe recibir

### 3.1 Jerarquía y visualización

- Directorio y ficha de aseguradora con jerarquía clara.
- Links, teléfonos, contactos, plataformas y cuentas como recursos accionables.
- Contraseñas y cuentas completas visibles solo mediante acción protegida y permiso.
- Estados honestos: disponible, pendiente de conexión, requiere validación, no autorizado.
- Responsive real para Dirección, Operativo y Asesor.

### 3.2 Importador inteligente

- Detectar estructura y sinónimos.
- Mapeo corregible.
- Dry-run con crear/actualizar/omitir/bloquear.
- Merge no destructivo.
- Preservar arrays y referencias existentes.
- Deduplicar por identidad estable.
- Confirmación reforzada.
- No declarar éxito antes de confirmación durable.
- Trazabilidad y rollback.

### 3.3 Seguridad visible sin copy técnico

- La UI no muestra Firebase, LAB, vault, Functions ni secretos.
- El usuario autorizado sí puede revelar/copiar el valor protegido.
- Toda revelación se audita.

## 4. Patrones que no se envían a Claude

- valores reales;
- usuarios y contraseñas;
- números bancarios completos;
- referencias internas de bóveda;
- service accounts;
- IAM;
- nombres de secrets;
- Functions y endpoints privados;
- reglas Firestore;
- scripts de migración/inventario protegidos.

## 5. Backfill obligatorio de fixes visuales anteriores

Antes del siguiente paquete Claude debe revisarse la historia reciente y registrar cualquier fix visual previo no incluido todavía, especialmente:

- jerarquía visual de ficha y directorio;
- links clicables;
- teléfonos accionables;
- orden de recursos;
- estados de acceso;
- controles revelar/copiar;
- copy no técnico;
- responsive;
- relaciones vacías honestas;
- roles/scopes;
- menú móvil;
- legal una sola vez.

Estado:

```txt
BACKFILL_PENDIENTE_ANTES_DE_NUEVA_CANDIDATA_CLAUDE
```

No se acepta una candidata ni se empalma un ZIP hasta cerrar ese backfill.

## 6. Regla de salud de artefacto

Cada elemento `TEMPORAL_RETIRO` debe tener:

- owner final;
- motivo temporal;
- dependencia;
- bloque de retiro;
- prueba de retiro.

No se permite que el artefacto final quede compuesto por una cadena de overlays, guards, wires o scripts que sustituyan a propietarios incompletos.

Objetivo:

```txt
UN OWNER POR RESPONSABILIDAD
UN FLUJO DE IMPORTACIÓN
UN CONTRATO DE ESCRITURA
UN GATE DE CIERRE
CERO PARCHE PERMANENTE SIN RETIRO
```
