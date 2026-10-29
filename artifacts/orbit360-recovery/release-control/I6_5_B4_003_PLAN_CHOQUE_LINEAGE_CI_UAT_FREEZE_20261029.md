# GRAVICENTRA INSURANCE — I6.5/B4-003 | Freeze de enfoque y plan de choque, 29-oct-2026

**Naturaleza:** checkpoint factual y de decisiones de Dirección. No es una certificación nueva, cambio de gate, aprobación de LIVE ni modificación de los locks históricos.

**Repositorio / rama:** `paulaosoriof86/orbit360-core` / `recovery/fase-a-clean-20260831`.
**HEAD inspeccionado:** `1e006d104bba599657a4abea45e40a33b7cf9aa6`.
**Gate único activo:** `I6.5/B4-003`.

## 1. Decisiones congeladas, sin reabrir

1. **Excepción propietaria Firestore ya otorgada el 28-oct:** Paula aceptó temporalmente el riesgo de las Rules compartidas actuales para una salida **LIVE controlada**, sin expansión de accesos, con endurecimiento P0 urgente después de producción. Las mismas Rules amplias **no son por sí solas impedimento para esa salida**. No pedir nueva aceptación ni presentar este riesgo como `SECURITY_PASS`. Autoridad: `I6_5_B4_003_PAULA_OWNER_TEMPORARY_FIRESTORE_RISK_ACCEPTANCE_20261028.md` y `CONTROL_PLANE.b4003OwnerTemporaryRulesRiskException20261028`.
2. **B4-003 sigue abierto por certificaciones pendientes distintas de la excepción:** no está autorizado elevar la prueba sintética a UAT autenticada, usar comprobaciones históricas como prueba de la candidata actual, asumir restauración demostrada por disponer de backup, ni promover el frontend sin sincronización y aprobación material.
3. **Secuencia original conservada:** `I6.5/B4-003 → B4-004 → B4-005 → B4-006 → B4-007 → I6.6 → I6.7 → I6.8 → I6.9`. Sin gate alternativo ni nueva rama.
4. **Historial ya certificado no se repite sin modificación causal:** lectura GT/CO/TODOS de Paula bajo Dirección, Operativo y Asesor; ni se cambia su estado para acelerar el release. Las demás pruebas se acreditan solo contra la versión y superficie efectivamente evaluadas.
5. **Límites de esta intervención:** solo lectura y diagnóstico local. No se desplegó LIVE, no se tocó Auth, IAM, Rules, Firestore ni datos. Una corrección local del guard está **en investigación y no publicada**; ningún PASS de producción puede inferirse de ella.

## 2. Hallazgo nuevo comprobado: preflight CI y linaje

- El workflow Guard v5 asociado al HEAD inspeccionado, run `40827323380`, concluyó `FAILURE`. El primer error histórico reproducido fue `B4_003_HISTORIAL_READER_SUCCESSOR_INVALID`: el guard exigía que un sucesor certificado del 28-oct siguiera siendo el HEAD, ignorando descendientes legítimos.
- En copia de trabajo local, el control de historial se transformó experimentalmente en **verificación de commit histórico exacto + padre + asunto + archivos + ascendencia**; la prueba pasó los hitos Historial, políticas por país, cobros, diagnóstico de cliente, aseguradoras y varias pruebas sintéticas. **El archivo del guard NO fue enviado a GitHub**.
- Al llegar al control de baseline apareció un defecto distinto y anterior a la publicación: `I6_CERTIFIED_SOURCE_NOT_ANCESTOR`. El `certifiedCandidate.sourceSha` es `4bf67a3738751fe2432a130fd23254a6f1c7d16e` (18-sep); la raíz Git de la rama actual es `4e6f8579da823650952cbf47840f6415617cfea0` (08-oct). Son historias distintas. Un fetch profundo descartó que fuera solo un clon superficial.
- El **diff de árboles**, desde el SHA certificado hasta el HEAD, arroja 1,047 rutas modificadas; las 115 rutas no exentas coinciden **exactamente** con 114 rutas del manifiesto acumulativo más la excepción preexistente `core/ui.js`. Pero **15 de los 114 hashes del manifiesto no son iguales** a los blobs en HEAD. Su último cambio es identificable en commits posteriores (Historial, Cobros, Cronograma, Cliente 360, provider/auth y otros). Por lo tanto, hay coincidencia de *conjunto de rutas*, **no** certificación de contenido ni permiso para ignorar la falta de ascendencia.
- Se exploró una excepción de linaje **únicamente como experimento local, protegida por variable explícita**. Tampoco dio PASS: el siguiente resultado fue `I6_CANONICAL_COMPOSITION_BLOB_DRIFT`. **No publicar ni habilitar ese experimento como atajo.** La diferencia requiere reconciliación canónica aditiva, con hashes y sucesores exactos, y evaluación de la autoridad de linaje.

