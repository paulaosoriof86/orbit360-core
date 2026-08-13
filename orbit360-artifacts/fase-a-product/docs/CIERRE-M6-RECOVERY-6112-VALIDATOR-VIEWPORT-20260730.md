# Cierre técnico M6 6.1.12 — rollback seguro y causa raíz del validator viewport

Fecha: 2026-07-30  
Proyecto: Orbit 360 — A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block6-go-live-product-v20260730`

## 1. Resultado ejecutivo

M6 6.1.12 fue ejecutado con autorización explícita en bloque único. El preflight, identidad, snapshots, shell, Firestore Rules read-only, Hosting y readiness cerraron correctamente. El smoke `20260730.5` alcanzó el runtime read-only y probó el contrato de datos 414/26, alias `country → pais`, snapshots completos y write guard.

El smoke falló antes de despachar el click de la primera tarjeta de Aseguradoras. El validator había sustituido el click automático de Playwright por una verificación semántica con `elementFromPoint()`, pero no reprodujo la capacidad de Playwright de desplazar el objetivo al viewport antes de comprobar actionability.

Clasificación final: `VALIDATOR_STALE`.

Causa raíz: `SEMANTIC_CARD_HITTEST_MISSING_SCROLL_INTO_VIEW`.

El workflow ejecutó rollback automático. Producción funcional no quedó live.

## 2. Evidencia 6.1.12

- request inmutable: `tools/orbit360-m6-recovery-6112-request-v20260730.json`;
- request commit: `93b2ea9bd793c188fc730031d5e1a246cea68f51`;
- run: `30549026522`;
- artifact recovery: `8762009928`;
- digest: `sha256:6807b7ff1e4cc1c56b76656e496f2a0713c4167562519944714ff486cca60ad6`.

### PASS antes del fallo del smoke

```text
preflight canónico 6.1.12: PASS
request/binding: PASS
identidad existente: PASS
configuración Web read-only: PASS
snapshot before: PASS
clientes: 414
aseguradoras: 26
asesores fuente: 7
membership: 1
config: 1
shell productivo: PASS
Firestore Rules read-only + Hosting: PASS
Hosting readiness: PASS
runtime: ready-read-only
noFallback: true
writeEnabled: false
alias físico: pais
query plans: tenantId + pais
snapshots clientes + aseguradoras completos: true
write guard: PASS
network write candidates: 0
```

### Evidencia exacta del fallo

```text
failureStage: desktopDirection
cardCount: 26
geometryStable: true
centerHit: false
clickDispatched: false
```

La tarjeta existía y su geometría era estable. El click no fue despachado. Por tanto, el fallo no probó un defecto funcional de `modules/aseguradoras.js` ni de la ficha.

## 3. Causa raíz

El validator `20260730.5` hacía:

1. localizar 26 tarjetas;
2. esperar estabilidad geométrica;
3. calcular el centro de la primera tarjeta;
4. ejecutar `document.elementFromPoint(x, y)`;
5. exigir que el elemento superior fuera la tarjeta o un descendiente;
6. solo entonces ejecutar `el.click()`.

El paso faltante era llevar la tarjeta al viewport antes del hit-test.

`locator.waitFor({state:'visible'})` prueba visibilidad CSS/DOM, pero no garantiza que el centro del elemento esté dentro de las coordenadas visibles del viewport. En cambio, el `locator.click()` original de Playwright realizaba scroll automático. Al sustituirlo por un click semántico manual, el validator eliminó involuntariamente esa precondición.

Por eso una tarjeta podía estar conectada, visible y geométricamente estable, y aun así producir `centerHit:false` sin que hubiera overlay funcional ni fallo de la ficha.

## 4. Rollback y seguridad

El rollback 6.1.12 cerró correctamente:

```text
Firestore: deny-all
Hosting: rollback neutro
Storage: diferido fail-closed
producción funcional: NO LIVE
countsStable: true
digestsStable: true
Firestore data writes: 0
operational writes: 0
network write candidates: 0
```

No se reimportaron Clientes/Aseguradoras, no se tocaron datos, Auth, permisos, Functions, main, merge ni Pólizas.

## 5. Remediación 6.1.13 — validator only

Owner: `tools/orbit360-m6-product-browser-smoke-v20260730.mjs`.

Validator `20260730.6` / contrato futuro 6.1.14:

1. localiza 26 tarjetas;
2. ejecuta `scrollIntoView({block:'center', inline:'center', behavior:'auto'})`;
3. espera estabilidad geométrica después del scroll;
4. prueba que el centro esté dentro del viewport;
5. ejecuta `elementFromPoint()` solo con coordenadas válidas;
6. conserva un `hitDescriptor` sanitizado para diagnóstico;
7. exige que el hit sea tarjeta/descendiente;
8. despacha el click DOM canónico;
9. exige la aparición de `#asg-ficha`;
10. repite la prueba en Dirección desktop, Operativo tablet y Asesor móvil.

No se modificó Aseguradoras para satisfacer el validator.

### Evidencia estática

- run remediación: `30549826785` — PASS;
- recovery del run: SKIPPED;
- capacidades de riesgo: cero.

## 6. Paquete completo 6.1.14 — preparado e inerte

Run de validación del paquete completo: `30550203684`  
Artifact: `8762433336`  
Digest: `sha256:8d65d3882c864fcaaa9910b51b91c99d09036138473bac646a0d7d0810074d66`  
Recovery productivo: SKIPPED.

El paquete estático valida:

```text
root cause 6.1.12: CLOSED
validator 20260730.6: PREPARED
scroll into viewport: REQUIRED
geometry post-scroll: REQUIRED
centerInsideViewport: REQUIRED
hit-test semántico: REQUIRED
click despachado: REQUIRED
ficha Aseguradoras: REQUIRED
contrato 414/26: PRESERVADO
country → pais: PRESERVADO
snapshots completos: PRESERVADOS
lifecycle 6.1.14: PREPARED
engine 6.1.14: PREPARED
workflow estable 6.1.14: PREPARED
request 6.1.14: ABSENT
Storage: deferred fail-closed
```

## 7. Carriles

### A — Frontend / UX / Academia

- no se alteró UI aprobada;
- se preservaron transiciones y comportamiento canónico de Aseguradoras;
- validator ahora distingue visibilidad DOM de actionability real en viewport;
- Academia actualizada con el patrón.

### B — Backend / seguridad / Auth / Orbit.store

- Rules productivas quedaron revertidas a deny-all tras el fallo;
- store siguió read-only y sin fallback;
- cero escrituras;
- Storage continúa ausente/diferido fail-closed;
- no Functions.

### C — datos reales / migración A&S

- 414 clientes y 26 aseguradoras preservados;
- 7 asesores permanecen fuente, sin migración artificial;
- conteos y digests before/after iguales;
- no reimportación ni reparación de datos.

## 8. Estado y siguiente acción exacta

Estado:

`M6 6.1.12 = ROLLED_BACK_SAFE · VALIDATOR_STALE`  
`M6 6.1.13 = PASS estático`  
`M6 6.1.14 = PREPARADO / INERTE`  
`Producción funcional = NO LIVE`.

El request `tools/orbit360-m6-recovery-6114-request-v20260730.json` no existe. Reabrir Rules/Hosting/producción requiere una nueva autorización de riesgo. Ningún paso manual o técnico previo queda pendiente.

Si 6.1.14 entrega PASS, M6 se cierra y la ruta entra inmediatamente a Pólizas.
