# Gravicentra Insurance — estado operativo vigente I6.5/B4-003 (31-oct-2026)

> **HOLD de B4-003 y de una nueva promoción LIVE.** Esta es una lectura operativa acumulativa enlazada desde `CONTROL_PLANE.json`: no crea otro plan, otra rama ni un gate. Los estados y causas históricas permanecen intactos en los locks y en el ledger.

## Por qué el avance parecía estancado

La reconciliación del 30-oct tenía nueve correcciones de descripción propuestas, pero su propio recibo las registraba como no aplicadas a los campos históricos. El `CONTROL_PLANE` seguía mostrando `B4_003_MACHINE_PASS_PENDING_PAULA_VISUAL` mientras evidencias posteriores describían trabajo funcional, una aceptación P0 y pendientes técnicos distintos. La certificación atómica de Metas exige preservar exactamente los blobs actuales de ledger, carry y guard; modificar esas pruebas destruiría la atestación. Este tablero es la lectura **vigente** y los campos antiguos conservan significado histórico.

## Métricas que sí tienen denominador verificable

| Métrica | Valor actual | Qué mide y qué no |
| --- | ---: | --- |
| Puertas formales I6 cerradas | **5/10 = 50 %** | Solo mini-gates congelados; no porcentaje de trabajo implementado. Próximo incremento a 60 % requiere I6.5 completo, incluidos B4-003 a B4-007. |
| P0 de la cohorte prioritaria cerrados | **1/6 = 16,67 %** | Metas institucionales: 1 aceptado; cinco abiertos. No equivale al avance de todo B4-003. |
| Hito forense B1–B3 | **96 % histórico** | Peso preasignado y congelado; no representa disponibilidad productiva actual ni tiempo restante. |
| Avance global de implementación | **No calculable honestamente** | Falta una adjudicación actual de criterios aplicables y ponderación aceptada; no inventar un porcentaje. |

## Estado causal de los seis P0 priorizados

| P0 | Implementación y evidencia comprobada | Para cerrar el hallazgo |
| --- | --- | --- |
| Recaudo personal | Filtro de atribución por asesor canónico, mes y país presente en el código; contrato sintético. Inicio octubre muestra Q0/Q50.000 = 0 % personal, y los cinco cobros globales visibles son de julio; no deben sumarse a octubre. | UAT **positiva** con identidad real, meta individual y cobro confirmado del mismo periodo, con GTQ/COP, permisos y recarga en esta candidata. **OPEN**. |
| Metas institucionales | **RESUELTO funcionalmente el 30-oct** con GT/CO, escritura, auditoría, recarga y restauración sintética. El 31-oct se confirmó un caso adicional GT y se restauraron los dos documentos QA autorizados; sin alterar metas reales. | Ya cerrado **solo este P0**, no todo B4 ni seguridad de servidor. |
| Freelancers y metas | Lista de asesores asignables utiliza rol asesor/comercial más estado activo, sin clasificación canónica explícita de participación interno/freelance. | Regla de negocio de participación editable y prueba interno/freelance bajo own/team/all. **OPEN**. |
| Textos de Inicio | Textos contextuales y reflexión cambiante comprobados en Preview por rol/país; seis de siete perfiles del alcance no tienen meta individual configurada y se muestra “Meta no configurada”, no 0 % inventado. | Aceptación visual integral por rol, país y periodo, sin regresiones. **OPEN**. |
| Residuos de run QA cancelado | Inventario completado: 14 raíces explícitamente sintéticas, 5 derivadas y 18 registros de auditoría/flujo; la aseguradora QA compartida no es blanco de limpieza. | Disposición autorizada y reversible por ID, preservando auditoría y usos QA; ningún borrado por lote. **OPEN / HOLD**. |
| Renovaciones QA huérfanas | 3 pólizas, 12 filas financieras pendientes con importes positivos y 3 actividades; 9 padres referenciados ausentes. No cumplen condición histórica de cero dependencias. | Disposición exacta que preserve obligaciones y trazabilidad; **no borrar** con autorización anterior. **OPEN / HOLD**. |

## Seguridad transversal y subflujos ya probados

- **52/52** casos de no escalamiento aprobados en emulador (no equivale a backend desplegado).
- Carlos, identidad independiente, tuvo **6/6** combinaciones autenticadas de rol/país con lectura y denegación de Equipo/Metas en una Preview anterior. Falta la misma candidata y la denegación **server-side** con UID independiente.
- En la Preview vigente se confirmó rechazo **visual** a `#/equipo` con rol Asesor y recarga real en alcance general y Colombia. Paula volvió a **Operativo / Todos / Inicio**.
- Aseguradoras: edición, auditoría, recarga y restauración de observación en fixture sintético (PASS acotado). Cronograma: prueba autenticada sintética de crear/editar/recargar del 29-oct (PASS acotado). Ningún PASS acotado se convierte en aceptación integral.
- La excepción temporal aceptada por la propietaria el 28-oct significa que **las Rules existentes, por sí solas**, no bloquean automáticamente una salida controlada; **no** constituye certificado de seguridad ni dispensa los otros criterios.

## Secuencia única de salida, sin reiniciar diagnósticos

1. **Cierre de B4-003:** UAT positiva de recaudo personal; autenticación Carlos/current-source y rechazo del backend; contrato de freelancers; visual final Inicio; disposición exacta de dos cohortes QA; pruebas transversales y readback.
2. **B4-004 → B4-007:** avanzar por el plan congelado con la misma candidata acumulativa. Reutilizar pruebas previas cuando su fuente, causa y alcance sigan siendo idénticos; repetir solo los discriminantes cambiados.
3. **I6.5 y puertas posteriores:** emitir cierre formal únicamente al satisfacer criterios; certificar mismo artefacto Preview→LIVE y solicitar autorización expresa antes de promoción. Ninguna transición se habilita por este documento.

## Identidad y trazabilidad

- Repositorio: `paulaosoriof86/orbit360-core`; rama: `recovery/fase-a-clean-20260831`.
- Fuente base observada: `2cea88d4fd2de841c6e5e81a51a85afdd66f84e6`.
- [Run técnico exacto Preview 41222963524](https://github.com/paulaosoriof86/orbit360-core/actions/runs/41222963524): **SUCCESS**, misma fuente.
- [Preview LAB autenticada](https://ays-orbit-360-lab--gi-i65-b4-sr-41066435386-r09pl1ti.web.app/).
- [Recibo de pruebas humanas 31-oct y readback](https://github.com/paulaosoriof86/orbit360-core/issues/154#issuecomment-6548602920).
- Recibos canónicos: `I6_5_B4_003_INSTITUTIONAL_GOALS_FUNCTIONAL_CLOSURE_20261030.json`, `I6_5_B4_003_CARLOS_AUTHENTICATED_CONTINUITY_UAT_20261030.json`, `I6_5_B4_003_EXACT_QA_RESIDUE_DEPENDENCIES_ADJUDICATION_20261030.json`, `I6_5_B4_003_REAL_PROGRESS_RECONCILIATION_20261030.json`.
- Este dashboard no modifica `I6_FINDINGS_LEDGER_20260924.json`, `I6_5_OPEN_FINDINGS_CARRY_FORWARD_REGISTER_20261003.json`, locks, fuentes productivas, datos ni permisos. **Sin LIVE.**
