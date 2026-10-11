# Gravicentra Insurance — Addendum operativo congelado B4-003
## Conversión comercial 360, expediente documental, recibos/cartera, colaboración y recuperación

**Aprobación humana:** Paula, 11 de octubre de 2026.
**Rama:** `recovery/fase-a-clean-20260831`
**Inserción en plan:** `I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json` → extensión `paulaApprovedCommercialContinuity20261011`.
**Gate activo:** I6.5/B4-003. **No crea gates, iteraciones, repositorios, ramas, Firebase, colecciones paralelas, baselines ni importadores.**
**Naturaleza:** alcance, decisiones y aceptación funcional congelados; NO es acreditación de implementación ni permiso para mutar producción o datos reales.

### Evidencia técnica recuperada

- `orbit360-platform/core/ciclo.js`: Leads y Ops son proyecciones del mismo `negocio`, con etapas `nuevo` → `contactado` → `cotizando` → `propuesta` → `negociacion` → `inspeccion` → `emision` → `emitido`; también `perdido` y retorno a `contactado`.
- `functions/product-ops-leads-domain.js`: transición server-owned `emitido` con transaction crea o vincula cliente, póliza y vehículo opcional, agrega actividad y conserva `negocioId`/ `sourceBusinessId`, con verificación readback de cliente y póliza. Debe probarse en runtime; no inferir PASS desde el source.
- El mismo handler no prueba creación de `recibosEsperados`/`carteraPrimas` ni la vinculación automática de `documentRef` de comentarios al expediente. Investigar consumidores downstream antes de diagnosticar ausencia total.
- La ficha actual conserva comentario y `attachment.documentRef` en negocio y finaliza archivo mediante provider Drive; presencia y descarga observadas por Paula en Preview. Reutilizar referencias, no copiar binarios ni reimportar.
- `perdido` y reactivación ya existen; falta vista operativa recuperable y pruebas con el mismo negocioID.
- 11/oct Paula acepta **Cliente 360** y **Renovaciones** en el aspecto visual aprobado; no cerrar semántica de desenlaces ni demás funcionalidades sin prueba.
- `CONTROL_PLANE` reporta `LIVE_LINEAGE_UNRESOLVED`: Preview aislada sí; promoción a LIVE bloqueada hasta reconciliar artefacto y bytes físicos.

### Contrato integral aprobado de inicio a fin

**C01 — Captación e identidad:** persona/empresa prospecto canónico, tenant, país, datos de contacto, documentos de identificación cuando haya fuente, canal/origen, asesor, productos de interés y timestamp. La misma persona puede tener varias oportunidades independientes; NO se duplica por cada producto. Resolver cliente existente por identidad fuerte/documento y contratos autorizados; coincidencias ambiguas requieren revisión, no merge silencioso.

**C02 — Oportunidad y etapa:** un `negocioId` único se proyecta en Leads y Ops conforme a etapa y rol. Crear, editar, cambiar etapa y asesor se confirman server-side con before/after/readback/refresh. Separar comentarios de modificación de datos: registrar colaboración no sustituye Guardar cambios.

**C03 — Colaboración bidireccional:** solicitud de Dirección/Operativo al Asesor, respuesta/devolución desde Asesor a Dirección/Operativo, tipos de solicitudes, adjunto opcional, estado personal reconocido y estado global resuelto diferentes. Una respuesta no se considera entregada porque el autor cambió de rol en su propia sesión: requerir al menos dos identidades UID reales autorizadas en Preview aislada. Enrutamiento según actor, destinatario, activeRole y scope; ni leak ni silenciamiento indebido. Notificar solo tras commit, deduplicar idempotentemente, mantener deep-link y readback. No atribuir entrega externa sin provider receipt.

**C04 — Identidad humana:** mostrar nombre/apellido autorizado del actor en comentario, bitácora, tareas, actividad y notificaciones. Resolver UID desde membresía fuente efectiva y registrar snapshot no sensible cuando corresponda; correo/UID/nombres de variables técnicas nunca sustituyen visualmente la identidad humana. Si no hay dato demostrable, mostrar etiqueta neutral explícita y marcar para resolución, sin inventar autor.

**C05 — Documentación comercial:** archivo llega a Drive documental mediante contrato aprobado, con `documentRef`, propiedad, tipo, entidad origen, actor, timestamp, provenance, permisos y estado. PDF e imágenes admiten visor interno autenticado y descarga; otros formatos descarga. No exponer enlaces permanentes inseguros ni credenciales en UI/evidencias. No duplicar binarios; vincular por referencia y auditar relaciones.

