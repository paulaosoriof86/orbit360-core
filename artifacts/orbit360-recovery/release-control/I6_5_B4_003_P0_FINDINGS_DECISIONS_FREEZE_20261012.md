# Gravicentra Insurance — Congelamiento P0 de continuidad B4-003 — 2026-10-12

Estado: FROZEN_SCOPE / OPEN_NOT_ACCEPTED. Autoridad: CONTROL_PLANE, I6_FINDINGS_LEDGER, CARRY_FORWARD_REGISTER y evidencia GitHub. No sustituye ninguno de esos registros, no abre gate, metodología, rama ni candidata. Este archivo documenta los hallazgos reportados y la clasificación causal pendiente de reconciliar en el ledger.

## Prueba física y frontera
- Rama: recovery/fase-a-clean-20260831; base de este freeze: f7e13a6ad430826dc4bbb66c51db597d711102ab.
- Última Preview técnica: run 38282275915, MACHINE_PASS_PENDING_PAULA_VISUAL, source bf2e398622995e1794b53640b348a7a3a3bbbc7c.
- Evidence: I6_5_B4_003_R20_MACHINE_PROOF_20261007.json (blob 67e60e26c6d61f410134dc169a51f6d51de863f7).
- No PASS final de B4-003, no producción nueva, no reimportación, no writes operativos reales.
- Preservar PASS visual acotado de Inicio, Cliente 360, Renovaciones y nombres humanos de Colaboración. R24 Client360 financiera necesita prueba exacta y conciliación de importes; no sustituir versión aprobada.

## Hallazgos P0 nuevos, abiertos y criterios no negociables
1. **B4-003-P0-20261012-PERSONAL-COLLECTION** — Inicio no habilita comparación personal de recaudo equivalente a producción: splitCountrySummary() limita el fallback personal a kind=production. Probar recaudo realmente confirmado atribuible a asesor, meta personal correcta, país/mes y GTQ/COP separados; lectura servidor, roles, recarga; prohibido usar cartera pendiente como cobro.
2. **B4-003-P0-20261012-INSTITUTIONAL-GOALS** — falta certificar la configuración administrable de metas institucionales; backend r23Dashboard distingue meta global sin asesorId, pero falta demostrar owner real de edición. Cerrar solo con Configuración → guardar server-owned → readback → reload → roles → auditoría, sin ocultar meta individual.
3. **B4-003-P0-20261012-FREELANCERS-GOAL-SCOPE** — la proyección r23Dashboard de Inicio no exige explícitamente elegibilidad de participación en metas, y se debe evaluar freelancers con configuración contractual real. Cerrar con prueba de asesor interno vs freelancer sin meta de empresa, scope own/team/all, no hardcodes, sin borrar metas individuales aprobadas.
4. **B4-003-P0-20261012-INICIO-MOTIVATIONAL-TEXTS** — Inicio conserva copia genérica fija; comprobar textos motivacionales contextualizados, fieles al estado real y roles, preservando el diseño premium ya aceptado y sin inventar logros.
5. **B4-003-P0-20261012-QA-CANCELLED-RUN-FIXTURES** — 14 filas sintéticas de run cancelado 38102224750 identificadas READ_ONLY_NO_DELETE. Identificar procedencia y dependientes; limpieza exacta solo cuando el contrato y autorización lo permitan; readback de ausencia/recuperabilidad. No confundir con las 14 fixtures del run más reciente cuyo cleanup PASS fue certificado.
6. **B4-003-P0-20261012-QA-ORPHAN-RENEWALS** — tres pólizas QA B2-REN sin padre tienen 12 dependencias (6 recibos y 6 cartera). El adjudicador físico dejó NOT_DELETED_FAIL_CLOSED. No eliminarlas sin reconciliar origen/impacto y autorización específica, readback antes/después.

## P0 existentes que no pueden desaparecer
- B4-003-UAT-20261011-01: UI Inicio aceptada parcialmente; cifras/metas requieren readback independiente.
- B4-003-UAT-20261011-02: reasignación de asesor; run 38282275915 demostró servidor/readback/reload con fixture sintética y dos identidades, no constituye aceptación humana ni prueba de todos los campos de negocio.
- B4-003-UAT-20261011-03: nombres humanos en Colaboración con PASS visual acotado; preservar, comprobar persistencia por identidad real.
- B4-003-UAT-20261011-04: notificación entre dos usuarios distintos y retorno Operativo/Dirección, badges, deep link, deduplicación y recarga.
- B4-003-UAT-20261011-05: emisión → cliente/póliza → documentos con provenance → recibos esperados y cartera, idempotencia, scopes y reload.
- P1/P2 quedan vivos en sus registros, no se consideran PASS ni bloquean por sí solos la salida si el contrato prevalente los clasifica no bloqueantes.

## Regla de cierre y antirregresión
Cada P0 necesita: síntoma reproducible; owner runtime; causa raíz demostrada; source/blob SHA; corrección en el mismo B4-003; prueba discriminante con roles; commit/readback/recarga si hay escritura; evidencia exacta Preview; aceptación visual humana cuando corresponda; ledger + carry-forward reconciliados por mismo ID y status; guard central/continuidad PASS. Machine PASS no cierra hallazgos visuales. No abrir B4-004 ni LIVE mientras el gate actual tenga P0 bloqueantes abiertos. No convertir un cambio de QA en reconstrucción o parche de artifact certificado.

Estado de integración: FREEZE_RECEIPT_PENDING_LEDGER_AND_REGISTER_RECONCILIATION. La creación de este archivo es solo el primer paso físico, no acredita sincronización del ledger.
