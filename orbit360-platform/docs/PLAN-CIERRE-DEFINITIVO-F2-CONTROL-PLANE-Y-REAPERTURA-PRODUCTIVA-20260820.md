# PLAN CANÓNICO — BLOQUE PUENTE F2: CIERRE DEFINITIVO DEL CONTROL PLANE Y REAPERTURA PRODUCTIVA

Fecha: 2026-08-20  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Base de diagnóstico: HEAD `448aa42b9d10f24410a87d0e4add17b7222b74fb`  
Clasificación primaria: `PIPELINE_MECHANISM_FAILURE`  
Producto/datos: congelados. Este bloque no es una cuarta macrointegración; las tres macrointegraciones de hardening permanecen cerradas.

## 1. Necesidad y causa raíz confirmada
CP-00→CP-11 están PASS y el package está `CLOSED_PASS`, pero el owner canónico terminaba en `CP11_PASS_AWAIT_AUTHORIZATION`. La autorización humana preparada podía existir fuera del repo sin transición canónica para persistirla y sin transición posterior para materializar un único request. El workflow canónico trataba `F2-RUNTIME-AUTHORIZATION` solo como verificación. Resultado: autorización válida pero estado perpetuo `authorized:false` / `authorizationPersisted:false` / `requestMaterialized:false`.

No se reabre producto, datos, CP-11 ni Request14. Request14 permanece historia sellada, consumida y sin replay/carry-forward.

## 2. Hallazgos residuales incorporados
- Confirmado bloqueante: falta de transición `autorización → persistencia` en el owner canónico.
- Confirmado bloqueante: falta de transición `persistencia → request único` en el owner canónico.
- Confirmado bloqueante: workflow canónico sin acción de mutación para esos pasos.
- Riesgo estructural: un package podía declarar un `firstIncompleteStep` sin comprobar que ese paso fuera alcanzable por owner/workflow. Se incorpora validador de reachability/reference-integrity.
- Nombres antiguos de runner/probe/workflow ausentes encontrados durante la auditoría NO se consideran bloqueantes por sí mismos: solo una referencia ejecutable vigente puede exigir su recuperación. Queda prohibido fabricar assets para satisfacer referencias históricas.
- Riesgo de binding circular: el request sucesor conserva separación `parentHead` (control plane) / `candidateSourceHead` (candidata ejecutable).

## 3. Invariantes antirretroceso
1. Un `firstIncompleteStep` vigente debe ser alcanzable desde el owner/workflow canónicos antes de declarar un cierre listo.
2. Toda referencia ejecutable vigente debe existir; referencias históricas selladas quedan exentas de ejecución y no se reutilizan.
3. Exactamente un camino canónico CP-11→autorización→request→preflight→runtime; cero owners paralelos.
4. La identidad `3d9975a3e599362ed1683f13d7e8b92367c626159240485e0c47f06de654ff47` se persiste una sola vez y no se sustituye por Request14.
5. La autorización no se consume durante persistencia, materialización ni validación source-only; `consumed:false` hasta que el runtime autorizado comience realmente.
6. Exactamente un request sucesor activo; nombre determinista por digest, sin semántica operacional de ordinal.
7. Request14 y sus autorizaciones: `historical:true`, `replayAllowed:false`, sin carry-forward.
8. Runtime/browser/secrets/Firestore permanecen cerrados en BP0–BP6.
9. CAS remoto y single-writer obligatorios para toda mutación del control plane.
10. Fallo en cualquier BP detiene el bloque en ese BP y conserva todo BP anterior; no se crea request alternativo ni se solicita reautorización salvo ampliación real de superficie de riesgo.

## 4. Checkpoints del Bloque Puente F2
| BP | Acción | Evidencia/exit | Estado inicial |
|---|---|---|---|
| BP0 | Congelar diagnóstico y residuos | Este plan + evidencia HEAD | PASS |
| BP1 | Extender owner canónico | owner contiene persistencia y materialización, revision-aware | EN IMPLEMENTACIÓN |
| BP2 | Enrutar workflow canónico | `verify`, `persist-authorization`, `materialize-request`; CAS/single writer | EN IMPLEMENTACIÓN |
| BP3 | Reachability/reference-integrity | validador source-only PASS; Request14 sellado | EN IMPLEMENTACIÓN |
| BP4 | Persistir autorización ya otorgada | auth record nuevo, digest exacto, `consumed:false`; request ausente | PENDIENTE BP1–BP3 |
| BP5 | Materializar único request F2 | request determinista, parentHead/candidateSourceHead separados, runtime cerrado | PENDIENTE BP4 |
| BP6 | Preflight/gate fail-closed | contrato/gate/preflight PASS, sin runtime por fallo | PENDIENTE BP5 |
| BP7 | Runtime F2 read-only one-shot | solo tras BP6 PASS; aquí se consume autorización al comenzar ejecución | PENDIENTE BP6 |
| BP8 | Reconciliar evidencia y volver a ruta productiva | package/ledger/checkpoint/PR coherentes; `F2_TERMINAL_PASS` | PENDIENTE BP7 |

## 5. Semántica de fallo
`FUNCTIONAL_DEFECT`: congelar runtime y corregir producto solo con evidencia.  
`VALIDATOR_STALE`: congelar producto y corregir registro/validator/workflow.  
`DATA_CONTRACT_FAILURE`: detener acceso de datos y corregir contrato.  
`ENVIRONMENT_FAILURE`: corregir entorno sin alterar producto.  
`PIPELINE_MECHANISM_FAILURE`: detener retries y corregir owner/workflow/gate.  
`SECURITY_FAILURE`: fail-closed total.

La misma etapa/código dos veces no habilita otro parche: obliga diagnóstico de causa raíz del gate/pipeline.

## 6. Carriles
- A frontend/UX/Academia: congelado; solo documentación de aprendizaje al cierre.
- B backend/seguridad/gates: único carril activo durante BP0–BP8.
- C datos reales/migración A&S: congelado; cero reimportaciones para resolver F2.

## 7. Ruta productiva después de BP8
Retomar el plan vigente, sin reconstruirlo: bootstrap productivo read-only → activación tenant → writer durable/importadores y migración limitada → release candidate/visualización A&S → go-live autorizado con backup/rollback/deploy/smoke. Después: Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → documentos → Cotizador/Comparativo → Ops+Leads → Marketing → Portal → Academia restante.

## 8. Handoff obligatorio entre conversaciones
Leer en este orden: reglas maestras/addenda → PR #5/HEAD → este plan → package → ledger → boundary → writer registry → gate/lifecycle → checkpoint. Reanudar exactamente en el primer BP que no esté PASS. La autorización F2 ya otorgada no se vuelve a solicitar mientras su digest y superficie permanezcan iguales.

## 9. Clasificación para Claude / Academia
Mecanismo genérico de reachability, state-machine y single-writer: `REPLICABLE_CLAUDE_ACUMULADO`. Backend de autorización/runtime: `BACKEND_PROTEGIDO_NO_CLAUDE`. Identidad de autorización y datos runtime: no se envían como material reusable. Academia debe incorporar diferencia entre cierre documental y reachability ejecutable, además de autorización persistente vs autorización consumida.
