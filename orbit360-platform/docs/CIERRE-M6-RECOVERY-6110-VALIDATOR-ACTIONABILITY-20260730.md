# Cierre M6 — Recovery 6.1.10 y remediación estática 6.1.11

Fecha: 2026-07-30  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate único: `block6-go-live-product-v20260730`

## Recovery 6.1.10

- request commit: `2ca7171e137b437f144f11cf47609f514239d930`
- run: `30546548132`
- recovery job: `90884094122`
- artifact: `8761009923`
- digest: `sha256:557b3c1412f3c16943c4eec5a98b598edfc813d56e64c3c5b2a1314c3c8b7f4a`

PASS antes del fallo contractual:

- preflight 6.1.10;
- identidad/config Web;
- snapshot before 414 clientes / 26 aseguradoras / 7 asesores fuente / membership 1 / config 1;
- Firestore Rules read-only + Hosting;
- bounded Hosting readiness;
- runtime `ready-read-only`;
- query alias `country → pais`;
- query plans físicos `tenantId + pais`;
- snapshots completos clientes + aseguradoras;
- baseline runtime 414/26;
- write guard;
- snapshot after e integridad.

El smoke falló únicamente al intentar `locator.click()` sobre la primera tarjeta del directorio de Aseguradoras. Playwright agotó 30 s en su chequeo interno de actionability con `element is not stable`; el evento de click no llegó a despacharse.

## Clasificación de causa raíz

`VALIDATOR_STALE`

Causa:

`PLAYWRIGHT_CARD_ACTIONABILITY_STABILITY_FALSE_NEGATIVE`

La UI aprobada conserva transición/movimiento de hover en `.asg-card`, el directorio tiene owners aditivos asíncronos y el módulo canónico sí posee handler directo `[data-asg] → ficha(id)`. La evidencia no demuestra un defecto de la función ficha; demuestra que el instrumento se bloqueó antes de ejecutar el handler.

## Seguridad y rollback

El workflow ejecutó rollback automático:

- Firestore: deny-all;
- Hosting: shell neutro;
- Storage: diferido fail-closed;
- conteos: estables;
- digests: estables;
- Firestore data writes: 0;
- operational writes: 0;
- network write candidates: 0;
- producción funcional: NO LIVE.

## Fix del instrumento

Smoke `20260730.5` / recovery futuro 6.1.12:

1. exige exactamente 26 tarjetas visibles;
2. observa varias muestras geométricas hasta estabilidad;
3. hace hit-test del centro para comprobar que no existe overlay que intercepte;
4. despacha el mismo click DOM del elemento canónico;
5. exige aparición de `#asg-ficha`;
6. conserva todas las validaciones 414/26, alias, snapshots completos, roles, write guard y cero network writes.

No se modificó `modules/aseguradoras.js`, datos, Auth, Rules ni permisos para resolver este fallo.

## Remediación estática

- 6.1.11 PASS inicial: run `30547609789`;
- paquete completo 6.1.12 PASS estático: run `30547959319`;
- artifact final: `8761524536`;
- digest: `sha256:dc767c73e75d2d16dcdce06d8854427c8f174befc89419969b96b81455a27b91`;
- recovery productivo 6.1.12: SKIPPED;
- request 6.1.12: AUSENTE.

El gate permanece congelado en 6.1.11 hasta una nueva autorización explícita de riesgo.
