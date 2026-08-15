# CHANGELOG R4S1 GO-LIVE · 2026-08-15

Este archivo continúa `CHANGELOG-R4-GOLIVE-20260814.md`. No reemplaza ni reinterpreta la evidencia histórica R4.

## Autorización macro

Autorizada una única sucesora mínima e inmutable del R3 usando exclusivamente `core/access-scope.js` del commit `df4c217c34722c03215f88b62f6865ab41c2a9f3`, con byte-identidad obligatoria del resto del producto. Si certificaba: backup/rollback, publicación exclusiva en `app.aysseguros.com` y una única matriz productiva read-only final. Sin reimportación, cambios Auth/datos, main ni merge.

## Generación y certificación R4S1 · PASS

Commit de certificación: `c55d1b0f2f6b30d9abd8df3ba5e951ae86f655e8`.

Workflow:

- run `31915191809`;
- job `95085878427`.

Paquete durable certificado:

- `orbit360-fase-a-product-r4s1-df4c217c3472.zip`;
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`;
- fileCount 194;
- 193 archivos de producto byte-idénticos a R3;
- 1 único delta de producto: `core/access-scope.js`;
- source del delta `df4c217c34722c03215f88b62f6865ab41c2a9f3`;
- SHA256 del delta `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`;
- bytes del delta 23908.

Artefactos:

- durable `9254713380`, digest `sha256:86aa927d2465df0c058913c3cdc83dfadb174652c74a3779156415389a95a18b`;
- evidence `9254713130`, digest `sha256:c28bcd89572fec117fde0a7084b674a60a540b4cd5258f9044509175625345fa`.

Gate:

- `fase-a-ops-leads-crm-release-lab-v20260812`;
- `PASS_GATE_CONTRACT_SOURCE_FASE_A_OPS_LEADS_CRM`;
- 13 checks PASS;
- 0 failed;
- writes autorizados 0;
- secret/data/browser/deploy/production touched = false.

Estado: `R4S1_MINIMAL_SUCCESSOR_DURABLE_CERTIFIED`.

## Producción después de certificar

Sin cambios. R3 permanece publicado:

- `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`;
- SHA256 `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`;
- fileCount 194.

No hubo parche in-place ni cambio de Auth, memberships, tenant, datos o backend.

## Transporte HostDime

Se buscaron mecanismos versionados o accesibles desde el ejecutor para `app.aysseguros.com`, `public_html`, `scp`, `rsync`, FTP y referencias a clave privada SSH. No se encontró un canal autenticado utilizable.

La integración GitHub devuelve 403 al intentar listar repository Actions secrets/variables; no se infiere el contenido de esos stores.

No se utilizan credenciales encontradas en documentos operativos ni se inventan usernames/keys.

Clasificación del límite actual:

`ENVIRONMENT_FAILURE / R4S1_AUTHENTICATED_HOSTDIME_TRANSPORT_UNAVAILABLE_IN_CURRENT_TOOLING`

No es un defecto de HostDime ni de Orbit; es ausencia de un canal seguro de mutación remota disponible al ejecutor.

## Freeze

La matriz browser final permanece congelada. No puede ejecutarse contra R3 porque la autorización exige primero publicar y verificar R4S1.

## Siguiente acción

1. backup rollback-capable del app root vivo;
2. publicación exclusiva del ZIP R4S1 certificado;
3. verificación estática del manifest y SHA de `core/access-scope.js`;
4. gate canónico;
5. exactamente una matriz productiva read-only final;
6. cero Firestore/Auth/operational writes;
7. refreeze y cierre documental.

No reconstruir R4S1. No reimportar. No modificar Auth/datos. No main/merge.

Avance: 100% funcional / 75% técnico / 67% gates hasta `POST_GO_LIVE_SMOKE_PASS`.