**C06 — Emisión integrada ganada:** desde oportunidad Emisión → Emitida se verifica número y vigencias, identidad cliente existente/no ambiguo, aseguradora, país, producto, moneda, vendedor, riesgo, vehículo si corresponde. Un comando canónico server-owned idempotente crea o reutiliza cliente y póliza (y riesgo), preserva `negocioId`, actividad/bitácora y actor. No declarar «Emitida» si falla alguno de los requisitos o readback; reintentos no producen duplicados, contradicciones quedan fail-closed. Preservar liquidación y documentos del proceso.

**C07 — Continuidad documental:** todos los documentos comerciales pertinentes (propuestas, solicitudes, identificaciones, inspección, aceptación, soportes) permanecen en el negocio y quedan vinculados por `documentRef` autorizado a Cliente 360 y/o póliza según clasificación. El expediente resultante debe permitir navegar de cliente/póliza al negocio original, ver historial de gestiones y documentos con fecha, versión, proveniencia y roles. No asumir que un documento del negocio automáticamente cumple requisito documental de emisión: la validación depende de tipo/estado.

**C08 — Recibos/cartera al emitir:** reutilizar los owners canónicos existentes: `recibosEsperados` (obligaciones), `carteraPrimas` (saldos/aging), `cobros` (solo pagos materializados con evidencia). Comprobar calendario por periodicidad/forma de pago y reglas por aseguradora, país y moneda; no crear cobro ficticio. Transacción y orquestación deben ser recuperables/idempotentes; si alguna proyección asíncrona no está confirmada, mostrar explícitamente «pendiente de sincronización», no éxito integral.

**C09 — Historial completo:** la cadena prospecto → oportunidad(s) → Ops/Leads → emisión → cliente → póliza → riesgo → recibos/cartera → cobros conserva IDs, fuente, actor, tiempo, before/after, relaciones y evidencia. No sustituir historial por texto «Creado desde Lead» sin identificadores navegables. Verificar persistencia y reload.

**C10 — Oportunidades por recuperar:** nombre comercial aprobado, vista integrada en Leads (no nueva app ni colección). Registrar motivo de pérdida, fecha, etapa anterior, responsable, producto, oportunidad, documentos y última acción; búsqueda, país, asesor, antigüedad, motivo, siguiente contacto y filtrado por roles. Reactivar sobre el mismo `negocioId`, conservando historial y sin crear duplicados; reactivar no presupone ganancia ni emisión. Política de conservación/retención y eventual eliminación sujetas a contrato rector/autorización, no borrar por defecto.

**C11 — Múltiples oportunidades y cierre:** un cliente puede tener oportunidades ganadas, abiertas y perdidas sin duplicar su identidad; convertir una oportunidad no elimina otras, ni borra historia. Una póliza debe apuntar inequívocamente a su fuente comercial cuando exista y los accesos se deben limitar por rol/scope/tenant en cada extremo.

**C12 — Inicio premium y metas:** conservar visual ya aprobada de velocímetros, alineación, contraste premium e identidad Gravicentra/A&S. Separar metas individuales (Paula y demás) de metas institucionales/autorizadas por país y mes; no presentar «Meta no configurada» sobre una meta individual vigente solo porque falte total agregado o autorización de lectura. GTQ y COP nunca se suman; sin fuente verificable mostrar alcance/indisponibilidad correctamente. Responsive 1440/390/320 aplicable.

**C13 — Renovaciones:** visual PASS de Paula preservado. «Resultado pendiente por verificar» significa que no se acreditó desenlace, NO que se deba inventar renovada. Debe existir acción concreta para confirmar sucesora/renovó, no renovó (motivo), aplazó o continúa en gestión con evidencia, histórico y tarjeta coherentes. No repetir applies previos de 583 disposiciones; 24 recientes permanecen sujetos a fuente y diff.

### Riesgos/gaps explícitos antes de cierre

G1: UI de metas nacionales confundió ausencia de total con ausencia personal. G2: reasignación de asesor potencialmente bloqueada por `workflowAuthorizationDomain`/scope; distinguir lectura, escritura y contrato. G3: fallback `actorName` imprime email/etiquetas técnicas. G4: fan-out operaciones/dirección no acreditado entre UIDs distintos. G5: comentarios con `documentRef` sin prueba de herencia a expediente. G6: emisión sin prueba E2E de recibos/cartera o documentos. G7: pérdidas conservadas sin bandeja recuperable. G8: visor documental interno pendiente. G9: posibles colisiones de identidad/varias oportunidades/país; no merge automático. G10: LIVE no coincide físicamente con release certificada. G11: todas las escrituras cross-module requieren scopes server-owned y readback exacto. G12: eventos/cadencias no implican mensajes realmente enviados. G13: limpiar solo fixtures sintéticos identificados, no borrar residuo ambiguo con relaciones.