## 3. Pruebas focales ejecutadas en HEAD inspeccionado (solo sintéticas)

| Prueba local | Resultado | Alcance y límite |
| --- | --- | --- |
| `gravicentra-b4-003-historial-country-selection.test.cjs` | PASS | GT/CO/TODOS, país de póliza, cierre de drawer ajeno, lectura |
| `gravicentra-b4-003-cronograma-durable-task.test.cjs` | 4/4 PASS | Contrato de tarea durable Preview y manejo de fallos; **sin escritura real probada** |
| `gravicentra-b4-003-c360-cobros-currency-overdue.test.cjs` | 26 checks PASS | Moneda, cartera vencida, alcance active-only; sin red ni escrituras |
| `gravicentra-b4-003-insurer-readiness-facade-bridge.test.cjs` | PASS | Estados loading/denied/failed; sin Firestore directo ni escrituras |

Estos PASS no sustituyen la matriz de UAT real autenticada con más de una identidad, el readback de persistencia ni las pruebas de restauración.

## 4. Camino crítico único, sin repetir decisiones

| Orden | Paso material | Criterio de cierre |
| --- | --- | --- |
| 1 | Reconciliar la descendencia de la candidata contra el baseline y producir **un solo sucesor aditivo** de composición que vincule los 15 blobs posteriores a commits/recibos legítimos. Sin reescribir pruebas anteriores ni desactivar el guard. | Guard de gobernanza completo PASS; árbol, conjunto y SHA exactos; sin falsa aceptación de linaje |
| 2 | Correr CI pertinente sobre el **commit exacto** de la candidata; clasificar workflows antiguos de dispatch que no sean aplicables, sin ocultar fallos genuinos. | Evidencia de build y fuente servida congruentes; control de releases PASS |
| 3 | Completar UAT B4-003 pendiente: dos UIDs reales autorizados, aislamiento rol/país, Cliente 360 → Historial → Cobros, persistencia Cronograma y Aseguradoras, cartera/moneda, aviso de errores. Conservar PASS anteriores por identidad/versión. | Evidencia autenticada de éxito/denegación, recuperación sesión y readback, sin inconsistencias críticas |
| 4 | Verificar backup y **ensayo de restauración** en destino aislado antes de la promoción controlada; realizar comparación exacta de candidata/preview/LIVE y definir rollback. | Restauración demostrada, rollback practicable, evidencia de integridad y autorización de salida |
| 5 | Cerrar `B4-003` con verdad verificable, luego ejecutar `B4-004` a `B4-007` y `I6.6` a `I6.9` conforme al plan original. | Ningún gate saltado ni asumido por urgencia |

## 5. Próxima acción única

**Conciliar de forma acotada el baseline disjunto y los 15 hashes posteriores**, sin modificar Rules ni promover LIVE. No se declara `B4-003 PASS` hasta pasar el guard íntegro, fuente/hosting exactos y la UAT necesaria. Priorizar desbloqueos verificables sobre nuevos diagnósticos repetidos.
