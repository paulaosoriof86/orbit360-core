# Academia Orbit 360 — M6: viewport, actionability y falsos negativos del validator

Fecha: 2026-07-30

## Caso de estudio

En M6 6.1.12 el producto llegó correctamente a runtime read-only con 414 clientes, 26 aseguradoras, alias `country → pais`, snapshots completos y cero escrituras. La prueba falló antes de abrir la primera ficha de Aseguradora.

La evidencia del validator mostró:

```text
cardCount: 26
geometryStable: true
centerHit: false
clickDispatched: false
```

No había evidencia de que la ficha estuviera rota. El evento ni siquiera había sido enviado.

Clasificación correcta: `VALIDATOR_STALE`.

## Qué ocurrió

La versión anterior del smoke reemplazó un `locator.click()` de Playwright por una interacción semántica manual. La intención era evitar un falso negativo de actionability relacionado con la transición visual de la tarjeta.

El reemplazo comprobaba estabilidad y luego hacía `elementFromPoint()` sobre el centro del elemento. Sin embargo, omitió una capacidad que Playwright realizaba automáticamente: desplazar el objetivo dentro del viewport antes de hacer click.

Por eso una tarjeta podía estar presente, visible y estable, pero tener su centro fuera del viewport. El hit-test fallaba antes de que existiera interacción real.

## Lección por rol

### Dirección / owner funcional

Un test rojo no significa automáticamente que la funcionalidad esté rota. Antes de autorizar cambios de producto se debe conocer la etapa exacta donde falló la interacción.

### Operativo / QA

Registrar solo “no hizo click” es insuficiente. La evidencia mínima debe separar:

- target encontrado;
- target visible;
- target dentro del viewport;
- geometría estable;
- hit-test libre;
- evento despachado;
- resultado esperado obtenido.

### Asesor / usuario final

El usuario no debe ver mensajes técnicos del validator. La plataforma conserva estados funcionales y copy cliente; la causa raíz permanece en evidencia interna.

### Desarrollo / backend

Si la automatización falla antes del evento, no se debe ampliar Rules, cambiar datos ni reescribir el módulo para hacer pasar el test. El producto se congela y se corrige primero el validator.

## Diferencia entre defecto funcional y validator obsoleto

### `FUNCTIONAL_DEFECT`

Existe evidencia de que la interacción real fue despachada y el producto respondió de manera incorrecta: la ficha no aparece, el estado es erróneo, hay error de negocio o una acción autorizada produce un resultado inválido.

### `VALIDATOR_STALE`

El instrumento de prueba falla por una precondición incorrecta, una firma de API mal usada, una suposición vieja del DOM o un modelo de actionability incompleto. El producto no debe cambiar hasta corregir la prueba.

## Modelo reusable de actionability

Una interacción automatizada robusta valida:

`DOM → visible → scroll → estabilidad → viewport → hit-test → evento → resultado funcional`

En el caso 6.1.12 el flujo llegó hasta estabilidad y falló en viewport/hit-test. El click no fue despachado.

## Remediación 20260730.6

El smoke siguiente:

1. centra la tarjeta con `scrollIntoView`;
2. espera estabilidad después del scroll;
3. comprueba coordenadas dentro del viewport;
4. ejecuta hit-test;
5. registra descriptor sanitizado del elemento superior si falla;
6. despacha el click canónico;
7. exige la ficha;
8. repite en Dirección desktop, Operativo tablet y Asesor móvil.

No se utiliza `force:true` y no se alteran animaciones aprobadas para satisfacer el test.

## Gate y rollback

El recovery 6.1.12 ejecutó rollback al fallar el smoke. Los datos quedaron intactos y producción volvió a fail-closed. El fix posterior se validó primero sin secretos, navegador, Firestore, Rules ni deploy.

Esto materializa la regla de Orbit 360: **primero clasificar la causa, después modificar la capa responsable**.

## Regla para Academia

Cuando un gate de navegador falla, el alumno debe poder responder cuatro preguntas antes de tocar producto:

1. ¿el evento realmente se despachó?;
2. ¿el target estaba dentro del viewport y accionable?;
3. ¿el fallo pertenece al producto o al instrumento de prueba?;
4. ¿qué evidencia sanitizada permite probarlo sin exponer secretos o datos reales?

Solo después de responderlas corresponde decidir si se modifica frontend, backend, contrato de datos, entorno o validator.
