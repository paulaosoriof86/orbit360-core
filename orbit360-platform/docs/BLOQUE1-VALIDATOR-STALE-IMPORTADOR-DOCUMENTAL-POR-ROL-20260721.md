# Bloque 1 — Validador obsoleto del importador documental por rol

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato general: `1.0.35`  
Contrato del validador Cliente 360: `1.0.29`

## Clasificación

- `VALIDATOR_STALE`
- Código: `DOCUMENT_IMPORT_VALIDATION_IGNORED_ACTIVE_ROLE_PERMISSION`

## Evidencia

Gate dirigido:

```text
Run: 29886657782
Artifact: 8516762714
Digest: sha256:3ea7bcb0a03036c657fbc99f1f652d206a7a3937c65234da7221a57ad1e7c7d9
HEAD: 8c39136eccd378e307840f1ab5c39ba44aed6fb4
Preflight: GO_GATE_CONTRACT
Integridad remota: 9/9 activos exactos
```

Avance confirmado:

```text
Dirección escritorio: PASS completo
Motivo de inactividad: PASS
Plataformas y credenciales seguras: PASS
passwordInputsInInsurerView: 0
hiddenLoginPasswordInputs: 1, excluido correctamente
Bancos: PASS
Conocimiento: PASS
Importador honesto en Dirección: PASS
```

El primer fallo nuevo ocurrió en `tablet_operativo_client360`, al esperar el modal `#asg-doc-import-v1203`.

## Causa raíz

`validateInsurerVisualContract` ejecutaba `validateImporterHonesty` de forma incondicional para:

1. Dirección escritorio;
2. Operativo tableta;
3. Asesor móvil.

El producto, en cambio, abre el modal solo cuando el permiso efectivo de la sesión permite gestionar documentos. La visibilidad del módulo no equivale a permiso para abrir el importador.

El motor `Orbit.access` puede resolver un permiso explícito de tenant que prevalece sobre el fallback general del rol. Por eso un rol puede consultar Aseguradoras en modo lectura y, correctamente, no abrir el modal documental.

El validador confundía dos resultados válidos:

- rol autorizado: modal honesto, propuesta sin falso éxito y cancelar sin escritura;
- rol restringido: modal ausente y cero cambios.

Además, el mismo código habría obligado al Asesor móvil a ejecutar un flujo que debe permanecer restringido.

## Corrección

Archivo:

```text
tools/orbit360-runtime-check-client360-v20260716.mjs
Commit: c75b1ef6da2d6483c75a79d43ae1ff0acaaf6861
Contrato: 1.0.29
Revisión: role-permission-aware-v1
```

La prueba ahora obtiene:

```text
role
canCreate
canManageDocuments
effectiveCanManage
```

### Rol autorizado

Debe demostrar:

- modal visible;
- estado inicial `No se ha guardado nada`;
- acción `Registrar propuesta`;
- ausencia de falso éxito;
- contrato de persistencia verificable;
- cancelar no modifica documentos.

### Rol restringido

Debe demostrar:

- modal no visible;
- conteo documental antes = después;
- cero escritura;
- Asesor sin fuga de permiso.

El resultado se registra como:

```text
authorized-honest-proposal
```

o:

```text
denied-by-active-permission
```

## Contrato estático

Archivo:

```text
orbit360-platform/tools/orbit360-aseguradoras-owner-contract-v20260717.js
Commit: 3b6be26433fe86820b9e7342ac6f3a09efe6adb7
```

El contrato exige:

- validador Cliente 360 `1.0.29`;
- revisión `role-permission-aware-v1`;
- lectura del permiso efectivo;
- flujo autorizado honesto;
- flujo restringido sin modal ni escritura;
- bloqueo explícito de fuga para Asesor.

## Impacto en Academia

La Academia profunda ya enseña:

- diferencias entre Dirección, Operativo y Asesor;
- permisos y scopes activos;
- propuestas documentales con estado honesto;
- que seleccionar un archivo no significa almacenarlo;
- diferencia entre defecto funcional y validador obsoleto.

No se agrega una lección duplicada. Esta bitácora documenta el caso práctico: una misma pantalla puede ser visible para varios roles sin que todos compartan las mismas acciones.

## Alcance preservado

```text
Archivos funcionales de producto modificados: 0
Matriz de permisos modificada: 0
UI del importador modificada: 0
Store modificado: 0
Datos modificados: 0
Reimportación: no
Escrituras operativas: 0
Functions/Rules: no
Producción: intacta
```

Los conteos permanecen:

```text
Clientes: 414
Aseguradoras: 26
Asesores: 7
Referencias históricas: 91
Credenciales: 26
Colombia: intacta
```

## Siguiente acción exacta

Ejecutar una sola validación estática. Debe aprobar sintaxis, contrato 1.0.35, validador 1.0.29, revisión role-aware, contrato owner, manifiesto local 9/9 e idempotencia 27/27, sin secrets, navegador, Firestore, bóveda ni deploy.

Solo evidencia estática `ok:true` podrá autorizar un nuevo gate dirigido. Si la misma etapa falla, se congela sin reintento.
