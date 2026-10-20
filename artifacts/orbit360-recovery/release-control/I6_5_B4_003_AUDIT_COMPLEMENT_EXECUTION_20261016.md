# Gravicentra Insurance — arranque y continuidad del complemento

Fecha: 2026-10-16.
Estado: USER_AUTHORIZATION_RECORDED_LOCAL_CAUSAL_PROOF_READY_PRODUCT_INTEGRATION_PENDING.
Gate: I6.5/B4-003. Documento subordinado a CONTROL_PLANE.json; no crea gate, executor, rama ni autoridad paralela.

## Autorización registrada
Paula solicitó congelar, arrancar y conservar la ejecución independientemente de la conversación, e informar en cada entrega qué se logró, porcentaje, siguiente acción y cuándo visualizar cada bloque solucionado. Se conserva el plan de 86 tareas I6_5_B4_003_AUDIT_COMPLEMENT_PLAN_FROZEN_20261016.md, blob 4d617c53f30ff144d0914b7e1978f376d204796b, y los 295 IDs del ledger/carry existente.

Esta autorización habilita continuar la corrección causal y preparar la integración dentro del gate vigente. No declara aceptados cambios funcionales, no autoriza por sí sola publicación LIVE, cambios de reglas compartidas, permisos reales, eliminación de datos ni reimportaciones. Antes de integrar product source se debe reconciliar la autorización concreta en Control Plane y lock B4, manteniendo los límites de seguridad y el guard. Este comprobante no elude esa obligación.

## Trabajo material realizado
Tarea del complemento: C03.04, subcaso validación de registro anterior. No cierra toda C03.04 ni el P0 de permisos.
Owner existente: functions/product-operational-domain.js.
Source base: 61bbd6d4bc9e687fa698c129e4ffd4fb4fb085b7.
Patch candidato: 1411d6d3e40908e558547dfe2db71c4945439779.
El código anterior autorizaba el registro resultante sin comprobar separadamente el registro leído del servidor antes de la modificación. El parche verifica ese estado anterior y conserva la comprobación del estado posterior.

Prueba local reproducible: tools/gravicentra-b4-003-before-image-regression.test.cjs.
Base: 8/12 controles satisfechos; 4 fallos discriminantes.
Candidato: 12/12 controles satisfechos; 0 fallos. Sintaxis válida.
Casos recuperados: registro ajeno convertido a propio, país ajeno convertido a autorizado, registro externo convertido a miembro de equipo y lote mixto que no debe confirmar parcialmente.
Controles preservados: edición propia, rechazo de contenido ajeno y destino no autorizado, edición de miembro de equipo, reasignación con alcance autorizado, alta propia e idempotencia.
Solo ejecución aislada en memoria: 0 peticiones externas, 0 writes operativos. El parche NO se aplicó al product source del repositorio, no está desplegado y no existe Preview nueva certificada por este comprobante.

## Primera continuación obligatoria
1. Leer HEAD, Control Plane, lock B4, composición y evidencia vigente; no reconstruir desde este chat.
2. Reconciliar autorización exacta C03.04 con Control Plane/lock B4 sin retirar los HOLD de reglas, datos y LIVE.
3. Integrar parche y binding de composición en un commit atómico sobre la rama vigente con expected HEAD; no aplicar si cambió el blob base sin reconciliar el diff.
4. Ejecutar el discriminante antes/después y la regresión afectada en el executor ya existente. No crear un workflow transportador nuevo.
5. Solo con esas pruebas, construir el nuevo artefacto y ejecutar Preview aislada autorizada. La seguridad P0 general sigue abierta hasta completar negativos reales.
6. Publicar checkpoint terminal con commit, prueba, build/digest cuando exista, estado y siguiente tarea material. Un fallo conserva el checkpoint y no repite applies ni cierres válidos.

## Entrega incremental a Paula
Cada entrega indica: cambio en palabras; casos probados y no probados; IDs/tareas cerrados; porcentaje formal anterior, incremento y resultante; progreso por integración solo con denominador adjudicado; siguiente acción; tiempo real empleado; Preview exacta y guía de revisión cuando esté acreditada.
Estado formal de referencia verificado: I6 50%; incremento funcional de este comprobante 0 puntos; resultado 50%. 12/12 es cobertura del discriminante, NO 100% de permisos ni de plataforma. Integraciones N/D mientras se adjudica la evidencia vigente.

No esperar al final de toda la plataforma para visualizar. Un bloque se ofrece cuando su candidata acumulativa tiene identidad exacta, readback y pruebas funcionales pertinentes. Indicar expresamente lo que aún no debe probarse y no presentar una Preview vieja como corrección nueva. Conservar la aceptación humana requerida antes de avanzar de bloque.

## Límites de continuidad
La persistencia del trabajo sí queda en GitHub. Este commit NO instala ni afirma un ejecutor autónomo continuo. La vigilancia de avances no ejecuta correcciones. No prometer trabajo desatendido inexistente ni una fecha exacta sin ejecución medida.

## Checkpoint incremental — 20 de octubre de 2026 — reanudación ágil B4-003

