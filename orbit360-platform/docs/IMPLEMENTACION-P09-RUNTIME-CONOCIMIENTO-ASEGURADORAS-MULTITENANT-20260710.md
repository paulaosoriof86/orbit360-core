# Implementación P0.9 — runtime de conocimiento de Aseguradoras multi-tenant

Fecha: 2026-07-10  
Módulo: Aseguradoras → Cotizador → Comparativo  
Estado: `CONTRATOS_IMPLEMENTADOS / RUNTIME_NO_CARGADO_EN_INDEX / PROVIDERS_REALES_PENDIENTES`

## 1. Necesidad

Los Excel, PDFs, reglas, presentaciones y bindings de cada aseguradora deben quedar administrados desde el módulo Aseguradoras del tenant que los carga.

No es suficiente leerlos una vez fuera de la plataforma. Orbit debe poder:

```text
recibir archivo o referencia
→ seleccionar provider
→ extraer manifiesto
→ proponer mapping/reglas/presentación
→ revisar
→ persistir metadata
→ versionar
→ auditar
→ construir read model
```

Todo sin hardcodear A&S, aseguradoras o tarifas en el core reusable.

## 2. Archivos implementados

```text
orbit360-platform/core/document-provider-registry-p09.js
orbit360-platform/core/aseguradoras-knowledge-runtime-p09.js
orbit360-platform/modules/aseguradoras-knowledge-p09.js
tools/orbit360-test-aseguradoras-knowledge-p09.mjs
.github/workflows/orbit360-aseguradoras-knowledge-p09-smoke.yml
```

## 3. Registro de providers

`document-provider-registry-p09.js` administra providers inyectados por backend para:

```text
pdf_manifest
pdf_ocr
pdf_semantic
excel_manifest
excel_semantic
entity_matching
consultative_reasoning
```

Características:

- provider primario y fallbacks por tenant/tarea;
- estado conectado, degradado, requerido o deshabilitado;
- restricción regional;
- política sobre IA externa;
- sin claves en frontend;
- sin llamadas de red dentro del registro;
- respuesta `BACKEND_REQUIRED` cuando no existe provider real;
- sanitización de tokens, credenciales, secretos y payload binario;
- conservación de claves funcionales como `routeKey` y `key`.

No se registra ninguna integración como activa en este bloque.

## 4. Persistencia dentro de Aseguradoras

La persistencia utiliza exclusivamente un `Orbit.store` inyectado y conserva la API backend-swappable.

### Registro visible

Cada fuente queda referenciada en:

```text
aseguradoras.docs[]
```

Incluye:

- documento;
- nombre;
- tipo;
- país y moneda;
- producto y combinación;
- versión;
- referencia autorizada;
- hash;
- usos;
- estado;
- trazabilidad.

### Colecciones profundas

```text
aseguradora_manifiestos
aseguradora_propuestas
aseguradora_reglas_tarifarias
aseguradora_presentaciones
aseguradora_bindings
aseguradora_revisiones
actividades
```

Cada registro contiene obligatoriamente:

```text
tenantId
aseguradoraId
documentId
sourceHash
versionFuente
estado
createdAt/updatedAt
```

Los IDs se namespacen por tenant, aseguradora, documento, elemento y versión. Dos tenants pueden utilizar el mismo nombre o ID de origen sin colisionar.

## 5. Writer metadata-only

`buildPersistencePlan()` crea un plan revisable. Requiere:

- Admin/Dirección/AdminTenant/SuperAdmin como rol activo asignado;
- tenant coincidente;
- aseguradora;
- fuente;
- motivo;
- confirmación;
- manifiesto sin flags de PII o secretos.

El plan fuerza:

```text
enabled: false
enabledCotizador: false
enabledComparativo: false
enabledCotizadorAutomatico: false
enabledCotizadorPdfExterno: false
```

Persistir metadata no habilita ninguna regla.

`applyPlan()`:

- valida nuevamente actor y rol activo;
- valida tenant;
- verifica que la aseguradora exista;
- rechaza operaciones desconocidas;
- verifica fingerprint para evitar writes sobre estado cambiado;
- hace upsert idempotente;
- actualiza `aseguradoras.docs[]`;
- registra actividad sin payload, PII o secretos.

## 6. Read model

`readModel()` devuelve para una aseguradora y tenant:

- ficha de aseguradora sanitizada;
- fuentes;
- manifiestos;
- propuestas;
- reglas tarifarias;
- presentaciones;
- bindings;
- revisiones;
- resumen de pendientes;
- conteo de habilitaciones.

No mezcla registros de otros tenants.

## 7. Roles

### Inspección

```text
SuperAdmin
Dirección
Admin
AdminTenant
Operativo
```

### Persistencia metadata-only

```text
SuperAdmin
Dirección
Admin
AdminTenant
```

Asesor queda bloqueado aunque tenga otro rol administrativo asignado si su rol activo es Asesor.

Operativo puede ejecutar y revisar extracción, pero no aplicar el plan global.

## 8. Servicio de orquestación

`modules/aseguradoras-knowledge-p09.js` expone:

```text
inspect()
buildPlan()
persist()
read()
```

Flujo:

```text
source context
→ provider registry
→ manifest
→ adapter Excel o PDF
→ inspection result
→ review
→ persistence plan
→ Orbit.store
→ read model
```

El servicio no registra providers, no tiene secretos y no muestra estado conectado por defecto.

## 9. Seguridad y hardening

Se protege:

- PII y payload binario;
- tokens y credenciales;
- colisiones entre tenants;
- rol activo no asignado;
- actor de tenant diferente;
- duplicados por reintento;
- estado concurrente;
- activación accidental;
- writes fuera de `Orbit.store`.

Los archivos protegidos de backend no se modificaron.

## 10. Smoke

El smoke cubre:

- provider ausente;
- provider determinístico ficticio;
- secret sanitizado y claves funcionales preservadas;
- rol activo Admin frente a Asesor;
- asociación de fuente a `aseguradoras.docs[]`;
- persistencia de manifiesto, propuesta, regla, presentación y binding;
- flags de habilitación forzados a `false`;
- auditoría;
- idempotencia;
- aislamiento entre dos tenants;
- bloqueo por fingerprint desactualizado.

## 11. Estado real

Implementado:

- contratos;
- writer metadata-only;
- servicio;
- read model;
- smoke;
- workflow.

Pendiente:

- cargar scripts en `index.html` mediante integrador seguro;
- registrar providers backend reales;
- wire Drive/upload;
- ejecutar persistencia real de las fuentes A&S;
- panel visual de revisión;
- CI visible;
- smoke navegador.

No se afirma que las fuentes reales ya estén escritas en el store operativo. Están identificadas, auditadas y preparadas para la primera ejecución del runtime P0.9.
