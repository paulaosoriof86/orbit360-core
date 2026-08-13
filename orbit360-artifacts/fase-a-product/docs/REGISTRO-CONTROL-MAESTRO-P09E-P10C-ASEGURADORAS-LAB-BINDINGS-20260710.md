# Registro control maestro — P0.9e/P0.10c Aseguradoras LAB y bindings

Fecha: 2026-07-10  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: `#5 draft/open`  
Estado: `IMPLEMENTADO_NO_APLICADO / SIN_FIRESTORE_WRITE / GATE_CERRADO`

## Carril A — Prototipo, Claude y Academia

Avance:

- estados honestos de persistencia y sincronización;
- visor futuro de fuente/manifiesto/regla/presentación/binding;
- separación automóvil/microbús;
- lectura de bloqueos;
- read model posterior a recarga;
- rutas de Academia sobre metadata, snapshots y segundo gate.

Pendiente:

- UX visual;
- progreso de sincronización;
- manejo de errores;
- diff interactivo;
- aprobación administrativa;
- smoke navegador.

Claude continúa `NO_SOLICITADO` hasta completar una persistencia LAB real y validar el read model.

## Carril B — Backend, seguridad y Orbit.store

Implementado:

```text
core/aseguradoras-lab-collections-p09e.js
core/aseguradoras-lab-persistence-p09e.js
core/tenant-binding-plan-p10c.js
data/tenant-alianzas-soluciones-binding-plan-p10c.js
tools/orbit360-test-aseguradoras-lab-collections-p09e.mjs
tools/orbit360-test-aseguradoras-lab-persistence-p09e.mjs
tools/orbit360-test-tenant-binding-plan-p10c.mjs
.github/workflows/orbit360-aseguradoras-lab-p09e-binding-p10c-smoke.yml
```

Actualizado:

```text
tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs
```

Cerrado:

- listeners para seis colecciones profundas;
- lectura por `Orbit.store` sin almacenamiento paralelo en módulos;
- gate de tenant/Auth/rol/snapshots;
- espera de cola de escritura;
- verificación posterior por read model;
- plan de bindings por variante;
- bloqueo de herencia automóvil→microbús;
- cero habilitación;
- orden de scripts y dry-run.

No modificado:

```text
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
core/auth.js
firestore.rules
```

Pendiente:

- CI visible;
- `--apply` del integrador;
- Auth LAB real;
- snapshots reales;
- primera escritura;
- verificación tras recarga;
- persistencia de binding.

## Carril C — Fuentes reales y configuración A&S

Fuentes y decisiones usadas:

- directorio GT;
- ocho Excel;
- tres PDF;
- Banrural = Aseguradora Rural;
- Columna resuelta;
- AseGuate GE 5% prima neta;
- AseGuate IVA 12% subtotal gravable;
- variantes automóvil y microbús.

Avance:

- plan lógico AseGuate con dos variantes;
- referencias de tarifario y presentaciones;
- dimensiones GT/GTQ/Vehículos;
- targets apagados;
- regla de no fusión.

No se incorporó:

- PII;
- tasas de producto;
- importes de clientes;
- secretos;
- binarios;
- rutas locales.

Pendiente:

- reglas extraídas y revisadas dentro de LAB;
- presentaciones revisadas;
- casos de validación persistidos;
- mapeo de plan;
- financiamiento;
- bindings reales;
- lote de once fuentes.

## Hallazgo convertido en acción

Necesidad:

- que el conocimiento persistido reaparezca al recargar.

Esperado:

- las seis colecciones profundas deben tener listeners propios.

Causa raíz:

- el store LAB protegido mantiene un inventario histórico de colecciones que no incluye P0.9.

Archivos/funciones:

- `data/store-firestore-lab.local.js` → `COLLECTIONS` y snapshots, preservado;
- `core/aseguradoras-lab-collections-p09e.js` → extensión aditiva;
- `core/aseguradoras-lab-persistence-p09e.js` → confirmación por read model.

Fix:

- adapter externo que extiende lectura para colecciones P0.9 sin reemplazar el store.

Impacto:

- evita falsos positivos de persistencia y pérdida visual después de recarga.

Estado:

- `IMPLEMENTADO / PENDIENTE_EJECUCION_LAB`.

## Estado del empalme

```text
index auditado: sí
ancla modules/aseguradoras.js?v1291: compatible
integrador actualizado: sí
dry-run CI configurado: sí
--apply ejecutado: no
index modificado: no
Firestore LAB escrito: no
Cotizador habilitado: no
Comparativo habilitado: no
```

## Próxima acción

P0.9f:

1. revisar CI visible;
2. ejecutar empalme controlado en LAB;
3. confirmar security guard y siete grupos de snapshots: base + seis profundos;
4. persistir una fuente metadata-only;
5. recargar y comprobar read model;
6. persistir reglas/presentaciones AseGuate;
7. construir automóvil y microbús;
8. mantener el gate cerrado;
9. continuar lote de once fuentes.
