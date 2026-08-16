# Orbit 360 A&S — R4S5 publicación — transporte HostDime no disponible al executor — 2026-08-16

## Estado

`ENVIRONMENT_FAILURE / HOSTDIME_AUTHENTICATED_TRANSPORT_UNAVAILABLE_TO_EXECUTOR`

La autorización de publicación R4S5 está vigente, pero **la sustitución pública no se ejecutó**. La versión visible sigue siendo R4S4. No se debe declarar R4S5 publicada hasta que el transporte autenticado al document root de HostDime haya ocurrido y el verificador público R4S5 obtenga PASS.

## Autorización vigente

Se autorizó exclusivamente publicar el artifact durable `9270227820`, ZIP `orbit360-fase-a-product-r4s5-5474a1a9af64.zip`, SHA256 `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`, sin reconstrucción ni cambios de producto; luego verificar identidad pública estática y refreeze. No browser/matriz, Auth, datos, Rules, store, main ni merge.

## Prepublish ejecutado

Workflow: `.github/workflows/orbit360-r4s5-prepublish-exact-artifact-gate-v20260816.yml`.

Run `31973133583` / job `95228556232` → **SUCCESS**.

Evidencia durable:
- artifact `9270227820` presente y no expirado;
- digest wrapper `9adc9d53c1e1a1d2a2eb15223d63feadb849ac3f2abed0638dcf57b83a1852f4`;
- único archivo interno `orbit360-fase-a-product-r4s5-5474a1a9af64.zip`;
- SHA256 ZIP interno `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`;
- manifest `FASE_A_PRODUCT_R4S5_MINIMAL_SUCCESSOR_CERTIFIED`;
- source/delta `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`;
- 194 archivos, 193 no-delta;
- delta único `core/client-insurer-visual-contract-v20260720.js`;
- owner SHA256 `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`;
- `core/queries.js` SHA256 `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`.

El gate canónico pasó antes y después del prepublish.

Artifact de evidencia prepublish: `9270333406`, digest `756b558b656c8f9aff0a69c3c605b33893aa554896ddb733ba6629302fa7996f`.

## Baseline público observado

El mismo run verificó por HTTP sin navegador que `https://app.aysseguros.com` continúa sirviendo R4S4 exacta:
- manifest `FASE_A_PRODUCT_R4S4_MINIMAL_SUCCESSOR_CERTIFIED`;
- source `54f671e64b32c7b39100d79e770572a579e79ac7`;
- owner visual SHA256 `fd597c7dae108070cfb96e169a87aabaf75a57ffcb347532863f2d88631bace0`.

Por tanto no existe una publicación parcial ni una identidad ambigua.

## Causa de la detención

No es un defecto funcional ni un problema de paquete.

Se verificó que:
1. los workflows existentes de publicación/certificación solo construyen, recuperan artifacts o observan la identidad pública; el precedente R4S4 `orbit360-r4s4-public-identity-static-v20260816.yml` hace HTTP read-only y no transporta archivos a HostDime;
2. no existe en el repositorio un workflow establecido de HostDime/SFTP/FTP/SSH/cPanel para `app.aysseguros.com`;
3. la integración GitHub disponible no tiene permiso para enumerar/usar secretos de despliegue del repositorio (`actions/secrets` responde 403);
4. no hay plugin disponible de HostDime/cPanel/SFTP/FTP en este entorno;
5. las herramientas actuales no pueden autenticarse en el File Manager de HostDime ni efectuar un upload HTTP autenticado.

Crear credenciales, inventar nombres de secretos o construir un transporte nuevo sin evidencia violaría el control de causa raíz y la regla de no alucinar.

## Handoff externo mínimo

Document root vigente: `/home/ayssegur/public_html/app.aysseguros.com`.

El único archivo autorizado para el handoff es `orbit360-fase-a-product-r4s5-5474a1a9af64.zip` SHA256 `2d7a2ae75c5e6ef04c4759ff3438d41b8589d542fc20f14a603aaffb2053a1ac`.

La operación externa debe consistir únicamente en cargar ese ZIP exacto al document root y extraerlo allí sustituyendo los archivos existentes. No reconstruir, editar, renombrar contenido interno ni tocar configuraciones de Auth/backend/datos. R4S4 permanece como rollback inmediato.

## Verificación posterior ya preparada

Quedó armado `.github/workflows/orbit360-r4s5-public-identity-static-v20260816.yml`, pero no se dispara mientras R4S4 siga pública. Después del handoff externo se activará dentro de la misma autorización vigente y validará por hash:
- `index.html`;
- manifest R4S5;
- `core/access-scope.js`;
- `core/auth-product-runtime-p0.js`;
- `core/queries.js`;
- `core/client-insurer-visual-contract-v20260720.js`;
- owner estable de policy receipts.

Solo con PASS se actualizará la identidad pública a R4S5 y se ejecutará el refreeze source-only. **No se ejecutará browser/runtime/matriz.**

## Seguridad y alcance

Durante este bloque:
- producto modificado: no;
- paquete reconstruido: no;
- Auth/datos/Rules/store: no;
- browser/runtime: no;
- Firestore/Auth/operational writes: 0;
- main/merge: no;
- producción mutada: no.

## Estado rector

- funcional: 100%;
- técnico: 85%;
- gates: 2/3 = 67%;
- Gate 3 `POST_GO_LIVE_SMOKE_PASS`: abierto;
- R4S5: durable certificada y prepublish PASS, aún no pública;
- R4S4: pública e íntegra;
- autorización de publicación: vigente, no consumida por falta de transporte externo.

No se requiere una nueva autorización después del handoff externo para ejecutar la verificación pública estática y el refreeze ya autorizados. La matriz read-only seguirá requiriendo autorización separada.