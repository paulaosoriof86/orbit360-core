# I6.5/B4-003 — Retorno UAT parcial y reproof causal, 29-oct-2026

## Naturaleza y decisión

HOLD / NO-GO. Recibo aditivo de evidencia; no nuevo gate, rama, plan, cierre de capability ni autorización de LIVE. La UAT de Chrome de este recibo es el retorno proporcionado por Paula en esta conversación; no fue reejecutada por el proceso que publica este recibo. La inspección de GitHub y las pruebas locales indicadas abajo sí se ejecutaron durante esta intervención.

La autoridad mutable sigue siendo CONTROL_PLANE.json. Este recibo no sustituye su estado. El registro de este recibo en Control Plane y el enlace de observaciones al Findings Ledger existente quedan PENDIENTES; publicar este archivo no significa sincronización completa.

## Identidad comprobada

- Repositorio: paulaosoriof86/orbit360-core.
- Rama: recovery/fase-a-clean-20260831.
- HEAD leído: b25289e5a8d1b2631669a20e4fd80d005f2a2373.
- Árbol: de7d5a0ea2d507c7c1e3e73e8730aca4f184402b.
- Preview reportada: https://ays-orbit-360-lab--gi-i65-b4-sr-40923629860-q2geokqk.web.app/
- Build: gi-i65-b4-95f980719387-57f234755dc1.
- Fuente servida: 95f980719387c042625f5cfeb62340b1066ca361.
- Artifact retenido 12919327894: descargado y SHA-256 comprobado a7e048941b819c08b84e0f1eaf3bc7f158c13dd7c698cf0891a45b53ae164f3a.
- Plantillas extraído de ese artifact: Git blob 702c90d4c655013fc168430cb44a48aab7bdfcd0, idéntico al fichero de GitHub. El artifact original permanece sin cambios.

## UAT recibida de Work — alcance exacto

| Área | Resultado reportado y límite |
|---|---|
| Paula | Sesión visible Paula Osorio, Dirección, Alianzas & Soluciones; UID y membresía backend no acreditados. |
| Aseguradoras | En b4003qa_human_insurer_r20 existía el marcador QA-B4003-B95F-20261029-01. Se restauró únicamente Observaciones a `Fixture temporal aislado para validar UI y persistencia en Preview.` y se confirmó después de recarga. No repetir la restauración. Actividad mostró solo dos eventos antiguos; auditoría durable no cerrada. |
| Insights | Lectura GT/GTQ, CO/COP y TODOS con monedas separadas; advertencias de importes y moneda pendientes. Asesor de Paula vacío no acredita scope. |
| Cobros | Dirección/GT: 5 confirmados por Q2,744 GTQ, Q5,874 pendientes y vencido aproximado Q216K. Filtro QA: una fila Q683.20 GTQ, vence 2026-10-26, Vencido. Persisten contradicciones moneda fuente/póliza; no se alteraron. |
| Cliente 360 / Historial | Lectura previa del mismo build: QA, cartera GTQ vencida aproximada Q683 y dos interacciones. No prueba todo el ciclo ni UID independiente. |
| Plantillas | Seis tarjetas de consulta; cliente sintético seleccionado; {monto}/{vence} sin resolver. No WhatsApp, envíos ni CRUD. |
| Portal / selector | Acuerdo no aceptado; desapareció al salir a Inicio; GT→CO→GT observado. |
| Overlay Plantillas | FAIL: Usar plantilla permanece al navegar a Aseguradoras; cerrar con X no escribió ni envió. |
| Cronograma | Agenda octubre 2026 cargada; sin escritura de tareas; sin errores de consola observados en esa lectura. |
| Carlos | NOT TESTED: timeout antes de confirmar identidad; no UID independiente acreditado. |

Work reporta una sola escritura: restauración del fixture. Esta intervención de ChatGPT ejecutó cero escrituras de Firestore y cero acciones de Chrome. Ningún resultado local se etiqueta UAT.

## Reconciliación focal de punteros — sin overwrite histórico

1. El archivo de composición actual tiene blob 33bf80768cb6cb311f2975d282a5f50935f680aa. CONTROL_PLANE.b4003DisjointRootSourceLineageReconciliation20261029.sourceManifestBlobSha apunta exactamente a ese blob.
2. Los punteros f9e3cce4f7b802966abdcc4072557821f3f1cac7 se conservan como snapshot histórico. El guard `frozenB4CompositionRetained` los compara con el archivo en f5d03aa774907815f10408baf6fdb7c493f12b1a; `reconcileIndependentCertifiedSource` verifica separadamente el manifiesto físico actual y su recibo. No reemplazar f9e3... por 33bf... para hacer coincidir valores visualmente.
3. El Findings Ledger actual tiene blob 0a6544398da91784da5c331680866a8ec1491449 y declara 295 hallazgos. canonicalAccumulationControl, currentB4 y b4 en Control Plane ya apuntan a 0a654439...; el alias raíz conserva b923461bc7b0bbff0df597187f0053228029e7b4. No se encontró referencia literal C.findingLedgerBlobSha en el guard inspeccionado. El alias raíz necesita disposición explícita para evitar interpretaciones erróneas, no sustituir el ledger ni reiniciar su inventario.
4. Esta inspección resuelve la interpretación de los punteros, pero no acredita una ejecución nueva del guard central. El lineage LIVE disjunto sigue pendiente de prueba independiente.

