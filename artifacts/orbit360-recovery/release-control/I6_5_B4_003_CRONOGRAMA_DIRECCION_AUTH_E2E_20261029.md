# Gravicentra Insurance — Cronograma · UAT autenticada con Dirección

**Fecha:** 29-oct-2026, Guatemala · **Gate:** I6.5/B4-003 · **Resultado:** `CREATE/UPDATE/RELOAD = PASS ACOTADO` en una tarea sintética LAB, sin promoción LIVE.

- Preview exacta: `https://ays-orbit-360-lab--gi-i65-b4-199860dd-40861280332-hcyw59nf.web.app/`, fuente funcional `199860dd23cad3db2df581828a45ae9f9e5cc7d8`, run Hosting-only `40861280332`.
- Identidad humana reconocida en la UI: `Paula Osorio`; selector `Dirección`.
- Con el filtro de país `Todos los países`, un intento de alta **no escribió** y devolvió el código permitido `PRODUCT_TASK_COUNTRY_SELECTION_REQUIRED`. Se respetó el rechazo de seguridad de alcance; no se reintentó con un país ambiguo.
- Se seleccionó explícitamente `Guatemala`. Se creó **una única** tarea sintética con fecha `2026-10-29` y texto exacto `QA B4-003 Dirección readback sintético 29-10-2026`. El cliente generó la identidad de fixture `b4003qa_tareas_<timestamp>` y `__syntheticQa:true` conforme al código aprobado. La interfaz devolvió `Tarea creada y confirmada en el servidor.`
- Tras recarga real, la tarea apareció en `Día` (29-oct), aunque en la vista `Mes` puede quedar oculta bajo `+1 · ver día` porque solo muestra tres chips por celda; esto no equivale a pérdida de datos.
- Se pulsó la misma tarea QA para marcarla terminada (`✅`), se recargó nuevamente y la vista autenticada de Día conservó tanto el texto exacto como el ícono `✅`. Se capturó evidencia visual en el navegador de esa vista, sin extraer datos sensibles ni enviarlos a terceros.
- Al finalizar quedó **una tarea sintética de prueba completada** en LAB; no se borró ni se alteró tarea real. No hubo pago, reimportación, correo, WhatsApp, cambio de Auth/IAM/Rules ni promoción LIVE.

**Alcance del PASS:** autorización por país, escritura duradera del caso QA, lectura después de recarga y actualización persistente. No extiende el resultado a Carlos/Operativo, Colombia, varios UIDs, datos reales, conciliaciones ni al backend LIVE. El resto de B4-003 y la aceptación controlada para producción se mantienen pendientes de sus criterios independientes. Aprobaciones históricas de Cronograma se conservan, sin repetir construcción ni abrir gate nuevo.
