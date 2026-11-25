# Gravicentra Insurance — ejecución y continuidad

Esta guía aplica al repositorio `paulaosoriof86/orbit360-core`. Es un consumidor
subordinado de las autoridades existentes: no crea un gate, una candidata, un
permiso ni un estado de aceptación. Las instrucciones actuales de Paula
gobiernan el encargo; conserva sus autorizaciones dentro de su alcance.

## Reanudar desde evidencia física

1. Usa la rama `recovery/fase-a-clean-20260831`; `main` no gobierna la salida.
2. Lee `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json` completo
   y comprueba el commit y el blob leídos. Resuelve desde sus punteros el cursor
   activo, el transporte, la composición, el plan y los hallazgos correspondientes.
3. Separa última LIVE aceptada, candidata pendiente y evidencia histórica.
   Un campo fechado, un texto de chat, el nombre de un archivo o un HEAD reciente
   no sustituye al puntero activo. No reinicies I1 ni impongas un corte de datos
   histórico sin contrastar el gate físico vigente.
4. Lee los contratos normativos que identifica el Control Plane y los guards
   aplicables. Conserva la evidencia previa no invalidada causalmente.
5. Identifica la primera acción pendiente concreta y ejecutable. Un impedimento
   de un registro, proveedor o frente no bloquea por sí solo los independientes.

Si el conector de contenidos devuelve un SHA con contenido vacío, verifica el
objeto antes de concluir que el archivo está vacío. Recupera el blob por su SHA
o usa `git show <commit>:<path>` y comprueba su identidad. Una limitación de
lectura no autoriza reconstruir ni sobrescribir el Control Plane desde el chat.

## Publicar el trabajo autorizado

La decisión de Dirección de publicar cada correctivo causal verificado de
inmediato ya está registrada en el repositorio. Verifica su alcance en la
autoridad vigente y consúmela: no solicites otra aprobación empresarial idéntica
ni esperes a completar frentes independientes.

Preview conserva la función de validación que exige el contrato activo. Una
prueba completada debe continuar con la siguiente acción autorizada hacia LIVE,
sin una espera manual adicional inventada. Conserva mismo artifact/digest,
compatibilidad del backend, rollback y pruebas autenticadas en producción.
No elimines un control pendiente ni atribuyas una aceptación que no ocurrió.

Recupera primero el correctivo ya existente. Si el diff y los bytes demuestran
que un cambio causal de mecanismo o QA conserva el product source y el payload
certificado, usa su vía de admisión correspondiente sin exigir reconstrucción
por inferencia. Si el contrato liga ese owner a la candidata, actualiza sus
bindings de forma explícita antes de ejecutarlo.

Cuando el ejecutor autorizado cambie de proveedor, deriva el bloqueo actual de
la evidencia del mismo request, source y artifact. Preserva el fallo histórico
del proveedor anterior. Un paquete o Hosting Preview correcto no equivale a QA
funcional, LIVE ni cierre de todo el gate.

## Trabajo paralelo sin interferencia

Puede haber lectura, investigación y preparación local en paralelo. Las
mutaciones de una release y las escrituras sobre la misma entidad se serializan
por el mecanismo vigente. No abras otra rama de salida, otro repo o Firebase.

Antes de mover la rama, verifica la coordinación del escritor y las precondiciones
vigentes. Que HEAD no haya cambiado no demuestra que no haya una promoción o un
handoff firmado en curso. El CAS de la publicación exige el padre y árbol exactos:
un commit documental concurrente también puede invalidarlo.

Durante una promoción de otra sesión, termina y prueba el cambio en un checkout
aislado. Presérvalo con sus preimágenes y evidencia para la siguiente frontera
coordinada. No muevas la rama ni cambies el Control Plane, transporte, identidad
del artifact o paquete fijado para hacer sitio a ese cambio. No anuncies como
incorporada una preparación todavía fuera de la rama canónica.

Al integrar, relee la autoridad y aplica únicamente el delta causal sobre el
estado actual. No copies un Control Plane antiguo, no fuerces refs y no omitas
una firma, un conflicto de versión o un guard. Source y composición que lo
gobierna deben quedar consistentes en la misma transición atómica.

## Evitar repetición y aceptación falsa

- Los casos reales verifican soluciones transversales; no se hardcodean personas
  ni números de póliza para conseguir una prueba verde.
- No reimportes datos para corregir UI, permisos, routing o composición.
- Preserva pagos y deltas ya aplicados. La carga documental posterior enriquece
  el movimiento existente; no lo vuelve a aplicar.
- Aplica las reglas delta-first vigentes a operaciones deterministas ya
  autorizadas. Aísla la ambigüedad concreta y conserva auditoría y readback.
- Regenera las proyecciones activas mediante su owner; comprueba la evidencia
  que las respalda, además de que sus copias coincidan entre sí.
- No alteres receipts históricos para que parezcan actuales.
- Distingue preparación local, admisión, build, Preview técnico, prueba funcional,
  publicación y prueba LIVE. Declara solamente lo comprobado.

El cierre de un defecto de mecanismo requiere su prueba discriminante y la
verificación en el ciclo real correspondiente. Un test local no certifica la
operatividad del usuario ni la sincronización integral de producción.