### Matriz mínima discriminante (no declarar PASS por source ni simple render)

- T01: Iniciar Lead Persona/Empresa GT y CO; crear misma identidad con varias oportunidades; 0 clientes duplicados antes de emisión.
- T02: Asesor real crea/edita su oportunidad; no accede a ajenas; Dirección ve conforme al permiso específico, sin editar por bypass del rol.
- T03: Dirección asigna/reasigna asesor, cambia producto/prioridad y guarda con readback/reload; asesor nuevo ve negocio; anterior deja de verlo si scope own.
- T04: Solicitud Ops→Asesor, respuesta Asesor→Ops/Dirección con UIDs distintos; outbox/internalNotifs/bandejas correlacionan un eventId, actor, destinatarios, estado, deep link y badge; sin duplicados.
- T05: Reconocimiento personal ≠ resolución global; al resolver globalmente desaparece «Acción requerida» de ambas superficies después del refresh.
- T06: Nombre/apellido frente a email, UID, etiquetas y bitácora en ambos roles; persistencia.
- T07: Adjuntar imagen/PDF en fixture: upload→finalize→comentario→download→preview interno→reload; permisos ajenos denegados, cleanup y ausencia final.
- T08: Oportunidad perdida con motivo y documento, visible en Oportunidades por recuperar (scope correcto); reactivación mismo ID, historial intacto.
- T09: Emitir sin datos obligatorios rechaza sin cliente/póliza parciales; emitir válido en fixture crea/vincula ambos, readback de IDs e historial.
- T10: Emitir para cliente existente reutiliza ID; dos clientes candidatos fuertes ⇒ HOLD sin merge; retry mismo request idempotente.
- T11: Póliza de Vehículo relaciona riesgo y cliente; póliza no vehicular no inventa vehículo.
- T12: Adjuntos del negocio se ven en expediente del cliente/póliza conservando documentRef, clasificación y autorización; si falla vínculo, no declarar cierre integral.
- T13: Emisión genera obligaciones de recibos/cartera según contrato; totales, vencimientos, moneda, periodos; 0 cobros ficticios.
- T14: Cliente 360 ↔ Pólizas ↔ Leads/Ops ↔ Documentos ↔ Historial, todos navegables por IDs después de reload.
- T15: Renovaciones conserva cuatro buckets, continuidad histórica y selección exacta; desenlace explícito documentado resuelve «pendiente por verificar».
- T16: Inicio personal/corporativo y GT/CO: Paula meta reconocida desde fuente, velocímetros premium y contraste, escritorio/móvil; sin valores inventados.
- T17: Preview segura aislada, mismo product source/artifact/digest, consola/page/network sin error inesperado; 0 writes reales.
- T18: E2E con cuentas de rol/UID diferentes, pre/post, evidencias auditables, cleanup, status por hallazgo; Paula aprueba Preview exacta.
- T19: Antes LIVE resolver `LIVE_LINEAGE_UNRESOLVED`; luego promover mismos bytes, rehash, rollback y pruebas con writes autorizados y readback.
- T20: Ningún P1 diferido se declara PASS por estar fuera de bloqueo; mantiene owner, criterio y prioridad para continuación sin perderse.

### Orden de ejecución existente, sin inventar gates

1. **B4-003 — P0 existentes:** Inicio premium/metas; persistencia y asignación; identidad y notificaciones entre usuarios; emisión/documentos/recibos; mantener Renovaciones y Cliente 360 visual PASS. Corregir source solo con alcance causal y proof exacto.
2. **B4-003 — Mejoras P1 integradas:** vista `Oportunidades por recuperar` y previsualización segura de archivos; preservar en ledger hasta implementación/aceptación. No deben silenciar P0 ni bloquear capacidades independientes sin dependencia causal.
3. **B4-003 — E2E Preview acumulativa:** ejecutar T01–T18 dentro del mismo gate y obtener visual de Paula. Cualquier nueva observación se incorpora una sola vez al ledger/carry, con owner/causa/estado. No reiniciar recuperación.
4. **B4-004/B4-005/B4-006/B4-007 originales:** seguir secuencia congelada (Siniestros/Cronograma, E2E transversal, UAT final, mismo artefacto a LIVE), no saltar.
5. **I6.6–I6.9:** datos de cobros/conciliación, comisiones, historial/academia y aceptación final según plan físico.

**Criterio final:** capacidades maduras preservadas; no PASS por UI, source ni workflow verde; commit/readback/reload/roles/evidencia/visual; un solo candidate/product source y misma release preview→live. Firestore operativa, Drive documental; nunca reimportar para reparar UI.
