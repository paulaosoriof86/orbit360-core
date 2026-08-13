# Bitácora de cambios — Cierre M1

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras + importadores seguros  
Estado: RESUELTO / CERRADO

## Necesidad

Cerrar M1 con evidencia integral y reversible para la importación segura de accesos de portales de aseguradoras, preservando Cliente 360, Aseguradoras y los datos A&S ya validados.

## Esperado

- sesión lista y tenant resuelto;
- acuerdo legal aceptado mediante UI real;
- parser y dry-run;
- confirmación reforzada;
- proveedor seguro;
- referencia opaca;
- read-after-write;
- auditoría de éxito y rechazo;
- cero secreto en store operativo;
- rollback operativo y de bóveda;
- conteos restaurados;
- evidencia sanitizada `ok:true`.

## Causas raíz corregidas

- readiness legal;
- dependencia XLSX;
- membresía multirol;
- truncamiento de roles;
- validadores obsoletos/autorreferenciales;
- checkout mutable;
- dependencias Functions;
- falso negativo posterior al deploy;
- observabilidad de revisiones;
- dependencia Secret Manager del rollback;
- residuo sintético de bóveda.

## Archivos principales

- `.github/workflows/orbit360-importers-e2e-acceptance-lab-v20260720.yml`
- `.github/workflows/orbit360-deploy-secure-provider-role-fix-lab-v20260720.yml`
- `functions/index.js`
- `functions/package.json`
- `tools/orbit360-gate-contract-overlay-importers-v20260720.json`
- `tools/orbit360-diagnose-credential-provider-auth-v20260720-v2.mjs`
- `tools/orbit360-prepare-orphan-vault-rollback-state-v20260720.mjs`
- `tools/orbit360-importers-e2e-vault-rollback-v20260720.mjs`
- documentación de causas raíz y cierre M1.

## Evidencia

```txt
run: 29783567910
HEAD: f79bcc1ddeb53dbde784c7165132ae7e33d743ae
artifactId: 8477581608
artifact digest: sha256:f2ac23413eee5af6adaf756869847c72af32df672065e885b6d58a7c246344d1
preflight: success
E2E: success
stage: completed
ok: true
rollbackOk: true
containsPII: false
containsSecrets: false
```

Conteos después del cleanup:

```txt
clientes: 414
aseguradoras: 26
asesores: 7
```

Baseline de portales preservado: 77.

## Impacto

- Importador seguro validado de extremo a extremo.
- Proveedor y revisiones confirmados remotamente.
- Ninguna reimportación de datos reales.
- Ningún secreto persistido en almacenamiento operativo.
- Ningún residuo sintético.
- No producción, `main` ni merge.

## Aplicar a prototipo base

Sí, únicamente patrones UX/metodológicos reutilizables. Backend protegido, IAM y bóveda no se comparten con Claude.

## Impacto Academia

Actualizar metodología de gates, importación segura, referencias opacas, auditorías y rollback por capas.

## Siguiente acción

Bloque 2 — bootstrap productivo read-only, sin escrituras ni deploy productivo hasta autorización explícita.
