# Ledger reusable M6 — actionability de validadores

Fecha: 2026-07-30  
Origen: recovery M6 6.1.10

## Patrón reusable

| Hallazgo | Regla reusable | Clasificación |
|---|---|---|
| Playwright agotó el click antes de despachar el evento porque la tarjeta no cumplía su criterio interno de estabilidad | Diferenciar fallo de actionability del instrumento de fallo funcional del handler. Antes de declarar defecto de UI, probar que el evento realmente fue despachado. | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` |
| La UI aprobada tiene transiciones/hover y owners asíncronos aditivos | Para smoke contractual, esperar estabilidad geométrica, comprobar hit-test y luego ejecutar el mismo handler DOM; no eliminar animaciones del producto para hacer pasar el gate. | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` |
| Un locator visible puede no ser actionability-stable para una herramienta aunque sea un target válido | Registrar por separado `visible`, `geometryStable`, `centerHit` y `clickDispatched`; solo después validar el resultado funcional. | `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR` |

## No enviar a Claude

No se envían proyecto Firebase, tenant real, credenciales, IAM, Rules, URLs internas, hashes de evidencia ni scripts de deploy. Eso permanece `BACKEND_PROTEGIDO_NO_CLAUDE` / `TENANT_AYS_ONLY`.

## Empalme futuro

Una candidata no debe:

- retirar animaciones o estilos aprobados únicamente para satisfacer automatización;
- sustituir un fallo de actionability por `force:true` sin hit-test;
- confundir “el click no fue despachado” con “la función de la ficha está rota”;
- declarar PASS sin demostrar target visible, estable, no cubierto y resultado funcional posterior.