## Modal de Plantillas — corrección local verificada, NO integrada

Owner: orbit360-platform/modules/plantillas.js.

Causa: usar() añade #pl-use a document.body; el router vacía #host y emite orbit:route-ready. Plantillas no tenía escucha de salida/cambio de contexto. La solución ya usada por Portal es el patrón de ciclo de vida a reutilizar.

Parche adjunto: limpia solo #pl-use al salir de Plantillas y en cambios de país/sesión; escucha route-ready y hashchange una sola vez. No cierra #pl-ed, otros drawers ni acuerdos legales. No guarda, copia, envía ni acepta términos.

- Original: 6/18 PASS, 12/18 FAIL en batería discriminante.
- Fuente corregida local: 18/18 PASS, 0 omitidas; node --check PASS.
- Git blob corregido local: a7b51d38cb5062485376855541b690e2656dd072.
- SHA-256 corregido local: 335e0fed06bc60020c18a9f0560f5ae534a702a532a4748b9e7da715ea912878.
- NO aplicado al owner de la rama, NO build, NO nueva Preview, NO UAT nueva.

## Actividad Aseguradoras — causa de proyección demostrada; persistencia pendiente

Fuente leída: functions/b4-003-scoped-bootstrap-reader.js, blob 356d36e0679a5e499c05632a981b9ef3f1ffb9ec.

`viewDirectory` omite actividad en la proyección de aseguradoras. `tabActividad` combina a.actividad con eventos documentales; por ello dos eventos de documentos pueden seguir visibles aunque todo el historial de ficha haya sido descartado por la lectura. No concluir que no existió auditoría en servidor a partir de esa pantalla.

`guardarDraft` agrega actividad al payload. El writer del servidor contiene además operationalEvents. La existencia concreta de los eventos de la restauración no se consultó; sigue sin acreditarse. Hay un riesgo causal adicional: reconstruir actividad desde una proyección sin historial puede enviar un array de un solo evento y reemplazar historia previa. No se afirma que ese daño haya ocurrido sin readback backend.

Diagnóstico aislado: 7/7 PASS sobre excerpt exacto de pick/sanitize/viewDirectory, no sobre Firebase. Una proyección propuesta con whitelist fecha/cambio/responsable/motivo/camposCambiados conserva actividad y excluye snapshots/secretos; el camino de asesores permanece igual. No se integró ni desplegó esa propuesta.

Siguiente discriminante: lectura autorizada del fixture y de sus operationalEvents; comparar historial real con la proyección; confirmar función desplegada. Después resolver conjuntamente lectura segura y conservación server-owned del historial si el writer confirma el riesgo. No inventar ni reinsertar eventos históricos.

## Variables de Plantillas y finanzas

resolver() toma la primera póliza del cliente y busca Pendiente/Vencido en cobros. Esta selección es incompatible con usar recibos/cartera como obligaciones; no acredita que falten datos. No cambiarlo por otro primer registro arbitrario: resolver contra el contrato canónico y una obligación/pago inequívocos, según plantilla; selección explícita ante ambigüedad. No fabricar montos/fechas ni confirmar pagos inexistentes.

## Métrica y continuidad

Se preservan el 80% del lote previo (4/5 actividades; UAT no cerrada) y el 50% formal I6 registrados en Control Plane. Incremento formal por este recibo: 0 puntos. 25/25 pruebas locales no son 25 nuevas capacidades aprobadas. No se reejecutó la batería previa 120/120 ni se suma como nueva evidencia.

295 hallazgos preservados sin modificación; 86 tareas y seis frentes P0 reportados se conservan sin recontabilización. La excepción temporal de Rules sigue OPEN_NOT_PASS y no se pide nuevamente; no habilita LIVE por sí sola.

Pendiente en el mismo B4-003: enlazar este recibo a Control Plane/ledger con IDs existentes; integrar el parche con composición y guard en un commit atómico sin invalidar históricos; nueva Preview/digest solo después del cambio real de fuente; reproof Chrome del modal y auditoría; identidad independiente Carlos y resto de matriz/finanzas/relaciones/restore conforme al plan congelado. B4-004 y LIVE permanecen HOLD.
