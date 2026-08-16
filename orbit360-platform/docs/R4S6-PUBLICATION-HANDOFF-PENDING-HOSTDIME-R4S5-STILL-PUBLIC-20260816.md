# Orbit 360 A&S — R4S6 publication handoff pending HostDime

Fecha: 2026-08-16  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open · sin merge

## Estado

La autorización vigente cubre publicar exclusivamente la R4S6 durable exacta, verificar identidad pública estática y refreeze source-only. No autoriza browser/matriz/runtime/Auth/datos/Rules/store/main/merge.

R4S6 autorizada:
- artifact `9271052165`
- ZIP `orbit360-fase-a-product-r4s6-395f15d9c2e1.zip`
- ZIP SHA256 `00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c`
- source `395f15d9c2e1fac2949763947834b88a9b521207`
- manifest `FASE_A_PRODUCT_R4S6_MINIMAL_SUCCESSOR_CERTIFIED`
- 194 archivos, 2 deltas, 192 no-delta exactos.

## Prepublish

Run final `31976926769` PASS:
- gate canónico PASS antes y después
- artifact/ZIP/manifest R4S6 exactos
- dos hashes delta exactos
- baseline público R4S5 exacto
- browser/runtime/deploy false
- writes 0.

El run previo `31976863923` falló por `PIPELINE_MECHANISM_FAILURE / PUBLIC_MANIFEST_RESPONSE_UNGUARDED_JSON_PARSE`; no tocó producción. Se corrigió solo observabilidad/guard del validador.

## Verificación pública posterior

Se ejecutaron dos observaciones estáticas autorizadas:
- `31977040423`: FAIL en identidad pública, sin alterar producto ni producción.
- `31977091920`: FAIL con observabilidad suficiente; no se harán más reintentos hasta que exista transporte/publicación real.

El segundo run observó exactamente R4S5 pública:
- manifest status `FASE_A_PRODUCT_R4S5_MINIMAL_SUCCESSOR_CERTIFIED`
- source `5474a1a9af64c018e6dcc71b4ad0cdfe57ce0484`
- manifest SHA256 `c527d400d4c55e1469140a21dd7d31fb310e5de48ac0f3f465b5d50a19822b63`
- `core/client-insurer-visual-contract-v20260720.js` SHA256 `ad6fa96614d4eefe29880fac26a1c349ae24940adc2d8ff75ad04d991595b067`
- `modules/cliente360.js` SHA256 `665f3499a4eb6a1eafa723543a73bdd7057de344b2daf61776b6701ff3e3fbd9`
- index/access/auth/queries/policy-owner también permanecen en hashes certificados R4S5.

Clasificación vigente: `ENVIRONMENT_FAILURE / HOSTDIME_PUBLICATION_NOT_EXECUTED`.

No hay publicación parcial ni mezcla de versiones: la evidencia observa R4S5 exacta en los tres identificadores diferenciales.

## Freeze

El workflow `.github/workflows/orbit360-r4-certified-product-readonly-smoke-v20260815.yml` continúa con `ORBIT360_R4_CERTIFIED_SOURCE_ONLY: 'true'`. Browser/runtime no están habilitados.

## Transporte

No existe conector disponible para HostDime/cPanel/SFTP/FTP. El artifact durable fue descargado y se extrajo localmente el ZIP interno exacto para handoff manual. El único paso pendiente es subir y extraer ese ZIP en `/home/ayssegur/public_html/app.aysseguros.com`, reemplazando archivos existentes.

La autorización de publicación actual sigue siendo válida para esa identidad exacta; no requiere una nueva autorización. Tras confirmación de extracción, corresponde una sola nueva verificación pública estática R4S6 y refreeze source-only. No se repetirá la observación mientras R4S5 siga publicada.

## Estado de release

- funcional: 100%
- técnico: 93%
- gates: 2/3 = 67%
- público actual: R4S5 exacta
- R4S6: durable certificada y autorizada para publicación, todavía no publicada
- Gate 3 `POST_GO_LIVE_SMOKE_PASS`: abierto

Claude: `REPLICABLE_CLAUDE_ACUMULADO`.  
Academia: `ACADEMIA_ACTUALIZAR`.
