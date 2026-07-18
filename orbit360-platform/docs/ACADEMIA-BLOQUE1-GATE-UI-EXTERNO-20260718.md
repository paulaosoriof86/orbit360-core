# Academia Orbit 360 · Gate por interfaz externa

Un gate funcional debe probar el mismo camino que usa una persona: completar el formulario, enviarlo y observar el cambio visible de estado. Invocar funciones internas con `page.evaluate` puede bloquear el hilo que se intenta validar y no representa la experiencia real.

Para acuerdos legales, la evidencia correcta es la existencia de un único modal, el cambio del checkbox, la habilitación del botón y la desaparición del modal tras aceptar.

Este patrón se clasifica como `PIPELINE_MECHANISM_FAILURE`: el producto puede estar correcto mientras el mecanismo de prueba impide o sustituye el flujo real.
