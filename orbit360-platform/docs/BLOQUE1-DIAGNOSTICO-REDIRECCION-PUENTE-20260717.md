# Bloque 1 · redirección de página puente

Run: `29625830408`

`page.goto` termina en `ays-lab-preview.html`. La página puente redirige después a `index.html` con backend, tenant y runtime canónicos.

Clasificación: `VALIDATOR_STALE` / `PIPELINE_MECHANISM_FAILURE`.

Corrección: esperar la redirección mediante `page.waitForURL` con `waitUntil: domcontentloaded`, sin esperar el evento global `load`.

El `SyntaxError` continúa abierto hasta obtener archivo y línea. No se modifica producto ni datos.

Carriles: A preservado; B validador corregido; C 414/26/7 preservados.

Claude/Academia: documentar el lifecycle puente → destino y no confundirlo con readiness funcional.

Solo `ok:true` habilita revisión visual.