**Origen:** autorización de continuidad de Paula el 20-oct-2026. **Naturaleza:** receipt de ejecución dentro del complemento ya existente de 86 tareas; no es otro plan, otro gate ni reemplazo del Control Plane, y no declara PASS funcional. Identidad del estado rector leída de GitHub al iniciar: HEAD `db69f4fe1d60a375d8a7df96fec94cc0f007d729`, Control Plane blob `e592435b73d6eacdfb83b5c252ae7c8df4d604ec`, lock de ejecución B4 blob `ec57c71a784dc986dbaf480e69c9e3d68ff566d9`, lock de composición blob `e100a88bc817a80a9fcbcaf2ff9356ab0eb58b3f`.

### Evidencia acumulativa recuperada, sin reabrir anteriores PASS
- UAT5 Chrome observada sobre run 39356724520, source `ebd8b6e6641737d19ee93b17b8ded5201de066e3`, build `gi-i65-b4-ebd8b6e66417-57f234755dc1`. Conclusión funcional **HOLD**; su informe humano de Chrome es evidencia de observación, no readback del backend ni certificación de la nueva candidata. En UI mejoraron Cobros global, pestaña recibos Cliente 360, contador de importación (1.872 recibos esperados), ruta Renovaciones→Aseguradoras y búsqueda móvil; permanecen discrepancias de Cobros Asesor/CO (1 GT entre 15 filas y 3 vencidos contra aging COP 0), Cliente360↔Pólizas, primas y latencia 5/5 de Inicio (~22–27 s). No hubo write/conciliación/importación ni E2E backend en esa UAT.
- Commit de source posterior de Aseguradoras `bd6201000c63f34d1d8a64b56a5842090980c150`, QA de sintaxis `634cd7822cf543300e5003f676eb7a4a09949662`, despacho Preview `db69f4fe1d60a375d8a7df96fec94cc0f007d729`. Run exacto B4-003 `39425875627`: conclusión de Actions `success`, artifact ID `12266355946`, materialización/Hosting/readback/smoke público realizados; **pruebas autenticadas rol×país, writes/readback backend y aceptación humana SKIPPED/HOLD**. No tratarlo como UAT PASS.
- C03.01: `firestore.rules` vigente en el repositorio conserva `allow read, write: if isTenantMember(tenantId)` para rutas de datos; el readback de reglas efectivas LIVE anterior registró bloqueo `ACTIVE_LEGACY_MEMBER_WIDE_READ_WRITE_SECURITY_BLOCKER`. La candidata restringida `firestore.b4-003-scoped-candidate.rules` permanece fuera del deploy. No desplegar reglas aisladas: transporte LIVE y writer protegido deben probar paridad primero.
- En `orbit360-platform/modules/cobros.js`, la tabla mezcla cobros, recibos aplicados y obligaciones proyectadas, mientras `orbit360-platform/core/queries.js` calcula KPIs/aging desde `carteraPrimas` y cobros confirmados. Son **universos técnicos distintos demostrados en source**; esto no prueba todavía qué fila explica la discrepancia concreta Asesor/CO. Verificar IDs, país, moneda, estado y provenance por fila en QA autorizada antes de mover datos o afirmar reparación.
- El plan congelado `I6_5_B4_003_AUDIT_COMPLEMENT_PLAN_FROZEN_20261016.md` sigue intacto, blob `4d617c53f30ff144d0914b7e1978f376d204796b`. El ledger/carry conservan **295 hallazgos** (166 de atención); no se alteran IDs ni estados y los seis P0 formales siguen sin aceptación. Las 86 tareas **no** se convierten en 86 cierres. Las tareas asociadas a este checkpoint son C01.03/C01.04, C03.01–C03.05, C08.01/C08.06, C11.04, C12.02 y C13.01; sus estados funcionales permanecen sujetos a evidencia, no se declaran PASS.
- Indicadores rectoras sin nuevo crédito: I6 `5/10 = 50%`, preparación de salida `2/10 = 20%`; variación `0 pp`. I0–I5 histórico PASS no certifica I6.5. No mutar LIVE, rules compartidas, datos operativos ni permisos; no reimportar, resetear source ni crear rama.

### Próxima acción material dentro del mismo gate, sin ciclo de redescubrimiento
**C03/C04 → Cobros Asesor/CO**: prueba discriminante en ejecutor actual contra rol activo asignado, membresía, GT/CO, own/team y lectura/writer protegido, incluyendo denegación real de cruces y readback. Agrupar en ese mismo lote la conciliación de `carteraPrimas` contra tabla de Cobros por IDs/provenance, identificando vencidos sin monto conocido. No modificar las reglas productivas hasta existir secuencia completa de paridad, Preview autenticada y autoridad de promoción. Reutilizar la candidata acumulativa y retestar únicamente impacto causal más smoke transversal. Para cierre del paso: source/blob actual + suite verdaderamente EJECUTADA + artifact exacto + UAT funcional + Control Plane actualizado + guard; skipped/no-op **no** equivale a PASS.

**Alcance de este receipt:** preservación de evidencia y continuidad en GitHub; cero modificación de product source, cero writes de Firestore, cero deploy de rules/LIVE, cero reimportación, cero incremento de porcentaje. La continuidad no implica ejecución autónoma fuera de la conversación.
