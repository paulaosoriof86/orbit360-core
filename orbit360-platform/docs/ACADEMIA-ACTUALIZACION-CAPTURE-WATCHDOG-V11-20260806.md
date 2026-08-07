# Academia — actualización capture watchdog v11 — 2026-08-06

## Diferencia que debe enseñarse

Un checkpoint visual puede fallar por dos familias distintas:

1. **FUNCTIONAL_DEFECT:** la ruta está viva y observable, pero la función o el contenido esperado falla.
2. **PIPELINE_MECHANISM_FAILURE:** el mecanismo de prueba pierde progreso, termina el navegador o no conserva evidencia durable.

En v11, Dirección autenticó y cargó Inicio. La captura posterior quedó sin checkpoints y el supervisor cerró el proceso por inactividad. La etiqueta `DIRECCION_NAVIGATE_CLIENTE360` fue el punto donde se observó la página cerrada, no una prueba de que Cliente 360 fallara.

## Patrón operativo

- Toda captura debe tener límite menor que el idle timeout del supervisor.
- START y heartbeats deben cambiar el checkpoint durable.
- La captura es evidencia auxiliar y no puede cerrar la sesión funcional.
- Ante timeout, se desacopla solo la sesión CDP y se continúa con advertencia no bloqueante.
- Un request consumido nunca se reutiliza aunque la causa raíz ya esté corregida source-only.

## Evidencia

```text
PASS_CAPTURE_WATCHDOG_SOURCE_ONLY: 17/17
PASS_PLAYWRIGHT_155_CAPTURE_PATCHABILITY
captura sintética colgada: timeout 350 ms
contextCloseCalls: 0
browserCloseCalls: 0
pageStillUsable: true
runtime/source-only: no ejecutado
```

## Estado pedagógico

La causa raíz del mecanismo está corregida y validada source-only. `PASS_VISUAL_POST_AUTH` continúa pendiente de una futura autorización runtime nueva; no debe enseñarse como cierre visual logrado.
