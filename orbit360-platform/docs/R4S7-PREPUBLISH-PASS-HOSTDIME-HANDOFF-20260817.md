# Orbit 360 A&S — R4S7 prepublish PASS · HostDime handoff

Fecha: 2026-08-17  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  

## Autorización activa

Publicar exclusivamente R4S7 durable certificada:
- artifact `9287314053`
- ZIP `orbit360-fase-a-product-r4s7-ce9792e3e4e3.zip`
- ZIP SHA256 `4c249faa4ccf05d0bb0bc8fa4b8bb5dca07de17838cd9fb4816c5eb15b66944a`
- source `ce9792e3e4e37b298d2eda6f65983c683d66a3a3`
- manifest `FASE_A_PRODUCT_R4S7_MINIMAL_SUCCESSOR_CERTIFIED`
- manifest SHA256 `8f74f310ae8b56aa005ac7388c38db717960f0fe70c5ae4e0ef3347c72c03de4`
- único delta de producto `core/client-insurer-visual-contract-v20260720.js` SHA256 `573a45da2f7dae3803e8dff86ff651ba58f5be507cf85b04a80863ac15bb4390`.

## Prepublish

Run `32046032494`, job `95434050384` → SUCCESS.

PASS:
- gate canónico antes;
- artifact wrapper exacto SHA256 `20d04e459e143f7ec21bd3db28576a1a3dc6e7ad4342bcad0011800cee787c1d`;
- ZIP interior exacto;
- manifest/owner/Cliente360/queries/index exactos;
- R4S6 pública actual exacta antes de sustitución;
- gate canónico después.

Evidence artifact `9292918571`, digest `ff0a1b9ed0297f6ad6a202058cf5a8c9261e64caae2acaaa16ac0d27044abbee`.

## Frontera manual indispensable

No existe transporte conectado a HostDime desde este entorno. La publicación requiere una única acción manual ya conocida:

1. Abrir HostDime File Manager.
2. Ir a `/home/ayssegur/public_html/app.aysseguros.com`.
3. Subir el ZIP interior exacto `orbit360-fase-a-product-r4s7-ce9792e3e4e3.zip` (no el wrapper de GitHub).
4. Extraer en esa carpeta reemplazando archivos existentes; no borrar el directorio ni cambiar rutas.
5. Confirmar extracción.

## Verificador post-extracción

Preparado pero NO ejecutado:
`.github/workflows/orbit360-r4s7-public-identity-static-v20260817.yml`.

Tras confirmación de extracción, bajo la autorización ya vigente:
- disparar una sola verificación pública estática R4S7;
- exigir hashes/manifest/source exactos;
- si PASS, actualizar estado vivo/PR y hacer refreeze/rebind source-only inmediato a R4S7;
- no ejecutar browser/runtime/matriz.

## Límites

Hasta este checkpoint no se ejecutó publicación desde este entorno, browser, runtime, matriz, Auth, datos, Rules, store, main ni merge. R4S6 sigue siendo la identidad pública hasta que HostDime sea sustituido y la identidad pública R4S7 pase el verificador estático.
