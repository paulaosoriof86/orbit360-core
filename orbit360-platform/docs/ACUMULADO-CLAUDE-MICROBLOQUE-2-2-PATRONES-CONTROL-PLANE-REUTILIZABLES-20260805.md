# ACUMULADO CLAUDE — PATRONES REUTILIZABLES DE CONTROL PLANE

Fecha: 2026-08-05  
Origen: Microbloque 2.2 de Orbit 360

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

## Patrones reutilizables

### 1. Separar composición canónica y revisión del mecanismo

```text
lifecycleComposition = phase-capability-contract-v1
harnessRevision = isolated-context-direct-url-v6
```

No reutilizar un mismo campo para identificar la arquitectura del validador y la versión del instrumento de prueba.

### 2. Outer router + inner engine

La prueba estática debe invocar el entrypoint canónico y comprobar que este alcanza al engine especializado. No considerar suficiente ejecutar el engine directamente.

### 3. Fixture source-only no operativa

Una fixture de validación debe declarar explícitamente:

```text
approved = false
allowedExecutions = 0
runtimeExecutionAuthorized = false
secretAccessAuthorized = false
firebaseAuthorized = false
browserAuthorized = false
deployAuthorized = false
```

### 4. Request inmutable y consumo separado

- request: evento autorizado y sellado;
- ledger: estado y consumo;
- evidencia: outputs observados;
- cierre: diagnóstico y siguiente gate.

Nunca modificar el mismo archivo trigger para cerrarlo.

### 5. Evidencia desde outputs observados

Los conteos deben derivarse del output real del paso anterior. El builder debe validar rangos y coherencia antes de emitir `ok:true`.

Ejemplos de invariantes:

- Functions retenidas ⇒ verificadas = esperadas;
- preview retenido ⇒ producto e integridad PASS;
- GO ⇒ Functions + Hosting + integridad + visual PASS;
- ningún campo crítico debe ser literal si existe output observable.

### 6. Política de retención independiente de captura

Un fallo exclusivo del capturador no debe destruir automáticamente un entorno cuyo producto e integridad pasaron. La decisión debe separar:

```text
productAndIntegrityPass
visualEvidencePass
previewRetained
```

### 7. STOP_RETRY por familia

Dos fallos de la misma etapa o familia obligan a:

- detener runtime;
- diagnosticar owner;
- pasar a source-only;
- corregir contrato/validador;
- ejecutar prueba integrada;
- pedir nueva autorización después de PASS.

## No enviar a Claude

```text
BACKEND_PROTEGIDO_NO_CLAUDE
```

Excluir:

- credenciales y secretos;
- datos reales A&S;
- IDs privados o payloads de tenant;
- adaptadores Firestore protegidos;
- `data/store.js`;
- `core/backend-lab-*`;
- `core/auth.js` protegido;
- `core/importa.js`;
- `firestore.rules`;
- contratos y tools canónicos completos;
- workflows con nombres internos de proyectos o infraestructura.

## Resultado de referencia

```text
PASS_CANONICAL_PREFLIGHT_COMPOSITION
integrated checks: 31/31
inner preflight: 32/32
runtime capabilities exercised: 0
```

Este acumulado conserva únicamente arquitectura y metodología reusable; no autoriza implementación automática ni reemplazo total de una candidata.
