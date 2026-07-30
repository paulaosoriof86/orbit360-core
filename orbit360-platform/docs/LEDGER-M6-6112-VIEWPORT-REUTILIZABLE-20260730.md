# Ledger reusable M6 6.1.12 — viewport y actionability semántica

Fecha: 2026-07-30  
Proyecto: Orbit 360  
Clasificación reusable: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`  
Infraestructura/evidencia interna: `BACKEND_PROTEGIDO_NO_CLAUDE`

## Hallazgo

Un elemento puede estar presente, CSS-visible y geométricamente estable sin que su centro esté dentro del viewport. Un validator que reemplaza una interacción de Playwright por `elementFromPoint()` debe reproducir explícitamente el scroll automático que la API de Playwright hacía antes de comprobar actionability.

## Patrón reusable

La actionability de una interacción automatizada debe validarse por capas:

1. **DOM** — el elemento existe y sigue conectado;
2. **visibilidad** — no está oculto por CSS;
3. **viewport** — el objetivo se desplaza a una región accionable;
4. **estabilidad** — su geometría deja de cambiar después del scroll;
5. **coordenadas** — el centro está dentro de `window.innerWidth/innerHeight`;
6. **hit-test** — `elementFromPoint()` resuelve el target o un descendiente;
7. **despacho** — el evento realmente se ejecuta;
8. **resultado funcional** — aparece el estado esperado, no solo ausencia de error.

Saltar cualquiera de estas capas puede convertir una prueba de automatización en un falso negativo y hacer que el equipo modifique producto sano para satisfacer un validator defectuoso.

## Evidencia del caso

Recovery 6.1.12:

```text
run: 30549026522
artifact: 8762009928
runtime: ready-read-only
clientes: 414
aseguradoras: 26
alias country → pais: PASS
snapshots completos: PASS
write guard: PASS
cardCount: 26
geometryStable: true
centerHit: false
clickDispatched: false
rollback: PASS
writes: 0
```

Clasificación: `VALIDATOR_STALE`.

Causa raíz: `SEMANTIC_CARD_HITTEST_MISSING_SCROLL_INTO_VIEW`.

## Fix reusable

El validator `20260730.6` incorpora:

- `scrollIntoView({block:'center', inline:'center', behavior:'auto'})`;
- estabilización geométrica posterior al scroll;
- prueba `centerInsideViewport`;
- hit-test solo con coordenadas válidas;
- `hitDescriptor` sanitizado;
- click DOM canónico;
- comprobación del resultado funcional;
- repetición por viewport/rol.

## Qué sí debe viajar a próximas candidatas / Claude

- patrón de actionability por capas;
- no confundir `visible` con `in viewport`;
- no usar `force:true` como solución por defecto;
- no retirar animaciones aprobadas solo para hacer pasar automatización;
- conservar evidencia sanitizada de la capa exacta que falló;
- distinguir `event dispatched` de `functional result`;
- validar interacción en desktop/tablet/mobile cuando el owner es responsive.

## Qué no debe viajar a Claude

- project IDs;
- tenant real;
- secrets;
- Rules completas;
- URLs internas de infraestructura;
- hashes/digests internos;
- credenciales;
- detalles de service accounts.

## Gate de empalme futuro

Una candidata futura no debe reintroducir validators que:

- hagan hit-test fuera del viewport;
- interpreten `elementFromPoint(null/otro)` como defecto funcional sin diagnosticar coordenadas;
- usen `force:true` para ocultar un problema de actionability;
- alteren CSS/producto sano para estabilizar un test;
- declaren éxito por `conclusion` cuando el `outcome` real falló.

Estado: patrón documentado y validator 20260730.6 preparado; recovery 6.1.14 aún inerte.
