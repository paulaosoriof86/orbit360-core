# Academia Orbit 360 — M6: actionability no equivale a defecto funcional

Fecha: 2026-07-30

## Caso

En recovery 6.1.10 el runtime ya había demostrado:

- 414 clientes;
- 26 aseguradoras;
- alias físico `pais` correcto;
- snapshots completos;
- store read-only;
- write guard;
- cero escrituras.

El smoke falló después porque Playwright no consideró estable la tarjeta de Aseguradoras y nunca despachó el click.

## Aprendizaje

`VALIDATOR_STALE` aplica cuando el instrumento impide ejecutar la acción que pretende validar. No corresponde modificar producto si todavía no existe evidencia de que el handler funcional haya fallado.

La secuencia correcta es:

1. comprobar que el target existe y está visible;
2. comprobar estabilidad geométrica;
3. comprobar mediante hit-test que no existe overlay;
4. despachar la acción real del elemento;
5. verificar el resultado funcional posterior;
6. solo si el resultado funcional falla, evaluar `FUNCTIONAL_DEFECT`.

No debe usarse `force:true` para ocultar un problema de acción. Tampoco debe retirarse una animación aprobada únicamente para satisfacer automatización.

## Caso M6

El validator `20260730.5` conserva el frontend y sustituye únicamente la dependencia del actionability automático por evidencia explícita de geometría + hit-test + click DOM + ficha visible.

El aprendizaje aplica a QA, smoke tests, automatización visual y gates de cualquier módulo Orbit 360.
