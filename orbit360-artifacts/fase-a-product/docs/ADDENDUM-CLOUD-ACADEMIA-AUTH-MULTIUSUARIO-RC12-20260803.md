# Addendum Cloud / Claude / Academia — autenticación multiusuario RC1.2

Fecha: 2026-08-03  
Estado: documentado en core; pendiente de envío externo y pendiente de corrección del contrato de membership Dirección.

## Resultado vigente

RC1.2 corrigió los owners de autenticación del frontend, pero el macrobloque productivo cerró antes del deploy porque no pudo resolver una identidad normal elegible para Dirección.

```text
decisión: RC12_NORMAL_IDENTITIES_NO_GO
clasificación técnica emitida: SECURITY_FAILURE
clasificación de remediación: DATA_CONTRACT_FAILURE con impacto de seguridad
candidata: b699ba329960cd830121b57452ce558399aa84fb
deploy: no
producción modificada: no
Firestore writes: 0
Auth writes: 0
```

## Patrón reusable consolidado

### CL-121 — Auth no define permisos

Firebase Auth acredita la identidad. La membership del tenant define roles, rol activo, advisorId, países, scopes y módulos.

### CL-122 — Store fail-closed por membership

`Orbit.store` no conecta snapshots si no existe una proyección activa y válida para el mismo UID y tenant.

### CL-123 — Guard sin identidad técnica

El guard no puede fijar correo, UID, rol ni asesor. Solo sincroniza la sesión después de validar la membership.

### CL-124 — Smoke con usuario normal

Una prueba con cuenta técnica no demuestra operabilidad multiusuario. Dirección, Operativo y Asesor deben validarse con identidades normales existentes.

### CL-125 — Gate antirregresión

Una candidata queda bloqueada si reintroduce identidad técnica, UID fijo, rol o asesor forzado, fallback seed o pérdida de la API de `Orbit.store`.

### CL-126 — Evidencia sanitizada

Los artefactos conservan hashes, roles, scopes, conteos y resultados; no correos, UID, contraseñas ni tokens.

### CL-127 — Sin cuentas paralelas

La ausencia o inconsistencia de una membership se corrige sobre el usuario existente. No se crea una identidad paralela para superar un gate.

### CL-128 — Gate de Auth y contrato de membership son controles distintos

El gate estático puede aprobar Auth, Store y Guard, mientras el contrato de datos falla por ausencia o inconsistencia de la membership productiva.

### CL-129 — Diagnóstico por causa de rechazo

El diagnóstico debe separar: UID ausente, tenant inconsistente, estado inactivo, roles ausentes, rol activo/default inválido, advisorId faltante, usuario Auth inexistente, usuario deshabilitado, correo ausente, proveedor ausente e identidad técnica excluida.

### CL-130 — Un NO_GO no se corrige debilitando seguridad

No se debe reactivar la cuenta técnica, tolerar roles inventados ni abrir scopes globales. Se corrige el owner contractual.

### CL-131 — Dos etapas de preflight

1. Gate estático antes de secretos.
2. Contrato read-only de memberships/Auth antes de snapshots y deploy.

### CL-132 — Academia debe enseñar la diferencia entre código y datos de acceso

- `FUNCTIONAL_DEFECT`: lógica incorrecta de Auth/Store/Guard.
- `VALIDATOR_STALE`: prueba que no representa el acceso real.
- `PIPELINE_MECHANISM_FAILURE`: workflow o ruta de evidencia incorrectos.
- `DATA_CONTRACT_FAILURE`: membership/Auth no cumple el contrato.
- `SECURITY_FAILURE`: el sistema tendría que degradar seguridad para continuar.

## Evidencia vigente

```text
run inicial: 30877460688
causa inicial: EVIDENCE_PATH_RESOLUTION
gate real: PASS 14/14
secretos leídos en run inicial: no

run reanudado: 30877589549
job: 91892068434
artifact: 8880091323
digest: sha256:b45e69e3d256f075ca67c8a4eebacff3db03aa6eff1b152a02c6885701318268
error: ACTIVE_NORMAL_MEMBERSHIP_NOT_FOUND_DIRECCION
```

## Owner y siguiente acción

```text
owner: tenants/{tenantId}/members/{uid} + Firebase Auth user con el mismo uid
```

Se preparó el diagnóstico sanitizado:

```text
tools/orbit360-diagnosticar-memberships-normales-v20260803.mjs
```

Debe ejecutarse una sola vez en modo read-only. Solo después de conocer la causa específica se podrá proponer un diff mínimo sobre la membership del usuario existente.

## Estado externo

```text
documentado en core: sí
rama viva sincronizada: sí
enviado a Cloud/Claude: no
incorporado al prototipo comercializable: pendiente
producción RC1.2: no desplegada
```
