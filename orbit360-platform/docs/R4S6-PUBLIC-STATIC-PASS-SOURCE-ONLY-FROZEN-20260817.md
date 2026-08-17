# R4S6 pública exacta — static PASS — source-only frozen

Fecha: 2026-08-17

## Resultado

La R4S6 durable certificada quedó publicada en `https://app.aysseguros.com` mediante extracción manual en HostDime confirmada por la usuaria y fue verificada después de la extracción con identidad pública estática exacta.

- ZIP: `orbit360-fase-a-product-r4s6-395f15d9c2e1.zip`
- ZIP SHA256: `00b283a69511735dbcd8d662b5d95ab0d02895a38fbf90770590754f253f3d2c`
- source: `395f15d9c2e1fac2949763947834b88a9b521207`
- manifest: `FASE_A_PRODUCT_R4S6_MINIMAL_SUCCESSOR_CERTIFIED`
- fileCount: `194`
- durable artifact: `9271052165`

## Verificación pública post-extracción

Se reutilizó el verificador estático ya existente, sin crear nueva ruta runtime. Run `31977091920`, rerun job `95363727145`: SUCCESS.

Evidencia:
- artifact `9285719686`
- digest `sha256:bdde962bd57416a79be5a5594dcf597fb0ae07ab553326704fc0bbc9b3a587ae`

Bytes observados:
- manifest SHA256 `bbc3085df74a3ad80026425fde390078e28de740930141ca81906b923ebf8a8d`
- index SHA256 `125b24a3fc215a368a7183a107cd55eb5a6332fc8a7f8354ed94e3169340ec4e`
- access SHA256 `624f7538809dbea59294a2c94a4acce58f326b0812625754891fb7b0fa4d3e1f`
- auth product SHA256 `d0bb399fe0e1dd102a03950673044eda5bc8d181e4e98cf477d22d141aa7b3a8`
- queries SHA256 `b906c1d3382a9fad310695b0ce2c8e7f49a2bf99fe9b9ed674a8df7e0fcbbb7b`
- client visual SHA256 `5493a18acba2d2055c301bf576c46050959ddb6b2f74e7ca4293ee77f815604f`
- Cliente 360 SHA256 `5ac3f042add37ea45582cc88c670c5bcff139937dac406d9561e25f1b9962f9e`
- policy receipts owner SHA256 `3323f09b812d6e3accc8cd151fe28ec3fab2fffa6c41ad622a2f8a147046887b`

El gate canónico pasó antes y después de la observación pública. No hubo browser, runtime, Auth, datos, Rules, store, main ni merge. Firestore/Auth/operational writes: `0/0/0`.

## Freeze

El workflow de smoke certificado continúa con `ORBIT360_R4_CERTIFIED_SOURCE_ONLY='true'`, por lo que browser/runtime siguen físicamente bloqueados.

El contrato/workflow de smoke aún está enlazado a la identidad R4S5. Esto no afecta la publicación ni la seguridad porque `SOURCE_ONLY=true`, pero se clasifica como `VALIDATOR_STALE_PENDING_R4S6_SOURCE_ONLY_REBIND_BEFORE_ANY_RUNTIME`. No se autoriza ni se ejecuta runtime hasta corregir ese binding y obtener PASS source-only.

## Estado

- funcional: `100%`
- técnico: `96%`
- go-live gates: `2/3 = 67%`
- R4S6 pública exacta: PASS
- Gate 3 `POST_GO_LIVE_SMOKE_PASS`: abierto

## Siguiente acción

Rebind atómico source-only del smoke certificado desde R4S5 a R4S6 exacta, conservando `SOURCE_ONLY=true`, seguido de gate canónico/source-only. Solo con autorización expresa posterior o combinada podrá ejecutarse una única matriz read-only Dirección desktop / Operativo tablet / Asesor móvil.
