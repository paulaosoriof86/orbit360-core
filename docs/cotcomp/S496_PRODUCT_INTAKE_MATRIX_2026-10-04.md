# CotComp S4.96 — Matriz canónica de intake

Fecha: 2026-10-04.

## Guatemala

Auto / movilidad
- Intake: tipo, uso, año, marca, línea/modelo, valor aproximado, conductor joven cuando aplique, equipo especial, cobertura objetivo, forma de pago y prioridad.
- Estado: HYBRID_REQUIRED.
- Base: auditoría multiproducto GT; binding final provider-side.

Salud / gastos médicos
- Intake: modalidad, fecha de nacimiento titular, género tarifario solo si la fuente lo requiere, cónyuge y fecha, hijos y fechas de nacimiento, maternidad, dental, territorio y prioridad.
- Estado: HYBRID_REQUIRED.
- Base: fuentes GT auditadas.

Hogar
- Intake: tipo de inmueble, uso, valor de estructura, valor de contenido y prioridad.
- Estado: binding operacional pendiente según producto.

Vida / ingreso
- Intake: momento de vida, dependientes, ingreso a proteger, horizonte y prioridad.
- Estado: CONSULTATIVE_REQUIRED.

Empresa
- Intake: sector, tamaño, empleados, exposición, valor aproximado de activos y prioridad.
- Estado: CONSULTATIVE_REQUIRED.

Transporte / carga
- Intake: rol en la cadena, unidades, tipo de carga, trayecto, punto crítico, valor por despacho y prioridad.
- Estado: HYBRID_REQUIRED.

Contrato / obligación / proyecto
- Intake: tipo de obligación, monto, vigencia y prioridad/amparos.
- Estado: CONSULTATIVE_REQUIRED.

Revisión de póliza existente
- Intake: ramo, renovación, prima actual, qué cambió y prioridad.
- Estado: HYBRID_REQUIRED.

No sé cuál necesito
- Intake: qué quiere proteger y qué cambió.
- Estado: MORE_DATA_REQUIRED.

## Colombia

Auto / movilidad
- Intake base: tipo, uso, año, marca, línea/modelo, valor aproximado, condiciones aplicables, cobertura, pago y prioridad.
- Estado: CONSULTATIVE_REQUIRED.
- Motivo: no existe rater público certificado para web en el corte vigente.

Salud privado
- Intake base: composición, fechas de nacimiento, dependientes, territorio/opciones y prioridad según fuente.
- Estado: CONSULTATIVE_REQUIRED.
- Regla: no sustituye EPS.

Hogar
- Intake: tipo de inmueble, uso, valor de estructura, valor de contenido y prioridad.
- Estado: binding operacional pendiente según producto.

Vida / ingreso
- Intake: momento de vida, dependientes, ingreso a proteger, horizonte y prioridad.
- Estado: CONSULTATIVE_REQUIRED.

Empresa
- Intake: sector, tamaño, empleados, exposición, valor aproximado de activos y prioridad.
- Estado: CONSULTATIVE_REQUIRED.

Transporte / carga
- Intake base: rol, unidades, carga, trayecto, punto crítico, valor y prioridad.
- Intake especializado: despacho específico vs programa anual, modo terrestre/aéreo/marítimo/multimodal, origen, destino, valor a proteger, máximo por despacho y movimiento anual.
- Estado: CONSULTATIVE_REQUIRED salvo habilitación posterior por fuente/producto.

Contrato / obligación / proyecto
- Intake: tipo de obligación, monto, vigencia y prioridad/amparos.
- Estado: CONSULTATIVE_REQUIRED.

Revisión de póliza existente
- Intake: ramo, renovación, prima actual, qué cambió y prioridad.
- Estado: HYBRID_REQUIRED.

No sé cuál necesito
- Intake: qué quiere proteger y qué cambió.
- Estado: MORE_DATA_REQUIRED.

## Reglas

- Esta matriz no autoriza cotización automática.
- CONSULTATIVE_REQUIRED no puede mostrarse como cotización instantánea.
- HYBRID_REQUIRED permite captura digital parcial y continuidad humana cuando corresponda.
- Cuando el provider-side schema real esté autorizado, ese schema versionado prevalece.
- Si no existe schema compatible, la ruta debe fallar cerrado hacia revisión asistida.
- Marca → Línea/modelo → Año es solo una parte del intake de Auto, no el formulario completo.
