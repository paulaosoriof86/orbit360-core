# Root fix de captura visual CDP — Bloque 12

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Clasificación

`PIPELINE_MECHANISM_FAILURE` con `STOP_RETRY` aplicado al mecanismo `Playwright page.screenshot`.

## Evidencia

- run funcional base `30962756387`: 18/18 escenarios PASS;
- run visual `30967972527`: gate 26/26, cuatro Functions PASS, Hosting PASS e integridad A&S PASS;
- Cliente 360 y Aseguradoras se capturaron;
- `page.screenshot` volvió a agotar timeout al capturar Pólizas;
- A&S permaneció sin cambios y los recursos temporales se retiraron.

## Causa raíz

El helper `page.screenshot` ejecuta estabilizaciones internas —incluido control de animaciones y superficie— antes de capturar. En vistas dinámicas del shell acumulativo esa estabilización puede no finalizar, aunque el DOM ya esté renderizado y no existan errores funcionales.

## Solución

Se retira `page.screenshot` del arnés del Bloque 12 y se usa directamente el protocolo de Chromium:

```txt
Page.captureScreenshot
captureBeyondViewport: false
fromSurface: true
```

La imagen se valida por firma PNG y cada llamada queda protegida por timeout externo. Página, sesión CDP y Chromium se cierran en `finally`.

## Prueba previa obligatoria

La sustitución fue probada de manera sintética antes de otro deploy LAB:

- estado: `CDP_SCREENSHOT_SYNTHETIC_PASS`;
- bytes PNG: 22518;
- red/Firebase/secrets/escrituras/deploy: no.

## Alcance de la continuidad

- reutiliza el runtime funcional 18/18;
- no repite escenarios funcionales;
- no crea tenant ni usuarios sintéticos;
- despliega solo cuatro Functions allowlisted y Hosting preview LAB;
- verifica ocho rutas visuales;
- exige integridad read-only before/after;
- sin Rules, reimportación, producción, main ni merge.

## Impacto Claude

`REPLICABLE_CLAUDE_ACUMULADO`: patrón de evidencia visual determinista, sin datos ni configuración A&S.

## Impacto Academia

`ACADEMIA_ACTUALIZAR`: diferencia entre producto funcional y mecanismo de captura; aplicación de `STOP_RETRY` cuando la misma familia de fallo reaparece.
