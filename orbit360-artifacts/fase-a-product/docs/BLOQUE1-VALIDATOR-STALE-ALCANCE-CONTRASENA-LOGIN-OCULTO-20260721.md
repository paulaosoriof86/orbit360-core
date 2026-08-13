# Bloque 1 — Validador obsoleto por alcance global del campo de contraseña

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato general: `1.0.35`  
Contrato del validador Cliente 360: `1.0.28`

## Clasificación

- `VALIDATOR_STALE`
- Código: `GLOBAL_HIDDEN_LOGIN_PASSWORD_INPUT_COUNTED_AS_INSURER_FIELD`

## Evidencia

Gate dirigido:

```text
Run: 29885950401
Artifact: 8516531256
Digest: sha256:26bdf4105f481ad3f5d56edfcf9fed54d8acd145df099c8aa3033f252f7b31c9
HEAD: 2c47c24186a2aed48b7490c34655bbbd438b8221
Preflight: GO_GATE_CONTRACT
Integridad remota: 9/9 activos exactos
Motivo de inactividad: aprobado
Primer fallo nuevo: INSURER_SECURE_CREDENTIAL_UI_MISSING
```

El gate avanzó más allá del directorio y confirmó que la corrección `20260721.4a-first-visible-complete` resolvió el motivo de inactividad.

## Causa raíz

La validación de Plataformas comprobaba correctamente:

- existencia de tarjetas operativas;
- acciones Abrir y Copiar;
- existencia de cajas de acceso protegido;
- ausencia de texto técnico o contraseñas visibles.

Sin embargo, la condición de campos de contraseña usaba:

```text
document.querySelectorAll('input[type="password"]').length
```

Ese selector contaba todo el documento. Después de autenticar, `core/auth.js` oculta `#login` con `display:none`, pero no elimina el formulario del DOM. Por eso `#lg-pass` seguía existiendo aunque no perteneciera a Aseguradoras ni fuera visible.

La UI de Aseguradoras no creó un campo de contraseña. El validador mezcló dos superficies distintas:

1. formulario de acceso oculto;
2. ficha operativa de la aseguradora.

## Corrección

Archivo:

```text
tools/orbit360-runtime-check-client360-v20260716.mjs
Commit: 5b1e086b29a2b1aa0147c0f5ea615d7e417a67aa
Contrato: 1.0.28
Revisión: insurer-view-password-scope-v1
```

La comprobación ahora registra por separado:

```text
passwordInputsInInsurerView
hiddenLoginPasswordInputs
```

El requisito de seguridad permanece estricto:

```text
passwordInputsInInsurerView === 0
```

El alcance válido es únicamente:

```text
#asg-ficha input[type="password"]
.m1-portal-card input[type="password"]
```

El campo oculto del login se informa como diagnóstico, pero no se interpreta como un campo de Aseguradoras.

## Contrato estático

Archivo:

```text
orbit360-platform/tools/orbit360-aseguradoras-owner-contract-v20260717.js
Commit: 2d96efa0b67332053ed16ef61bc14d6ab6fcc68d
```

El contrato exige:

- validador Cliente 360 `1.0.28`;
- revisión `insurer-view-password-scope-v1`;
- selector limitado a la ficha y tarjetas de portal;
- evidencia separada del login oculto;
- prohibición explícita de volver al conteo global.

## Impacto en Academia

La Academia M1 `1.225` ya enseña que los accesos se recuperan temporalmente desde un proveedor seguro y que las contraseñas no se persisten como texto visible. También distingue entre `FUNCTIONAL_DEFECT` y `VALIDATOR_STALE`.

No se añade una lección duplicada. Esta bitácora documenta la aplicación concreta: una prueba de seguridad debe medir la superficie funcional correcta sin confundir elementos ocultos de otra etapa del flujo.

## Alcance preservado

```text
Archivos de producto modificados: 0
UI de Aseguradoras modificada: 0
Auth modificado: 0
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

Ejecutar una sola validación estática. Debe aprobar sintaxis, contrato 1.0.35, owner contract, alcance de contraseña `1.0.28`, manifiesto local 9/9 e idempotencia 27/27, sin secrets, navegador, Firestore, bóveda ni deploy.

Solo evidencia estática `ok:true` permitirá autorizar un nuevo gate dirigido. Si la misma etapa falla otra vez, se congela sin reintento.
