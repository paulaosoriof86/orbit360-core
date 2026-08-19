# Orbit 360 — F2 Request06 rootfix successor rebind

Fecha: 2026-08-19
Gate único: `f2-productive-acceptance-exact-successor-v20260818`
Clasificación: `VALIDATOR_STALE`

## Evidencia antes del rebind
El router canónico fue ejecutado primero en run `32309043863` y dio PASS exclusivamente sobre el predecessor artifact `9345207863`. Esto confirma que el gate histórico estaba sano pero seguía fijado al candidato anterior.

## Candidata sucesora
- artifact: `9385306424`
- source: `b94b2ae86d26586a68d33be9edba8715e956b02e`
- ZIP SHA256: `81a96f476fd0fdfd814b3f047951ce653fd324bef8a6d96d6ee6fe44dd7bdcf4`
- manifest SHA256: `cc6170121ed61fd6d9cde867dfcae8a3dd23d29777c6ee28c240d70e49843eef`
- manifest status: `FASE_A_PRODUCT_F2_REQUEST06_ROOTFIX_SUCCESSOR_CERTIFIED`
- archivos: 194
- delta: `core/queries.js`
- build run: `32307750282`

## Estado
`PENDING_REBIND_SOURCE_ONLY`. No es PASS todavía. Runtime, secrets, Firebase, browser, writes, deploy y producción permanecen bloqueados. La evidencia histórica del artifact 9345207863 se preserva y no se reescribe.

## Siguiente acción
Ejecutar una sola validación SOURCE-only del mismo gate sobre artifact 9385306424. Solo si PASS se sella `CLOSED_PASS` y se abre la frontera de autorización de Request07.
