## [1.258.0] — 2026-07-17 · Corrección semántica P0-S1/P0-S2/P0-S3 sobre v1.257 (auditoría conductual)
> Corrección incremental **de comportamiento** (no solo de nombres) de los tres P0 semánticos; sin reconstrucción, sin cambio de base, `data/store.js`/`core/auth.js`/`core/importa.js` byte-idénticos.
> 1. **P0-S1 · Contrato conductual completo** (`core/access-scope.js`, reescrito): `Orbit.access` recupera la conducta del contrato vivo — `actorUser()` combina identidad **Auth + asesor** (no reduce a uno); `tenantConfig/tenantId/countryConfig/currencyFor` (moneda solo desde config confiable, no inventada); `dataScope` acepta modelos **modernos y legacy** (`dataScopes.modules`→`dataScopes.default`→`scopes[m]`→`dataScope`/`scopeDatos`/`alcanceDatos`→rol); permisos vía `can(module,action)` en orden **restricciones → permisosExtra → matriz tenant → regla base** (la restricción siempre gana); `recordAdvisorId` resuelve asesor **derivado por cliente o póliza** (cobro sin `asesorId` hereda del cliente/póliza); `deriveClientState` con los **cinco estados** `pendiente_polizas / activo / activo_en_mora / reactivable / inactivo`; `prepareManual` con **trazabilidad + calidad** estructuradas (tenant, país, moneda, fuente, actor/rol, alertas, `requiereValidacion`) sin escribir al store; `audit(accion,coleccion,id,antes,despues,motivo)` **y** `audit(entry)` compatibles; `correction` idem; `scopedStore` filtra lecturas y protege mutaciones **solo en colecciones operativas** preservando el resto de la API del store; `withScope` reemplaza `Orbit.store` y lo **restaura siempre** (éxito y error). `Orbit.accessScope` sigue como alias sobre los mismos refs.
> 2. **P0-S2 · Proyección en Pólizas y Cobros**: nuevo `Orbit.clientProjection.get(id)` (lee del store y devuelve copia proyectada, nunca escribe). `modules/polizas.js` y `modules/cobros.js` usan un helper `PC(id)` en **búsquedas, detalles, lotes, mensajes y automatizaciones** — no solo en `clienteCell`. Un cliente solo-aliases aparece y se encuentra por nombre/correo/documento en ambos módulos, sin mutar el store ni crear relaciones.
> 3. **P0-S3 · Gate separado por consumidor** (`modules/aseguradoras.js`): `Habilitado para Cotizador` **no** habilita Comparativo y `Habilitado para Comparativo` **no** habilita Cotizador; cada consumidor requiere su habilitación explícita. `Validado`/`Mapeado`/`Persistido` no consumen.
> **Pruebas conductuales** (`tools/orbit360-p0-tests.html`, reemplaza las superficiales): **53 aserciones en verde** — proyección real en Pólizas/Cobros con store intacto, matriz de permisos (restricción/extra/matriz), país por registro, deep-link fail-closed, asesor derivado, 5 estados de cliente, alta manual con trazabilidad/calidad, `audit`/`correction`/`scopedStore`/`withScope` (incl. restauración tras error), separación estricta Cotizador≠Comparativo. `node --check` equivalente: 56/56 JS sin error, 0 referencias faltantes.
> **Conservado:** Router, Legal, PWA, Academia, copy honesto, credenciales por referencia, permisos y documentación de v1.257.
> **Pendiente honesto:** CL-015 evidencia visual responsive (tableta/móvil) sigue requiriendo DevTools del usuario.

## [1.257.0] — 2026-07-17 · Corrección puntual P0-01/P0-02/P0-03 sobre v1.256 (auditoría bloqueante)
> Corrección incremental de los tres P0 de la auditoría de v1.256; sin reconstrucción, sin cambio de base, `data/store.js`/`core/auth.js`/`core/importa.js` byte-idénticos.
> 1. **P0-01 · Motor único de acceso** (`core/access-scope.js`, reescrito): `Orbit.access` es ahora el **contrato canónico completo** — un solo motor que expone activeRole/rolActivo, actorAdvisorId, actorUser, assignedRoles, dataScope/scopeCanon/scopeUI, puedeVerModulo, can, canView, filter, canAccessRecord, puedeAccederRegistro, filtrarPorAsesor, puedeGestionar, esRestringidoCredenciales y el contrato CRM **deriveClientState, duplicateCandidates, prepareManual, audit, correction, scopedStore, withScope** (todas fail-closed; escrituras solo vía `Orbit.store`). `Orbit.accessScope` quedó como **alias/wrapper de compatibilidad sobre los mismos refs de función** — no un segundo motor. Los gates fail-closed por registro/país se conservan intactos.
> 2. **P0-02 · Proyección canónica extendida**: `Orbit.clientProjection` ya no se usa solo en `cliente360.detalle()`. Se proyecta la colección **antes de filtros/búsqueda/render** en la lista de Cliente 360, y se integra en **Calidad** (render + campaña) y — vía `Orbit.kit.clienteCell` — en **Pólizas, Cobros** y todo consumidor visual del cliente. Un cliente importado con aliases (nombreCompleto/correo/numeroDocumento/ciudadMunicipio) aparece en lista, se encuentra por nombre/correo/documento y abre ficha, **sin mutar el store** ni crear relaciones.
> 3. **P0-03 · Gate de conocimiento default-deny real** (`modules/aseguradoras.js`): `sirveParaTarifas` y `sirveParaReglas` ahora exigen **habilitación explícita** (Habilitado para Cotizador/Comparativo). `Mapeado`, `Persistido`, `Requiere validación` y **`Validado`** ya no consumen tarifas/reglas ni marcan el grupo como “Habilitado”; una capacidad auxiliar de presentación tampoco habilita el grupo. `Validado` = listo para decisión, no operativo.
> **Pruebas** (`tools/orbit360-p0-tests.html`): superficie del contrato, deriveClientState/prepareManual/duplicados, cliente alias sin claves canónicas y **matriz de estados** — todas en verde. `node --check` equivalente: 56/56 JS sin error, 0 referencias faltantes.
> **Conservado:** Router, Legal, PWA, copy honesto de Integraciones, Academia v1.256, estados de conocimiento canónicos, credenciales por referencia.
> **Pendiente honesto:** CL-015 evidencia responsive (Operativo tableta / Asesor móvil) sigue requiriendo DevTools del usuario.

## [1.256.0] — 2026-07-17 · Delta acumulado post-v1.255: contrato unificado de acceso + proyección canónica de clientes + estados de conocimiento + copy honesto + Academia
> Incorporación del delta reusable del paquete post-v1.255 (empalme incremental, sin reconstruir; `data/store.js`, `core/auth.js` y `core/importa.js` intactos):
> 1. **Contrato unificado `Orbit.access` (CL-003)** en `core/access-scope.js` — único propietario del motor. Expone la superficie canónica: `activeRole()`/`rolActivo()`, `actorAdvisorId()`, `actorUser()`, `assignedRoles()`, `canView(collection,record,module)`, `canAccessRecord(record,module,opts)`, `filter(collection,rows,module)`, `can(module,action)` (acciones sensibles assign/reassign/delete/merge/approve/validate/reconcile/changeState denegadas al Asesor), `scopeCanon`/`scopeUI` con normalización bidireccional `own/team/all/none ↔ propios/equipo/todos/ninguno`. `Orbit.accessScope` permanece como **wrapper de compatibilidad** sobre el MISMO motor — no hay segundo motor.
> 2. **Proyección canónica reusable de clientes (CL-016)** — nuevo `core/client-projection.js` (`Orbit.clientProjection`). Proyecta EN MEMORIA los sinónimos de un importador externo a claves canónicas (nombre, identificacion, email, telefono, ciudad, departamento, fechaAlta, fechaNac, driveLink, estado, alertas de calidad) sin escribir al store, sin borrar campos de origen, preservando trazabilidad/calidad; sin pólizas ⇒ `pendiente_polizas`; país/moneda no se inventan. Aplicado en `cliente360.detalle()`; reusable por búsqueda, Pólizas, Cobros y Calidad.
> 3. **Estados de conocimiento de aseguradoras canónicos (CL-017)** en `modules/aseguradoras.js`: `Documento recibido → Mapeado → Persistido → Requiere validación → Validado → Habilitado para Cotizador / Comparativo`, explícitamente **no equivalentes** (nota visible en la pestaña Tarifas). `Validado` sirve para tarifas pero **no habilita** Cotizador/Comparativo hasta la habilitación explícita (default-deny intacto).
> 4. **Copy honesto (CL-012/CL-013)**: toast `"No se pudo cargar la simulación LAB."` → `"No se pudo completar la prueba de conexión."`; Configuración → Integraciones ya no dice que validar parámetros establece conexión (`"Parámetros preparados. La conexión queda pendiente de activación y validación segura."` + aclaración "validar parámetros no establece una conexión real"); comentario técnico "Pendiente de backend" retirado del código visible cercano.
> 5. **Academia (CL-020)**: nuevo curso profundo **"Acceso, multirol, alcance y seguridad de datos"** (multirol e identidad, alcance/país, fail-closed/deep-links, Equipo/ampliación de permisos, estados honestos de conexión y credenciales por referencia) con quiz aplicado; `CONTENT_V` 29→30 — se conserva progreso y certificados existentes.
> 6. **Documentación (CL-014)**: README, CHANGELOG y manifiesto unificados a v1.256; `docs/MANIFIESTO-ENTREGA-v1256.md` nuevo.
> **Conservado y validado:** router móvil idempotente, gate legal único, Equipo moderno, credenciales por referencia, plantilla de Comparativo por tenant/aseguradora, scope en Comisiones, PWA sin lógica operativa.
> **Pendiente honesto:** evidencia responsive en 15 viewports exactos sigue requiriendo DevTools del usuario; motor real de importación, tarifas oficiales del Cotizador y gestión documental con Drive real pertenecen al backend protegido (fuera de alcance del prototipo).

## [1.250.0] — 2026-07-14 · countries[] aplicado en dataScope + campaña de renovación con gate real
> 1. **`countries[]` ahora sí filtra**: `Orbit.accessScope.dataScope()` devuelve `'ninguno'` cuando el usuario tiene países limitados (`asesor.countries[]`) y el filtro global `Orbit.pais` activo no está en su lista — antes se capturaba el dato en Equipo pero ningún módulo lo consultaba.
> 2. **Campaña de renovación por lote** (`renovaciones.js` `campana()`): la base ya no es solo `Orbit.pais` + fecha, ahora pasa por `Orbit.accessScope.filtrarPorAsesor()` — un usuario no puede incluir en el envío masivo pólizas fuera de su alcance (antes el filtro de lote no aplicaba scope, solo país/fecha).
> **Pendiente honesto:** el bloqueo por país sigue siendo a nivel de módulo completo (todo o nada) cuando el filtro global coincide con un país no habilitado, no un filtro registro-por-registro cuando el módulo mezcla varios países a la vez con `Orbit.pais='TODOS'`; evidencia responsive de 15 escenarios en viewports exactos sigue sin capturas (limitación de este entorno).

## [1.249.0] — 2026-07-14 · P0-B/P0-C ampliado del paquete maestro post-v1.244: Equipo persiste esquema moderno + gates en Renovaciones/Cliente360/Vehículo
> Auditoría propia contra `13_MATRIZ-CERRADO-PARCIAL-ABIERTO.csv` del paquete maestro encontró gaps reales que el CHANGELOG anterior no reflejaba con precisión:
> 1. **P0-C, gate central ampliado**: `puedeAccederRegistro()` ahora también envuelve `renovar`, `comparativo`, `verVehiculo`, `correoPoliza`, `subirDocumento`, `addBitacora`, `edit()` y `detalle()` (ficha de cliente por deep-link) en `cliente360.js`, y `solicitarPropuestas()` en `renovaciones.js` — antes solo cubría negocios/gestiones/cobros/siniestros/verPoliza/endoso/editarPoliza.
> 2. **P0-B, Equipo escribe el modelo moderno**: `modules/equipo.js` ahora persiste `teamId`, `countries[]`, `modulesExtra[]`/`modulesRestricted[]` (derivados del override de módulos vs. base del rol) y `dataScopes:{default,modules}` — antes solo escribía `dataScope`/`modulosOverride` legacy.
> 3. **P0-D ampliado**: confirmación reforzada ahora también dispara al agregar un país nuevo a un usuario que ya tenía países limitados.
> **Pendiente honesto:** `countries[]` se captura y audita pero aún no se aplica como filtro real en las consultas de cada módulo (el filtro geográfico vigente sigue siendo el selector global `Orbit.pais`); acciones en lote de Ops/Leads y `campana()` de Renovaciones sin gate individual; 15 escenarios responsive de Aseguradoras siguen sin capturas en viewports exactos (limitación de este entorno).

## [1.255.0] — 2026-07-17 · Auditoría transversal proactiva: 1 gap real encontrado y corregido
> Barrido de todos los módulos y core buscando lenguaje técnico/lógica interna visible al usuario (backend/Firestore/Firebase/LAB/localStorage/hardcode/diff crudo/enums sin traducir como `requiere_revision`/`pendiente_backend`). Único hallazgo real: `modules/finanzas.js` — copy "sin hardcode" visible en Configuración → Categorías, término de desarrollo sin sentido para el usuario final. Corregido.
> Revisado y descartado como falso positivo: "Motor de IA"/"Motor de extracción" (nombres de feature, no arquitectura), tabla "Scope" en Configuración → Integraciones (pantalla explícitamente técnica para IT/Admin), badges "diff"/"cambios propuestos" en Ops y Cliente360 (ya traducidos a "cambios propuestos", el `diff` restante es solo el nombre de la propiedad JS, no texto visible).
> **Pendiente honesto:** #108 evidencia responsive en 15 escenarios de viewports exactos sigue abierta (requiere DevTools del usuario).

## [1.254.0] — 2026-07-17 · Fix real: menú móvil no cerraba al navegar + gate legal podía apilar modales duplicados
> 1. **`core/router.js`**: `go(route)` solo cerraba el overlay del menú móvil (`closeMobile()`) cuando el hash ya coincidía (caso raro) — en el camino normal (hash distinto → `location.hash` cambia → `hashchange` → `onHash()` → `render()`), el overlay se quedaba abierto tapando la pantalla tras tocar cualquier ítem, dando la sensación de que "solo se ve Inicio". `closeMobile()` ahora se ejecuta dentro de `render()` (llamado siempre, por ambos caminos), así el menú se cierra en cualquier navegación real.
> 2. **`core/legal.js`**: `gate()` podía crear varios modales de aceptación apilados si se invocaba más de una vez antes del primer clic (cada `document.body.appendChild` quedaba encima del anterior) — el usuario aceptaba uno y aparecía otro idéntico debajo, dando la sensación de "aceptar tres veces". Ahora cada modal se marca con `data-legal-gate="<scopeId>"` y `gate()` no crea uno nuevo si ya hay uno abierto para ese mismo scope.
> **Pendiente honesto:** #108 evidencia responsive en 15 escenarios de viewports exactos sigue abierta (requiere DevTools del lado del usuario).

## [1.253.0] — 2026-07-16 · #107 cerrado: plantilla de impresión del Comparativo con override por aseguradora
> `modules/comparativo.js`: `plantillaCfg(aseguradoraId)` ahora acepta un ID opcional — sin él devuelve la base del tenant (sin cambios); con él, mezcla la base con un override guardado en `Orbit.tenant.comparativoPlantillaPorAseguradora[id]` (secciones/etiquetas). El modal "⚙ Plantilla de impresión" agrega un selector "Aplicar a" (Tenant o una aseguradora específica); guardar con una aseguradora seleccionada escribe solo su override, dejando la base intacta. `imprimirUna()` ya usa la plantilla efectiva de la aseguradora de esa propuesta; `imprimir()` (comparativo conjunto) sigue usando la base del tenant a propósito, porque combina varias aseguradoras en una sola tabla.
> **Pendiente honesto:** #108 evidencia responsive en 15 escenarios de viewports exactos sigue abierta (requiere DevTools del lado del usuario, no es una limitación de código).

## [1.252.0] — 2026-07-14 · #106 cerrado: gate en mutaciones directas de Comisiones
> `modules/comisiones.js`: `toggleEstado(id)` y `detalle(campo,key)` ahora pasan por `Orbit.accessScope.puedeAccederRegistro()`/`filtrarPorAsesor()` — antes solo el listado agregado (`render()`) filtraba por alcance; abrir el detalle de un grupo o alternar Liquidada/Devengada por ID directo no lo hacía.
> **Finanzas (`finmovs`) revisado y descartado como gap real**: los movimientos financieros no tienen `asesorId` (ledger de empresa, no de cartera por asesor) y el rol Finanzas no declara `scopes` — el control de acceso correcto ahí es a nivel de módulo (ya cubierto por `puedeVerModulo`/`canSee`), no por registro; forzar un gate por-registro sin campo de dueño real sería cosmético, no protección real.
> **Pendiente honesto:** #107 (override de plantilla del Comparativo por aseguradora) y #108 (evidencia responsive en 15 escenarios, requiere DevTools del usuario) siguen abiertos.

## [1.251.0] — 2026-07-14 · P0 críticos de auditoría v1.250: fail-closed real sin excepciones, gate central por registro (país/tenant), claves canónicas ops/leads, mutaciones sin gate cerradas, bancos ficticios completos, motivo/diff íntegro de permisos
> Nota de numeración: **v1.246 no fue emitida como candidata independiente** — el trabajo de esa franja quedó absorbido dentro de v1.247–v1.250 (mismo día, mismas sesiones); no existe ZIP v1.246 separado.
> 1. **Fail-closed sin fallback privilegiado**: `accessScope.rolActivo()` ante error ya NO devuelve `'Dirección'` (devuelve `''`); `puedeVerModulo()` ante error ya NO devuelve `true` (devuelve `false`); `dataScope()` ante identidad declarada pero inexistente en el store, inactiva/suspendida, o rol no resoluble, devuelve `'ninguno'` (antes caía en `'todo'`). `config.js`: `rolesAsignados()` sin store devuelve `null` (pendiente real), ya no `[d.rol]`; `session.rol()` devuelve `''` cuando el store ya cargó y la identidad no resuelve ningún rol (antes conservaba el último `d.rol` persistido, p.ej. `'Dirección'` stale).
> 2. **Gate central `canAccessRecord(record, modulo, opts)`** en `access-scope.js`: valida tenant/módulo activo, identidad viva, **país del registro puntual** (vía `opts.pais`/`record.pais`) contra `countries[]` del usuario — independiente del filtro global `Orbit.pais`, así `Orbit.pais='TODOS'` ya no evade la restricción de país por registro — y scope/team. `puedeAccederRegistro()` es ahora un wrapper de compatibilidad sobre este gate (mismas llamadas existentes, protección reforzada).
> 3. **Claves canónicas Ops/Leads**: `core/ciclo.js` deja de leer `dataScope('negocios')` (clave inexistente en `dataScopes.modules`, siempre caía al default) — usa `moduloDeNegocio(n)` (`'ops'` si la etapa tiene columna operativa, si no `'leads'`) para negocios, y `'ops'` fijo para gestiones. Reproducción del bug confirmada corregida: `dataScopes.modules.ops='none'` ahora sí bloquea, ya no lo evade `dataScopes.modules.negocios='all'`.
> 4. **Mutaciones sin gate cerradas**: `crearGestion` (valida scope antes de asignar asesor ajeno, ya no fuerza `asesorId:'ase001'` por defecto — usa el asesor de la sesión), `solicitarGestion`, `nuevoNegocio` (restringe selector de asesor cuando el scope es `propia`), `nuevaGestion`, `modules/cobros.js` `conciliarFactura`/`lote` (filtra por alcance, ya no solo por país), `modules/siniestros.js` `nuevo()` (el selector de cliente ya no lista `S().all('clientes')` sin filtrar).
> 5. **Bancos ficticios completos de verdad**: seed y "+ Cuenta" nueva generaban `'****' + 4 dígitos` pese al copy "completo" — ahora generan un número ficticio completo (prefijo + 7 dígitos) y el copy ya no dice "enmascarado". Usuario de plataforma (`p.user` directo) reemplazado por `Orbit.vault.field(p.usuarioRef, …)` — ya no imprime el dato crudo del registro.
> 6. **Credenciales**: `Orbit.credentials.resolve()` para fixtures `ficticio-*` ya NO devuelve el propio `credentialRef` como si fuera el valor revelado — resuelve a un valor de demostración separado (`_fixtures` map), así la referencia nunca se muestra como si fuera el secreto.
> 7. **Auditoría de ampliación de permisos**: la actividad registrada en Equipo ahora guarda el `motivoExacto` (texto completo escrito en la confirmación reforzada, no solo la lista de categorías detectadas) y un `diffIntegral` completo (roles, rolDefault, scope default y por módulo, modulesExtra/modulesRestricted, países, permisosExtra, restricciones, estado — antes/después), más actor/rol/timestamp/resultado.
> **Pendiente honesto:** `canAccessRecord` no se ha propagado a *todas* las mutaciones legacy de la plataforma (Finanzas, Comisiones y otros módulos administrativos con acciones directas por ID no auditados en esta pasada); override de plantilla del Comparativo por aseguradora individual; capturas de 15 escenarios responsive en viewports exactos (limitación del entorno, no del código). Ver `docs/MANIFIESTO-ENTREGA-v1251.md`.

## [1.248.0] — 2026-07-13 · Comparativo: criterios/etiquetas configurables + persistencia inmediata; Vault: auditoría completa
> **Comparativo**: `Orbit.tenant.DEFAULT.comparativoCriterios` nuevo (label/icon por precio/cobertura/equilibrio, editable en el modal "⚙ Plantilla de impresión" junto a las secciones ya configurables) — el cálculo sigue siendo precio/cobertura/equilibrio (honesto: no son criterios libres nuevos, solo personalización de nombre/ícono). La plantilla ahora muestra `#1..#5` como orden visible de secciones. Cada replanteo de criterio se persiste de inmediato en `Orbit.store` (`guardarHist({silencioso:true})`) en vez de esperar a que el usuario guarde manualmente.
> **Vault**: `auditar()` ahora distingue explícitamente intento/denegación/error/revelación/copia (`intento_ver`, `denegado_copiar`, `no_conectado`, `error_proveedor`, `revelado`, `copiado`) y registra `tipoDato`, `plataformaId` estable y `resultadoProveedor` en cada entrada de `auditLog` — antes solo se auditaba tras una revelación/copia exitosa.
> **Pendiente honesto:** override de plantilla por aseguradora individual (hoy es un único config por tenant); evidencia responsive reproducible de 15 escenarios de Aseguradoras (requiere capturas, no código).

## [1.247.0] — 2026-07-13 · Equipo: confirmación reforzada ampliada a todos los casos de ampliación de acceso
> `ampliaAcceso` en `modules/equipo.js` ahora cubre: subir scope propia→equipo/todo o ninguno→cualquiera (antes solo detectaba llegar a "todo"), agregar rol privilegiado (Dirección/Admin), retirar una restricción existente, reactivar una membresía inactiva, agregar módulo a `modulosOverride`, y agregar permiso extra (ya existía). El prompt de confirmación ahora lista los motivos detectados y exige escribir "CONFIRMO AMPLIAR ACCESO" + motivo. La actividad registrada incluye actor (rol activo), estado antes/después completo (rol, scope, activo/inactivo) y marca `[AMPLIACIÓN CONFIRMADA]` cuando aplicó.

## [1.245.0] — 2026-07-13 · P0-A/P0-C/P0-E del paquete maestro: fail-closed de sesión + gate en mutaciones directas + bancos sin vault
> 1. **Sesión fail-closed real**: `rolesAsignados()`/`session.set()` ahora rechazan usuario inexistente, inactivo (`a.inactivo`) o suspendido/bloqueado (`status`) — antes solo se validaba el rol, no el estado de la cuenta. `canSee()` deja de ser fail-open (`if(!r) return true` → `return false`).
> 2. **Gate en mutaciones directas** (no solo listas/KPIs): `Orbit.accessScope.puedeAccederRegistro()` nuevo, envuelto en `core/ciclo.js` (`setEtapa`, `perder`, `archivar`, `emitir`, `openNegocio`, `openGestion`) y `modules/cobros.js` (`detalle`, `validarReporte`, `aplicarPago`) — antes ocultar la tarjeta en el kanban no impedía llamar la función directamente por ID. Probado en vivo: `Orbit.ciclo.perder(id,...)` sobre un negocio fuera de alcance no cambia el estado y muestra toast.
> 3. **Bancos sin `Orbit.vault`**: `ctaRow()` ya no enmascara ni restringe el número de cuenta — se muestra completo con botón "⧉ Copiar" real, sin `credentialRef`/proveedor (regla de negocio: son operativos, no secretos).
> **Pendiente honesto:** gate aún no aplicado a Renovaciones/Siniestros/Cliente360-Póliza (endoso, editar, renovar) ni a lotes; confirmación reforzada no ampliada a todos los casos del paquete (país, módulo, reactivar membresía); Comparativo sin criterios/orden configurables por tenant; auditoría del vault sin tipo de dato/resultado del proveedor; evidencia responsive 15 escenarios sin generar.

## [1.244.0] — 2026-07-13 · Fail-closed real en sesión/scope + credenciales: Finanzas removido, bancos sin restricción, resolve() honesto
> Corrección de residuos P0 críticos de la auditoría externa v1.243:
> 1. `rolesAsignados()` ahora es fail-closed de verdad: si el asesor vinculado no tiene `roles[]`/`rol` resoluble, devuelve `[]` (deniega) en vez de heredar el rol activo actual — antes un registro sin rol válido heredaba Dirección/Admin.
> 2. `dataScope()` lee primero el modelo moderno `dataScopes.modules[modulo]`/`dataScopes.default` (con alias own/team/all/none → propia/equipo/todo/ninguno), luego el legacy `dataScope`, luego el rol.
> 3. `filtrarPorAsesor()`: un registro **sin asesor asignado ya NO se muestra por defecto** en scope `propia`/`equipo` (antes se colaba como visible) — probado en vivo: Asesor con `dataScope:'ninguno'` ve 0 filas reales en Cliente360 (antes veía todo).
> 4. `puedeVerModulo()` nuevo en `access-scope.js`: módulos base del rol + `modulesExtra[]` − `modulesRestricted[]`, restricción siempre gana; `core/router.js` (sidebar y guard de ruta) lo usa en vez de solo `Orbit.session.canSee`.
> 5. Credenciales de plataformas: **Finanzas removido** de `puedePlataformasCredenciales()` (solo Dirección/Admin/Operativo, o extra explícito).
> 6. Cuentas bancarias: **eliminada la restricción por usuario** — `puedeBancosOperativos()` siempre `true`; checkbox correspondiente retirado de Equipo (la regla de negocio confirmada es que son operativas, no secretas).
> 7. `Orbit.credentials.resolve()` default ya NO devuelve el propio `credentialRef` como si fuera el secreto — devuelve `null` (honesto) salvo fixtures explícitas de prueba con prefijo `ficticio-`.
> **Pendiente honesto (histórico, ver v1.245-1.249 para cierre parcial):** gates de scope en acciones/mutaciones directas; confirmación reforzada ampliada; criterios/orden de secciones del Comparativo configurables; evidencia responsive de 15 escenarios.

## [1.243.0] — 2026-07-13 · CRM (6 módulos): scope equipo/ninguno real (gap encontrado en re-auditoría propia)
> Revisión final del paquete residual encontró un gap real: Cliente360/Pólizas/Cobros/Renovaciones/Siniestros/Comisiones solo implementaban `'propia'` — `'equipo'` y, más grave, `'ninguno'` caían silenciosamente a "ver todo" (un usuario con `dataScope:'ninguno'` seguía viendo la cartera completa). `core/access-scope.js` agrega `filtrarPorAsesor(items, getAsesorId, modulo)` genérico (propia/equipo por `teamId`/todo/ninguno) y los 6 módulos + `cliente360.detalle()` lo usan ahora. Probado en vivo con datos reales: `dataScope:'ninguno'` → 0 clientes visibles (antes mostraba todos); `dataScope:'equipo'` → 6 clientes, todos de `teamId:'t1'` (antes no existía esta rama). Academia (`cur_aseguradoras`) corregida para reflejar la política real de bancos (visible por defecto, no restringida por rol) que se había corregido en v1.240 pero no se había propagado al contenido educativo — nueva pregunta de evaluación. `docs/BITACORA-CAMBIOS.md` recibe resumen de v1.224-v1.242 (estaba parada en v1.213). `CONTENT_V`→28.

## [1.242.0] — 2026-07-13 · Vault: revelación real vía Orbit.credentials.resolve() (cierre del último pendiente P0-RES-03)
> Último pendiente honesto del paquete residual: `Orbit.credentials.resolve()` existía pero sin llamador real. Ahora `core/credential-vault.js` lo usa de verdad — "Ver 15s"/"Copiar" pasan por el hook (async), muestran "⏳ Resolviendo…" mientras tanto, y si el proveedor devuelve `null` (sin `credentialRef` real configurado) el campo muestra honestamente "Pendiente de conexión segura" **sin auditar nada** (no hubo revelación real). Probado en vivo dos casos: (1) `credentialRef` placeholder → "Pendiente de conexión segura", sin entrada de auditoría; (2) `credentialRef` ficticio real → valor revelado + auditoría completa (`aseguradoraId`, `plataforma`, `módulo`, actor, rol, fecha). Con esto se cierra el paquete residual completo: única brecha restante es la evidencia responsive de 15 escenarios reproducibles, que requiere capturas del verificador, no código.

## [1.241.0] — 2026-07-13 · Comparativo: motivo obligatorio + ponderación configurable por tenant
> Cierre de dos pendientes del paquete residual: el motivo del replanteamiento (cambio de criterio) ahora es **obligatorio** — sin motivo, el cambio se cancela y no se aplica. El criterio "Equilibrio" ya no usa 50/50 fijo: `core/config.js` agrega `Orbit.tenant.DEFAULT.comparativoPonderacion` (precio/cobertura configurable, suma 100), editable con un slider en el mismo modal "⚙ Plantilla de impresión" — probado en vivo, el slider aparece y funciona. `docs/REPORTE-SMOKE.md` recibe nota de vigencia explícita (era v1.163, quedó como histórico; la evidencia real vive en CHANGELOG por versión).

## [1.240.0] — 2026-07-13 · Corrección de 4 fallas reproducidas + 1 regresión propia detectada antes de publicar (auditoría v1.239)
> Todas probadas en vivo con `eval_js_user_view`, no solo revisadas en código:
> 1. **Bypass cruzado de rol** — `Orbit.session.set('Finanzas','ase002')` ya no acepta un rol que el asesor destino no tiene, incluso cambiando de asesor explícitamente (antes el cambio de asesor evadía la validación). Probado: rechazado, `rol` se mantiene en el anterior.
> 2. **Fallback legacy inseguro** — sin `roles[]`, ya no se admite `Object.keys(Orbit.ROLES)` completo; ahora es fail-closed a su `rol` único (canonicalizado, ver punto 5). Probado: ase004 solo ofrece `['Asesor']`.
> 3. **Rol persistido inválido no se corregía** — `Orbit.session.rol()` ahora normaliza contra los roles asignados del asesor vinculado en cada lectura (no solo una vez al cargar, porque `Orbit.store` aún no existía en ese momento); si el rol persistido ya no es válido, cae a `rolDefault` o al primero asignado. Probado con `localStorage` manipulado a mano: `Finanzas` inválido para ase001 se normalizó a `Dirección`.
> 4. **`dataScope` de Equipo era declarativo** — `core/access-scope.js` `dataScope()` ahora lee primero el campo `dataScope` del registro del asesor activo (antes solo leía defaults de rol). Probado: `ase002.dataScope='ninguno'` ahora bloquea `cliente360`/`negocios` de verdad. Ajustado también el *default* del selector en Equipo para no pisar accidentalmente `'todo'` de Dirección/Admin al guardar sin tocar el campo.
> 5. **Regresión propia detectada antes de publicar**: el fail-closed de #2 rechazaba a usuarios legacy cuyo campo `rol` es una etiqueta libre (`"Asesor Sr."`, `"Asesora Jr."`) en vez de la clave canónica de `Orbit.ROLES` — habría roto el cambio de rol para 3 de 5 asesores del seed. Se agregó `rolCanonico()` (coincidencia de substring, sin acentos) para resolver la clave real antes del fail-closed. Probado: `ase002` ("Asesor Sr.") canonicaliza a `"Asesor"` y el cambio de rol funciona.
> 6. **Política de bancos corregida**: `puedeBancosOperativos()` ya no depende del rol — cualquier usuario con acceso a Aseguradoras ve/copia cuentas bancarias completas (solo una restricción explícita por usuario lo bloquea); la restricción por rol sigue aplicando únicamente a credenciales de plataformas. Checkbox "extra" de bancos removido de Equipo (ya no aplica, solo queda la restricción). Probado: Asesor ve cuentas bancarias sin badge de restricción.
> 7. Auditoría del vault ahora incluye `aseguradoraId`/`plataforma`/`módulo` de contexto (antes solo el id técnico del campo), usando el `ctxMap` que estaba declarado pero sin uso.
> **Pendiente, honesto:** `Orbit.credentials.resolve()` sigue sin un llamador real (requeriría volver async el render de la ficha — no lo forcé por riesgo); scope `equipo`/`ninguno` de los 6 módulos CRM sigue sin `team` real fuera de Ops/Leads; criterios/ponderaciones del Comparativo no configurables por tenant (equilibrio fijo 50/50); motivo de replanteamiento sigue opcional; plantilla de impresión sin orden ni override por aseguradora; documentación (manifiesto v1.239+, BITÁCORA, REPORTE-SMOKE) sigue sin unificar.

## [1.239.0] — 2026-07-13 · Comparativo: plantilla de impresión configurable por tenant (cierre P1-RES-05 completo)
> `core/config.js`: nuevo `Orbit.tenant.DEFAULT.comparativoPlantilla` (secciones visibles + etiquetas, defaults genéricos ficticios). Botón "⚙ Plantilla de impresión" en Comparativo abre modal para activar/desactivar secciones (prima total, forma de pago, prima neta, IVA/recargos, coberturas) y editar su etiqueta — persistido vía `Orbit.tenant.setDeep`. `imprimir()` (genérico) e `imprimirUna()` (individual por aseguradora) ahora leen esta config real, no hardcodean las filas. Probado en vivo: botón abre modal sin errores de consola. Con esto se cierra P1-RES-05 completo (replanteamiento trazable + línea de tiempo + plantilla configurable).

## [1.238.0] — 2026-07-13 · Comparativo: replanteamiento trazable + línea de tiempo (cierre P1-RES-05)
> Cambiar el criterio (precio/cobertura/equilibrio) ya no solo re-renderiza: pide motivo, captura la recomendación antes/después y guarda el evento en `meta.replanteos[]` (fecha, actor, antes, después, motivo, recomendaciónAntes/Después). Nueva sección "🕘 Línea de tiempo de este comparativo" unifica: carga de cada propuesta (`fechaCarga`, nuevo campo en `persistirCotizacion`), correcciones, validaciones, replanteamientos, comunicación preparada (`meta.envioPreparado`, seteado en `enviarCliente()`) y decisión del cliente (`meta.decisionCliente`, seteado en `aceptarOpcion()` al crear la solicitud de emisión). Gates existentes (ranking/impresión/comunicación/aceptación bloqueados sin validar) sin cambios. **Pendiente:** plantilla de impresión configurable por tenant/aseguradora (logo/etiquetas/secciones) — la impresión actual usa branding de tenant pero no permite reordenar secciones; evidencia responsive 15 escenarios de Aseguradoras aún no generada.

## [1.237.0] — 2026-07-13 · Ops/Leads: scope own/team/all real (cierre P1-RES-06)
> Verificado en vivo con datos reales del seed: `core/ciclo.js` `rolFiltro()` ahora consulta `Orbit.accessScope.dataScope('negocios')` en vez de solo el binario `esAsesor()`. Se agregó `teamId` a 3 asesores del seed (`__v`→68) y `Orbit.ROLES.Operativo.scopes.negocios:'equipo'` / `Asesor.scopes.negocios:'propia'`. Probado: Dirección ve 13 negocios (todo), Asesor (ase002) ve 2 (solo los suyos), Operativo (ase002, teamId t1) ve 5 (todo su equipo, ningún `t2`). Aplica a Ops y Leads porque comparten el mismo `negocios()`/`gestiones()` de base. **Corrección de una regresión propia detectada antes de publicar:** una primera versión usaba la clave de scope `'ops'` para ambos tableros, lo que habría dejado a un Asesor con el pipeline de Leads vacío (`'ninguno'` heredado); se corrigió a una clave neutral `'negocios'` compartida.

## [1.236.0] — 2026-07-13 · Credenciales: permisos separados plataformas/bancos + auditLog real (cierre P0-RES-03)
> Verificado en vivo: `puedePlataformasCredenciales()` y `puedeBancosOperativos()` en `modules/aseguradoras.js` reemplazan el chequeo binario compartido (`Orbit.vault.isRestricted()`, solo Asesor) — ahora son dos permisos independientes con extra/restricción propios, editables en Equipo → Permisos avanzados (4 checkboxes nuevos), y con confirmación reforzada al conceder cualquiera de los dos. `core/credential-vault.js`: cada "Ver 15s"/"Copiar" ahora inserta un registro real en `Orbit.store.all('auditLog')` (actor, rol activo, acción, campo, fecha) — probado: revelar una credencial como Dirección generó `{accion:'ver', actor:'Andrea Beltrán', rolActivo:'Dirección', campo:'vltk_asg01|0'}`. Se agregó `Orbit.credentials.resolve(credentialRef, context)` como hook proveedor reutilizable (hoy devuelve el valor ficticio ya guardado o `null` si no hay proveedor — reemplazable por backend real sin tocar llamadores). Probado también: Admin ve cuentas bancarias sin restricción (rol por defecto autorizado). **Pendiente:** scope `own/team/all/none` en Ops/Leads, replanteamiento trazable en Comparativo, evidencia responsive 15 escenarios.

## [1.235.0] — 2026-07-13 · Equipo: rolDefault seleccionable + confirmación reforzada + Academia (deltas)
> `modules/equipo.js`: agregado selector "Rol por defecto" (solo entre roles marcados), confirmación reforzada ("CONFIRMO AMPLIAR ACCESO") al subir scope a `todo` o conceder un permiso extra, registro de actividad con antes/después al guardar permisos. `core/config.js`: `dataScope` admite `'ninguno'`. `data/academia-plus.js` (`CONTENT_V`→27): 3 lecciones nuevas — confirmación reforzada al ampliar acceso, verificación productiva en solo lectura (Dirección/IT), financiero histórico→finmovs (7 requisitos de promoción) — sin duplicar cursos existentes. README/PENDIENTES-Y-MEJORAS actualizados con estado real post-v1.234.

## [1.225.0] — 2026-07-13 · access-scope.js + bóveda de credenciales real (15s, restringida a Asesor)
> Paquete exclusivo Claude, continuación P0-CL-02/04: (1) Nuevo `core/access-scope.js` centraliza rol activo/dataScope/visibilidad de módulo envolviendo `Orbit.session`/`Orbit.ROLES` — reemplaza lógica dispersa por módulo. (2) `core/credential-vault.js`: el temporizador de revelación pasa de 6s a **15s** (spec explícita); se agrega `isRestricted()`/`opts.restricted` — el Asesor ya no ve botones Ver/Copiar (queda badge "🔒 Acceso restringido") y el copiado se bloquea aunque se fuerce el DOM. (3) `modules/aseguradoras.js` → pestaña Plataformas ahora muestra usuario + estado de credencial vía la bóveda (antes no había fila de credencial en absoluto). **Pendiente honesto:** el vault no persiste `aseguradoraId|platformIndex` como clave estable entre renders (usa `seq` interno) — funcionalmente seguro (nunca expone dato tras re-render) pero no exactamente el esquema de clave pedido; P0-CL-03 (regresión CRM completa con este scope) y P0-CL-05 (Academia) siguen sin tocar.

## [1.234.0] — 2026-07-13 · P0-RES-02 parcial: roles[] reales, guard de ruta, Aseguradoras para Operativo/Asesor
> Paquete residual post-v1.233. Cambios verificados en vivo (no solo código):
> 1. `Orbit.session` ahora valida `rolesAsignados()` — si el asesor activo declara `roles[]` (nuevo campo en `data/seed.js`, ej. ase001: `['Dirección','Admin']`), el selector de rol del topbar y `Orbit.session.set()` rechazan cualquier rol fuera de esa lista (probado: pedir "Finanzas" sin tenerlo asignado no cambia el rol). Sin `roles[]` declarado, se mantiene retrocompatible (admite cualquier rol, como antes).
> 2. Eliminado el `asesorId:'ase001'` hardcodeado del selector de rol en `index.html` — ahora solo cambia de rol, nunca fuerza el asesor salvo que se pase explícitamente.
> 3. `core/router.js`: guard real de ruta por hash — navegar directo a un módulo no incluido en `Orbit.session.canSee()`/`Orbit.tenant.isActive()` ya no renderiza el módulo; muestra "No tienes acceso con el rol activo" y botón volver a Inicio. Antes solo se ocultaba del menú, la ruta directa igual renderizaba.
> 4. `Orbit.ROLES.Asesor` ahora declara `scopes` explícitos (`cliente360/polizas/cobros/renovaciones/siniestros/comisiones:'propia'`, `ops:'ninguno'`) consumidos por `core/access-scope.js`.
> 5. Aseguradoras: `p.user` en Plataformas se enmascara como "🔒 restringido" para roles con `Orbit.vault.isRestricted()` true (Asesor), en vez de mostrarse en claro.
> **Pendiente honesto (no alcanzado esta pasada):** Equipo.js no tiene UI para editar `roles[]`/`rolDefault` por usuario (hoy solo vía seed); scope `own/team/all/none` no aplicado a Ops/Leads todavía; separación de permisos `aseguradoras_plataformas_credenciales` vs `aseguradoras_bancos_operativos` no implementada (siguen unificados); vault sigue leyendo el valor desde `Orbit.store` en memoria, sin hook `Orbit.credentials.resolve()` ni auditLog de ver/copiar; diff/motivo/confirmación reforzada al ampliar acceso no implementado; Academia sin los deltas de este paquete; documentación (README/manifiesto/BITACORA/PENDIENTES) no reescrita con el detalle P0-RES-01; evidencia responsive 15 escenarios no generada.

## [1.233.0] — 2026-07-13 · Comparativo: impresión por aseguradora individual (cierre parcial P1-CL-06)
> Gap real: solo existía impresión del comparativo genérico (tabla multi-aseguradora); el paquete pide también "impresión por aseguradora... configurables por tenant". Agregado `imprimirUna(i)` — botón "🖨 Imprimir esta propuesta" en cada tarjeta validada, genera un documento A4 de una sola aseguradora (prima neta/IVA/total, cuotas, suma asegurada, deducible, coberturas) con el mismo branding por tenant (logo/color de `Orbit.tenant` y CSS vars) que el comparativo genérico. Solo propuestas `validada` pueden imprimirse individualmente (mismo gate que el comparativo). Endoso con diff, ficha-página de Póliza y vault con clave estable de pasadas anteriores se mantienen sin regresión.

## [1.232.0] — 2026-07-13 · Endoso con diff real antes/después (cierre P1-CL-07)
> Gap real encontrado: los endosos desde Cliente360 solo registraban texto libre, sin comparación estructurada — contradice "Endosos como gestión con diff". `endoso()` ahora captura prima neta y suma asegurada actuales (auto-completadas, deshabilitadas) vs. propuestas, arma `g.diff = {primaNeta:{antes,despues}, sumaAsegurada:{antes,despues}}` y lo persiste en la gestión. `cardGestion()` (Ops) muestra badge "🔀 diff" cuando existe, y `openGestion()` renderiza el bloque antes→después explícito. Sigue sin modificar la póliza hasta que el equipo resuelve la gestión — el diff es propuesta, no aplicación. Confirmado además: `aceptarOpcion()` en Comparativo ya crea `workflowType:'issuance_request'` sobre `gestiones` (funcionalmente equivalente al `issuance_request` pedido, aunque no es una colección dedicada — documentado como tal, no oculto).

## [1.231.0] — 2026-07-13 · Vault: clave estable por tarjeta + Academia: lección de dataScope
> P0-CL-04 (cierre real): `core/credential-vault.js` acepta `opts.key` (`aseguradoraId|platformIndex` en plataformas, `cta_aseguradoraId|i` en cuentas bancarias) en vez de un contador global — cumple el requisito explícito de clave estable del paquete; el estado de revelación (`revealUntil`) ahora sobrevive un re-render intermedio del host durante los 15s. P0-CL-05 (parcial adicional): `cur_ind_it` suma lección "Rol activo y alcance de datos (dataScope)" explicando `propia/equipo/todo/ninguno` y el flujo de gestión de corrección del Asesor, + 2 preguntas nuevas. `CONTENT_V`→26.

## [1.230.0] — 2026-07-13 · Asesor: Comparativo habilitado + verificación real de permisos
> Corregido: rol **Asesor** no tenía `comparativo` en su lista de módulos (`core/config.js` `Orbit.ROLES.Asesor.modulos`) — solo tenía `cotizador`, por eso no aparecía en su sidebar aunque el módulo esté construido y activo a nivel tenant. Agregado. Confirmado además, por revisión directa del código (no solo por reporte previo): el cambio de rol se hace desde el selector del topbar (`index.html` → `Orbit.session.set(rol, asesorId)`) y desde Configuración → Usuarios y permisos, donde cada usuario tiene su propio selector de rol y hay checklist de módulos activos por cuenta — ambos puntos ya eran funcionales, no nuevos.

## [1.229.0] — 2026-07-13 · Renovaciones/Siniestros/Comisiones: scope completo (cierre de P0-CL-03)
> Mismo patrón aplicado a los 3 módulos restantes con visión de rol: `renovaciones.js` (`buckets()` filtra pólizas por `asesorId` en scope `'propia'`), `siniestros.js` (`todos()` filtra reclamos por `asesorId`), `comisiones.js` (`render()` filtra por `asesorId` — coherente con que las comisiones ya son inherentemente por asesor). Con esto, P0-CL-03 queda cerrado para los 6 módulos con datos por cliente/póliza: Cliente360, Pólizas, Cobros, Renovaciones, Siniestros, Comisiones. Portal no requiere el patrón (el cliente ya ve solo lo suyo por diseño).

## [1.228.0] — 2026-07-13 · Pólizas/Cobros: mismo gap de scope corregido (extensión de P0-CL-03)
> Confirmado el mismo gap que en Cliente360: `modules/polizas.js` y `modules/cobros.js` `rows()` no filtraban por `asesorId` cuando el rol activo es Asesor. Ambos ahora consultan `Orbit.accessScope.dataScope('polizas'|'cobros')` — si es `'propia'`, Pólizas filtra por `asesorId` de la póliza y Cobros filtra por el `asesorId` de la póliza asociada al recibo. Roles con scope `'todo'` no cambian. **No verificado en esta pasada:** Portal (el cliente ya ve solo lo suyo por diseño — no requiere este patrón), Renovaciones, Siniestros, Comisiones — quedan para confirmar en la siguiente pasada.

## [1.227.0] — 2026-07-13 · Cliente360: alcance real por rol (P0-CL-03 — regresión encontrada y corregida)
> Auditoría encontró una regresión real: `modules/cliente360.js` `lista()` mostraba **todos** los clientes sin importar el rol activo (el filtro `f.asesor` era opcional, elegido por el usuario, no forzado por scope) — contradice "Asesor: solo clientes asignados". Corregido: `lista()` y `detalle()` ahora consultan `Orbit.accessScope.dataScope('cliente360')`; si es `'propia'` (Asesor), la lista se filtra a sus clientes y abrir la ficha de un cliente ajeno muestra bloqueo honesto + botón **"Crear gestión de corrección"** (nueva función `solicitarCorreccionAsignacion`, exportada en la API del módulo) en vez de silenciarlo o dejarlo pasar. Roles con `dataScope` `'todo'` (Dirección/Admin/Finanzas, default) no cambian de comportamiento. **Pendiente:** aplicar el mismo patrón de scope a Pólizas/Cobros/Portal si se confirma que tienen el mismo gap (no verificado en esta pasada).

## [1.226.0] — 2026-07-13 · Academia: lección de bóveda de credenciales (15s/rol restringido)
> P0-CL-05 (parcial): curso existente `cur_aseguradoras` (sin duplicar) suma una lección sobre el nuevo comportamiento del vault — Ver 15s/Copiar visibles solo para roles autorizados, badge "Acceso restringido" para Asesor — y 2 preguntas nuevas de evaluación. `CONTENT_V` → 25 (fuerza reseed). Resto de P0-CL-05 (lecciones de CRM/Portal/Póliza por scope, importación dry-run, Cotizador/Comparativo) sigue pendiente.

## [1.224.0] — 2026-07-13 · Source-lock: limpieza de instrucciones legacy "post v1.97"
> Paquete exclusivo Claude (post-v1.215) P0-CL-01: `LEEME-FUSION-CHATGPT-CODEX.md` y `docs/paquete-claude-post-v197/` seguían activos en la raíz de entrega indicando "continuar sobre v1.97", contradiciendo la base real (v1.215+). Movidos íntegros a `docs/legacy/` con nota explícita de que no son instrucción vigente. La única identidad válida de esta entrega es v1.215 → v1.224. **Pendiente honesto (no alcanzado en esta pasada, por alcance/capacidad):** P0-CL-02 (helper `core/access-scope.js` para rolActivo/dataScope reutilizable — hoy el patrón existe disperso por módulo, no centralizado), P0-CL-03 (auditoría de regresión CRM/Cliente360/Póliza/Portal contra el nuevo scope), P0-CL-04 (Aseguradoras OP2: bóveda de credenciales con revelación temporal de 15s resistente a re-render — hoy solo existe `credentialRef:'backend_required'` sin UI de revelación), P0-CL-05 (actualización de Academia con las 7 lecciones nuevas del paquete), P1-CL-06/07/08 (Cotizador/Comparativo avanzado, Ops/Leads, evidencia responsive 1366/768/390 completa). Ver `docs/PENDIENTES-Y-MEJORAS.md` para el detalle línea por línea a retomar en la próxima pasada.

## [1.214.0] — 2026-07-12 · Corrección real v1.214: sin reglas comerciales globales, handoff y comparativos persistidos
> Auditoría v1.213 marcó 13 fallas P0 físicas. Corregido con código verificable (no solo docs): (1) `RECARGO_FRACC`, recargo por antigüedad 8% y gastos de emisión 5% eliminados de `modules/cotizador.js` — ahora se leen de `a.cotTasas` por aseguradora (recargoFraccPct/recargoAntiguedad/gastosEmisionPct); si faltan, el componente es 0, nunca un valor genérico global. (2) `estadoValidacion` ya no se fuerza a `'validada'` para todo el lote: automático solo valida si pasó el gate de tasas (`tieneTasaValidada`), manual nace `requiere_revision`. (3) Handoff Cotizador→Comparativo migrado de `sessionStorage` a colección `Orbit.store('quoteTransfers')` con IDs, cliente, país, moneda, ramo y estado. (4) DTO `CotizacionNormalizada` ampliado con `fuenteDocumentoId`, `versionFuente`, `vigenciaFuente`, `confirmacionHumana`, `estadoComercial`, `trazabilidad`. (5) Comparativo: eliminado `total/1.12` como inferencia fiscal fija — si el manual/PDF no trae neta/IVA explícitos, queda marcado `desgloseIncompleto` en vez de asumir 12%. (6) `Orbit._compHist` eliminado — Comparativo y su historial se persisten en `Orbit.store('comparativos')`, sobreviven recarga. (7) Aceptación de propuesta ahora etiqueta la gestión creada con `workflowType:'issuance_request'`, `quoteId` y `comparisonId`. (8) "Enviado" corregido a "preparado" en Cotizador, Renovaciones, Cobros, Notificaciones, Portal, Automatizaciones y bandeja de Correo (carpeta `enviados`→`preparados`) — abrir un canal ya no se registra como confirmación de envío. Detalle honesto de lo que **no** se cerró (fuente/versión de tarifa con UI de carga, Replantear profundo, visor documental transversal, multirol completo, ficha-página de Póliza, responsive demostrado, copy técnico de superficies admin) en `docs/MANIFIESTO-ENTREGA-v1214.md`.

## [1.213.0] — 2026-07-12 · Corrección real: Cotizador/Comparativo sin tarifa fantasma, validación obligatoria
> Auditoría rechazó v1.212 (solo tocaba Academia). Esta versión corrige comportamiento: `TASAS_DEF` eliminado (Cotizador bloquea cálculo automático sin tarifa validada por aseguradora, honesto "Tarifa pendiente de validación"); `Orbit._cots` reemplazado por persistencia en `Orbit.store`; propuestas PDF/manual nacen "Requiere revisión" y quedan fuera de ranking/impresión/envío/aceptación hasta validarse (nuevo flujo de validación con actor+motivo); "enviado" ya no se declara al solo abrir el canal ("preparado" en su lugar); curso duplicado de Academia fusionado (además de contenido, `seed.__v`→66 para forzar reseed real, no solo en el archivo fuente). Detalle en `docs/BITACORA-CAMBIOS.md` (v1.213). Pendiente honesto: falta editor de UI para cargar tabla de tasas reales por aseguradora.

## [1.212.0] — 2026-07-12 · Academia: curso Cotizador y Comparativo
> Nuevo curso reusable en Academia ("Cotizador y Comparativo", cat. Comercial) cubriendo carga múltiple de propuestas (PDF/manual), tabla comparativa completa, recomendación explicable, Replantear, Preparado vs Enviado y aceptación→solicitud de emisión (nunca póliza directa). Alineado con el paquete de patrones reutilizables recibido (v1.207). No incorpora tasas, reglas ni datos de A&S — solo el patrón UX genérico. `seed.__v` → 65.

# Changelog · Orbit 360 Plataforma

Formato basado en *Keep a Changelog*. Construcción greenfield, commits directos a `main`.

## [1.115.0] — 2026-07-04 · Reauditoría 072304 (trazabilidad real, moneda, comisiones, documentos, textos)
> Detalle fix por fix en `docs/BITACORA-CAMBIOS.md` (v1.115). P0: `copyRowMeta` lleva la trazabilidad al registro final; moneda solo explícita (`monedaSugerida` no se escribe); contrato real de planilla de comisiones (esperada vs pagada, tarifas solo con diff confirmado); documentos → `parchesPendientes` con diff. P1: cierre relativo a fecha viva; textos técnicos suavizados; financiero histórico bloquea conceptos de cobro/recaudo.

## [1.140.0] — 2026-07-05 · Candidata activa 2026-07-04T211525.464 — bandeja de conciliaciones (UI segura) + copy residual
> Base comparada `205210.456`. Academia CONTENT_V=5. Nuevo módulo Conciliaciones (lee solo `Orbit.store`, no aplica pagos, estados/acciones por contrato). Copy residual corregido (estados-cuenta, planilla). Limitación documentada: persistencia real de conciliaciones/auditLog y aplicación controlada = backend ChatGPT/Codex. Detalle en `docs/BITACORA-CAMBIOS.md` (v1.140). Sin tocar backend protegido.

## [1.139.0] — 2026-07-04 · Candidata activa 2026-07-04T205210.456 — conciliación como propuesta + validar≠aplicar
> Base comparada `202655.833`. Academia CONTENT_V=5. P0-2 conciliación no aplica pagos directo (propuestas). P0-3 validación en dos pasos (validar reporte → aplicar pago) en Cobros y Cliente360. P0-4 planilla sin fallback GTQ + labels backend (MATCH_EXACTO/PROBABLE/REQUIERE_VALIDACION/BLOQUEADO). P0-5 moneda residual clasificada. Pendiente: persistencia/UI de conciliaciones backend. Detalle en `docs/BITACORA-CAMBIOS.md` (v1.139). Sin tocar backend protegido.

## [1.126.0] — 2026-07-04 · Candidata activa 2026-07-04T193658.630 — moneda por país completa + docs unificadas
> Base activa `2026-07-04T193658.630`. P0-02 (moneda por país) completada en display de todos los módulos de KPIs/agregados (últimos: leads, renovaciones, siniestros, portal). Academia v1.125 (paso a paso + CONTENT_V=3) conservada. Docs unificadas (README/CHANGELOG/PENDIENTES/SMOKE/BITACORA). Sin tocar backend protegido. Detalle en `docs/BITACORA-CAMBIOS.md` (v1.124–v1.126).

## [1.114.0] — 2026-07-04 · Candidato corregido (auditoría ampliada A&S · P0/P1/P2)
> Candidato **v1.114** = versión unificada de esta entrega (README/CHANGELOG/bitácoras/pendientes/smoke coinciden). Detalle fix por fix en `docs/BITACORA-CAMBIOS.md` y `docs/BITACORA-ERRORES.md`. Auditoría en `docs/AUDITORIA-CANDIDATO-CLAUDE-POST-FIX.md`; smoke en `docs/REPORTE-SMOKE.md`.

### Importador (P0-02 a P0-06)
- Excel **multihoja con trazabilidad** por fila (`_origenHoja/_paisHoja/_monedaHoja/_periodoHoja/_bloqueOrigen/_numeroFila`) + **exclusión de hojas soporte** por nombre (dashboard/resumen/presupuesto/producción) con conteo en el reporte.
- **`normPais` ya no asume GT**: país/moneda desconocidos → `requiere_validacion` (no se asume GTQ).
- **Pólizas**: país/moneda como campos; sin estado explícito → `Requiere validación`; **recibos/cartera solo** para Vigente/Por renovar con país+moneda+forma de pago confiables. Separación **primaNeta/gastos/iva/primaTotal**.
- **Planillas de comisión**: se leen de **filas reales**; sin extracción confiable **no se actualizan tarifas** (referencia).
- **Todo tipo visible tiene contrato**: `planillas-comision` con mapeo a `comisiones`; `docs-aseguradora` forzado a **documental** (solo almacena).
- **Documentos** no crean/modifican clientes sin expediente abierto (confirmación).

### UI comercializable (P1-05/07, P1-06, P2-01)
- Login **sin credenciales demo** precargadas; textos técnicos del panel de integraciones suavizados; "White-label para Alianzas" removido del selector de paleta.
- **Fechas quemadas operativas** reemplazadas por fecha viva (portal, cliente360, correo).
- **PWA** con 3 estados: instalada (`✓ App instalada`) / iOS (guía) / otros navegadores (instalar).

## [1.93.0] — 2026-07-03 · Consolidado v1.56–v1.93 (auditorías P0/P1 + profundización de módulos)
> Entrada consolidada para realinear el CHANGELOG con la bitácora viva (`docs/BITACORA-CAMBIOS.md`), que tiene el detalle versión por versión.

### Contabilidad y Finanzas
- **Regla contable recaudo ≠ `finmov`** (v1.83): el pago de póliza del cliente es recaudo comercial, no movimiento de caja; se revirtió el `postRecaudo`→finmovs.
- **Factura a aseguradora = CxC, no caja** (v1.86, v1.89, v1.92): la factura de comisiones se emite a la colección `facturas` (estado `por_cobrar`), con número **secuencial**, idempotencia por aseguradora+periodo, anulación/reversión y bitácora. El `finmov` (ingreso real) solo nace al **cobrar**. v1.92 añadió trazabilidad: enlace a las **comisiones** que factura (`comisionIds`) y **respaldo bancario** (banco/referencia/fecha) en el cobro.
- **Conciliación de planillas/statements de comisión** (v1.84): compara esperado (tarifas vigentes) vs registrado; detecta drift.
- **Finanzas profundo** (v1.80–v1.82): dashboard analítico, metas real vs ideal, presupuesto con fecha de pago, insights de concentración por aseguradora.
- **Config fiscal multi-tenant** (v1.87): `tenant.paisesCfg` como fuente única de IVA/moneda/gastos por país. Moneda por país sin mezclar (v1.62).
- **Modelo de comisión de asesor unificado** con `Orbit.comeng` (v1.91).

### Arquitectura y saneamiento
- **Sin `localStorage` directo en módulos** (v1.61, v1.89): capa `pref/setPref`; logo white-label vía `Orbit.tenant`. 
- **IA centralizada** en `Orbit.ia.complete` (v1.90): punto único de llamada al modelo.
- **Fechas vivas** (v1.64, v1.75): el demo sigue la fecha real del sistema; sin literales quemados (v1.74).
- **Auditoría de salud de render 28/28** (v1.79) + limpieza de código muerto.
- **Seed 100% ficticio / identidad ficticia** (v1.89, v1.93): sin nombres reales (asesor demo "Valeria Morán"; usuario de sesión "Andrea Beltrán").

### Módulos (profundización §4)
- **Portal → Ops/Siniestro canónico** (v1.63, v1.76–v1.77); **notify** cliente por WhatsApp/correo (v1.65).
- **Importadores** con dry-run + dedupe visible (v1.66).
- Cancelaciones (v1.68), Marketing (v1.69), Siniestros (v1.70), Renovaciones (v1.71), Insights (v1.72, v1.82), Pólizas (v1.73), Historial/Reportes/Comisiones profundizados.
- **Academia**: visor unificado (v1.85) + cursos profundizados (v1.88).

## [1.55.0] — 2026-07-01 · Demo standalone + handoff regenerados
### Changed
- **`Orbit360-demo-standalone.html`** regenerado desde el estado actual (v1.54): incluye todos los módulos profundizados (Finanzas, Cobros, Metas, Plantillas, Reportes, Comisiones, Historial). Archivo único autocontenido para demo offline.
- **`docs/handoff-migracion-as.html`**: marcador de versión actualizado a v1.54.

## [1.54.0] — 2026-07-01 · Doc backend: ambientes + caché (P0 Codex)
### Added
- **`docs/BACKEND-AMBIENTES-Y-CACHE.md`**: guía para Codex sobre versionado de scripts (anti-caché), Service Worker seguro, y separación demo/LAB/producción con el adaptador `Orbit.store` (modo backend estricto sin fallback demo, validación de seed por IDs `lab_`, sin UI técnica al cliente). No modifica el prototipo.

## [1.53.0] — 2026-07-01 · Historial: KPIs funcionales + cierre de módulos delgados
### Added — Historial
- **KPIs clicables** (Interacciones / Llamadas / WhatsApp / Reuniones) que ahora **filtran el feed por tipo** (antes eran rutas muertas).
### Verified
- **Historial** ya profundo: filtros (búsqueda/tipo/asesor), feed agrupado por fecha, detalle correcto por interacción + enlace a expediente.
- **Cronograma** monta con vistas día/semana/mes.
- **Thin-by-design confirmado**: leads/ops/polizas/importar delegan su lógica en `core/ciclo.js`, `crmkit.js`, `importa.js` y fichas compartidas — no requieren inflado.

## [1.52.0] — 2026-07-01 · Comisiones: filtros + export + conciliación
### Added — Comisiones
- **Filtros** por año (2024/25/26) y estado (Liquidada / Por liquidar); la agregación por asesor/aseguradora/periodo respeta el filtro.
- **Export CSV** del set filtrado (periodo, cliente, póliza, asesor, aseguradora, base, %, comisión, estado).
- **Conciliación**: en el detalle, clic en el badge de estado alterna **Liquidada ↔ Devengada** (escribe al store); nº de póliza enlazado abre el detalle de la póliza.

## [1.51.0] — 2026-07-01 · Reportes: agrupación + periodo + programación real
### Added — Reportes
- **Agrupar por** cualquier columna (general→particular): genera una **tabla resumen** con conteo por grupo + suma (Σ) de las columnas monetarias, encima del detalle. Ej: producción por asesor / por aseguradora / por ramo.
- **Filtro de año** (2024/2025/2026) sobre los reportes con fecha.
- **Programación real** (antes era un alert): modal con frecuencia (diaria/semanal/mensual), destinatarios y formato (PDF/Excel/CSV); persiste en la colección `reportes_prog`, se lista en la barra lateral y se puede quitar.
### Preserved
- Export CSV / Excel / PDF y filtro por país siguen funcionando.

## [1.50.0] — 2026-07-01 · Plantillas profundizado + migrado al store
### Changed — Plantillas
- **Persistencia en `Orbit.store('plantillas')`** (antes localStorage propio — ahora respeta la capa de datos única; el backend hereda la colección). Migra automáticamente cualquier plantilla del localStorage viejo.
### Added — Plantillas
- **Editor completo** (drawer): emoji, nombre, canal (WhatsApp/Correo/Ambos/PDF), categoría, asunto (correo/PDF) y mensaje, con **9 chips de variables insertables** en el cursor.
- **CRUD**: crear, editar, **duplicar** y eliminar.
- **KPIs clicables** (total/WhatsApp/correo/PDF) que filtran por canal + buscador + filtros por canal/categoría.
- **"Usar"**: elige un cliente real, **resuelve las variables** ({nombre}/{poliza}/{monto}/{vence}/{ramo}/{aseguradora}/{asesor}/{placa}) con datos del store, y enruta a **WhatsApp** (wa.me con teléfono del cliente) o **Redactar correo** (abre el compositor de Correo con asunto+cuerpo+cliente prellenados) o copiar.

## [1.49.0] — 2026-07-01 · Contrato de datos + docs de migración (backend P0)
### Added
- **`Orbit.store._emit(collection)` público** — antes privado; permite a la capa backend emitir eventos de cambio manualmente. API pública confirmada: `all, get, where, find, insert, update, remove, on, _emit, init, reseed, raw`.
- **Docs nuevos para el LAB backend** (solicitados por el doc de pendientes 2026-07-01): `MEJORAS-DETECTADAS.md` (contrato de datos + colecciones + mejoras a preservar), `BITACORA-ERRORES.md` (E-01..E-04 resueltos + plantilla), `BITACORA-CAMBIOS.md` (v1.42→v1.49), `REPORTE-SMOKE.md` (flujos críticos verificados).

## [1.48.0] — 2026-07-01 · Calidad de datos: edición inline
### Added — Calidad
- **✏ Completar inline**: cada cliente incompleto abre solo sus campos faltantes; al guardar sale de la lista (re-render) con toast de conteo restante.

## [1.47.0] — 2026-07-01 · Cotizador marca→línea→modelo (3er nivel)
### Added — Cotizador
- **3er nivel de vehículo**: además de marca→línea, ahora hay **Modelo / Versión** (`VEH_MODELOS` con versiones específicas por línea popular + fallback de trims genéricos, editable en migración). Al cambiar marca se reinicia línea+modelo; al cambiar línea se recargan los modelos. Paridad con el Comparativo, que ya tenía los 3 niveles (incluido en su PDF).

## [1.46.0] — 2026-07-01 · Metas inteligentes en Insights
### Added — Insights
- **Metas autoadministrables**: la vista Metas lee la colección editable `metas` del mes seleccionado (empresa: prima/recaudo/nueva/renovada) con fallback al split por asesor. La nota indica si la meta viene de la colección o de la base.
- **✨ Sugerir metas del próximo mes**: botón que calcula metas por tendencia (promedio de los últimos 3 meses +10 %), permite ajustarlas y las guarda en la colección `metas` (upsert por mes/tipo) — quedan editables luego en Equipo.
### Verified
- **Comparativo general→particular** funciona en vivo: segmentos general/asesor/ramo/aseguradora (4), drill por mes (12 filas) y drill por fila del criterio, todos clicables con desglose de pólizas.

## [1.45.0] — 2026-07-01 · Navegación cruzada en Cobros
### Added — Cobros
- **Quick "💳 Pagar" en la tabla**: cada recibo pendiente/vencido tiene botón para aplicar el pago directo desde el listado, sin abrir la ficha del recibo (`aplicarPago` extraído a función reutilizable, exportada).
- **Navegación cruzada por fila**: el número de póliza es un enlace que abre el detalle de la póliza; el nombre del cliente ya abría su ficha. El drawer del recibo ahora tiene botones **👤 Ver cliente** y **📑 Ver póliza**.
### Fixed
- **Bug: la tabla no se refrescaba tras aplicar un pago** — el flujo re-renderizaba `mod-host` (inexistente) en vez de `host`. Corregido; el recibo pasa a Pagado/Conciliado y la lista se actualiza en el acto.

## [1.44.0] — 2026-07-01 · Finanzas profundo (audit P0 §2.5)
### Added — Finanzas
- **KPIs clicables con desglose**: en Movimientos, CxC/CxP y Presupuesto, clic en cada KPI abre un modal (`drillKey`) con los registros que lo componen; cada fila abre el movimiento para ver/editar.
- **CxC/CxP con detalle completo**: las filas ahora abren el drawer de movimiento (ver/editar/eliminar/cambiar estado + adjuntar); el badge de estado sigue permitiendo cambio rápido con un clic. El desglose aclara que las partidas pendientes **arrastran mes a mes** (se listan de todos los periodos).
- **Presupuesto editable**: `+ Partida`, editar/eliminar por fila y **Replicar mes anterior** (`editarPresup`/`replicarPresup`), leyendo/escribiendo la colección `presupuesto` del store (se eliminó la lectura de arrays quemados).
### Fixed
- El presupuesto ejecutado ahora normaliza moneda (`norm`) al sumar egresos.

## [1.43.0] — 2026-07-01 · Fecha dinámica + logo en login + inicio del audit funcional
### Fixed — Login white-label
- La franja del logo del cliente ahora es **cintilla blanca a sangre** separada del bloque oscuro por línea roja (3px); el logo resalta sobre blanco.
- `Orbit.applyBrand()` se invoca también en `auth.showLogin()` → el logo/nombre del cliente aparecen **en la pantalla de login** (antes solo tras entrar).
### Changed — Fecha dinámica (audit P0 §2.1/2.2/2.3)
- `core/ui.js`: la fecha deja de estar quemada. `Orbit.ui.now()/monthLabel()/monthKey()/monthProgressPct()` derivan de un **ancla configurable** (`Orbit.tenant.demoDate`); el backend pasa a fecha real con `demoDate='real'` sin tocar módulos.
- `modules/inicio.js`: etiqueta de mes dinámica (no "Junio 2026" quemado); metas leen la colección autoadministrable `metas` (fallback demo); días del mes calculados por mes real.
- `core/novedades.js`: fecha del modal de bienvenida dinámica.
### Note
- Recibida `AUDITORIA-FUNCIONAL-CLAUDE-20260630.md` (ChatGPT/Paula). Es un roadmap de profundización P0/P1 multi-sesión; ver `docs/PENDIENTES-Y-MEJORAS.md`.

## [1.41.0] — 2026-06-30 · Login limpio + doc de pendientes para migración
### Changed — Login
- Quitado el badge superior "PLATAFORMA SEGURA · ACCESO DEL EQUIPO".
- Quitado el texto "Tu logo aquí · white-label" del footer; el slot del logo del cliente queda **centrado**.
- En la versión comercializable el slot va vacío; el cliente carga su logo en Configuración.
### Added
- `docs/PENDIENTES-Y-MEJORAS.md` — estado honesto (listo vs requiere backend vs profundización), reglas de trabajo para ChatGPT y orden de migración. Adjuntar como fuente del proyecto.

## [0.23.0] — 2026-06-23 · Fixes de navegación
### Fixed
- **Correo** ahora aparece en el menú (faltaba `'correo'` en `tenant.modulosActivos`; el sidebar filtra por esa lista).
- **Orbit Aseguradoras** movido al grupo **Operación** (uso frecuente), antes estaba en "Gestión y recursos".

## [0.22.0] — 2026-06-23 · Integración de Correo (Outlook/Gmail) — transversal
### Added — `core/correo.js` (capa transversal)
- Bandeja sobre el store (`correos`, seed `__v=15`), vínculo de correos a entidades (cliente/póliza/cobro/gestión/aseguradora), `enviar`, `vincular`, `marcarLeido`, `destacar`, `noLeidos`, y conector configurable (`conectar`/`desconectar`, persistente).
### Added — `modules/correo.js` (bandeja, menú Comunicación)
- Carpetas Recibidos/Enviados/Destacados, lista + lector, **redactar**, **vincular a cliente**, abrir entidad vinculada, badge de no leídos, banner "Conectar Outlook/Gmail" (modo demo → real al personalizar).
### Added — Ficha de cliente
- Nueva pestaña **Correos**: hilos vinculados al cliente + redactar contextual; helper `reabrir(cid, tab)`.

## [0.21.0] — 2026-06-23 · Módulo Equipo y permisos + Finanzas con emojis/lote
### Added — `modules/equipo.js`
- **Usuarios**: equipo del intermediario con rol, estado, color, metas; alta/edición de usuario en drawer.
- **Permisos**: matriz **rol × módulo** (Ver / Editar) persistente, con valores por defecto según nivel de rol y botón de restablecer.
- **Comisiones**: esquema por asesor (% de la comisión / % de prima neta / monto fijo) — reutiliza `Orbit.comeng`; las tarifas por aseguradora siguen en Comisiones › Tarifas.
- **Metas**: por asesor, **mes** y **tipo** (nueva vs renovada), sobre prima neta — guardadas en `Orbit.cat.metas` como **fuente única** para Insights y Finanzas (`equipo.metaDe()`).
- Ruta `equipo` activada (beta) y registrada en `index.html`.
### Changed — Finanzas
- Tabs con **emojis** (formato del resto) y scrollables; **liquidaciones con "Preparar lote"** (detalle + total en vivo, retirar partidas, incluir CxP de meses anteriores).

## [0.19.0] — 2026-06-23 · Orbit Finanzas dinámico (datos ficticios, en vivo)
### Added — Modelo de datos financiero (seed `__v=14`, **ficticio**, "Demo Corredores")
- Colecciones `finmovs` (movimientos por mes y país, 16 meses Mar-25→Jun-26), `acreedores` (deuda) y `presupuesto`.
- Ingresos: Comisiones aseguradora, Incentivos, **Financiación (aparte)**, Otros. Egresos: Comisiones asesores, Gastos fijos, Marketing, Operación, Devolución de préstamo. Estados ingreso (esperado/facturado/recaudado) y egreso (pendiente/pagado).
### Added — Módulo Finanzas reconstruido (lee datos reales del store, en vivo)
- **Selector de país + mes** (igual que Insights). Tabs **scrollables** (ya no se desbordan).
- **Movimientos**: tabla real del periodo; clic en fila **cambia el estado** (recaudado/pagado ↔ pendiente) en vivo.
- **CxC / CxP**: cuentas por cobrar (ingresos esperados/facturados) y por pagar (egresos pendientes), con posición neta; estados editables al clic.
- **Financiación**: ingreso NO operativo separado + **control de deuda por acreedor** (sube con financiación, baja con devoluciones).
- **Presupuesto vs real** con **semáforos** (verde/ámbar/rojo) y % de ejecución por categoría.
- **Dashboard**: comparativo **interanual** e **intermensual** real (ingresos/egresos/utilidad) con barras de marca.
- **✨ Análisis IA**: diagnóstico del periodo + metas sugeridas + estrategias (medios/segmentación/comercial) — listo para conectar Gemini.
- **Conservadas** Liquidación empresa, Liquidación asesores y Conciliación bancaria (no se eliminó nada de lo que ya servía).

## [0.18.0] — 2026-06-22 · Insights interactivo (selectores + comparativo por concepto)
### Added / Fixed — Orbit Insights
- **Selector de país** y **selector de mes** funcionales en las analíticas (acumulado Ene→mes); país se sincroniza con la barra superior.
- **Metas**: KPIs mensuales + acumulados (mes seleccionable); **arreglada** la tarjeta "nuevas vs renovadas por ramo" (antes mostraba solo ramos; ahora compara **nuevas vs renovadas** con barras duales). Producción mensual nuevas vs renovadas. Nota: las metas se asignan en **Equipo y permisos / Configuración**.
- **Comparativo por concepto**: control segmentado **General · Por asesor · Por ramo · Por aseguradora** (interanual 2025 vs 2026, var% y tendencia, de lo general a lo particular) + comparativo mensual y **intermensual**.
- **Top clientes** clasificable: por **volumen de prima**, **cantidad de pólizas**, **clientes nuevos**, **clientes antiguos**; columnas con asesor y badge de nuevo; distribución de cartera de clientes por **ramo** y **aseguradora**.

## [0.17.0] — 2026-06-22 · Insights profundo + correcciones de póliza
### Added — Orbit Insights v2 (analítica profunda, KPIs clicables)
- **9 vistas**: Resumen · **Metas (nuevas vs renovadas)** · Producción · Cartera · **Comparativo** · **Top clientes** · Pipeline · Renovaciones · **Análisis crítico**.
- **KPIs clicables (⤢)**: cada indicador abre un **drawer de detalle** con los registros que lo componen (pólizas, recibos, clientes), clicables a su vez.
- **Producción nueva vs renovada** con **metas separadas** y % de cumplimiento (clasifica por contador de renovaciones).
- **Comparativo interanual** (2025 vs 2026, mismos meses, barras duales + tabla por aseguradora con var % y tendencia) e **intermensual**.
- **Top clientes** con **modal de detalle** (KPIs del cliente + pólizas + acceso al expediente); concentración top-10, ticket promedio.
- **Análisis crítico**: alertas automáticas (caída de PN, tasa de cancelación, recaudo, vencimientos) + **recomendaciones por área**; composición de cartera y producción mensual.
- Tabla **asesor × aseguradora**. Todo sobre **prima neta**, normalizado a base GTQ, respeta país, en vivo.
### Fixed / Changed — Póliza
- **Subramos por país CORREGIDOS** (GT/CO): vehículo liviano/pesado/grúa/RC/pérdidas totales/parciales/por km, tipos de fianza, GM individual/familiar, CO todo riesgo/cumplimiento/multirriesgo/salud ind-fam, etc.
- **Editar póliza**: cambiar el **asesor que comercializó** (independiente del asesor del cliente); **recargo financiero** por **%** (auto) **o valor** directo (para importación); **concepto automático** por patrón (Ramo · Subramo · Tipo); al cambiar **forma de pago/frecuencia** se **regeneran los recibos pendientes** (preservando los pagados).

## [0.15.0] — 2026-06-22 · Reconstrucción de la ficha de póliza (lo perdido en el undo) + ramos por país
> El *undo* de una sesión previa había revertido estas mejoras; se reconstruyen y se confirma su estado en el plan (R7.6 checklist consolidado).
### Added — Catálogos ramos/subramos por país (`Orbit.cat`)
- `ramosPais` GT/CO con lenguaje local + API `ramosDe(pais)` / `subramosDe(pais, ramo)` / `addRamo` / `addSubramo`. Transversal (lo usa también el importador de planillas).
### Added — Ficha de póliza administrable
- **Editar póliza**: ramo/subramo **por país** (con "➕ Otro"), datos, vigencia, pago, **renovable**, suma; **auto-cálculo** de gastos de expedición (GT 5%) + IVA (modificable) con resumen de desglose en vivo.
- **Qué cubre**: vehículo (con enlace a **Ver detalle del vehículo**) o inmueble/grupo/contrato según ramo.
- **Historial y endosos**: registrar endoso/sustitución/cambio de propietario/beneficiario (manual·importar·inteligente) → historial de la póliza + actividad del cliente.
- **Ver detalle de vehículo** desde la póliza, con acción de sustitución por endoso.
### Added — Cancelaciones con detalle (`detalle`)
- Drawer con **tiempo activa** (días/meses), valor perdido, **comisión generada** (derivada en vivo), aseguradora, asesor, motivo, fechas y **acción de recuperación** editable + nota.
### Docs
- **R7.6**: checklist consolidado de TODAS las observaciones de la ficha de póliza con estado real ítem por ítem (lo hecho y lo pendiente: Drive aseguradora/formularios, gestión documental, importador que cruza sin duplicar, siniestros, nuevas vs renovadas).

## [0.14.0] — 2026-06-22 · Inicio aligerado + comisión por asesor flexible (Ronda 7 1/n)
### Changed — Inicio (visual)
- El panel **"Metas del mes"** pasa de gradiente oscuro a **card claro** con acento rojo superior; los dials se adaptan a fondo claro. Elimina la sobrecarga de dos paneles oscuros consecutivos (título + metas).
### Added — Comisión del vendedor por asesor (modelo flexible)
- `core/comisiones-eng.js`: cada asesor puede tener **modelo distinto** — `comModo`: **% de la comisión** de la aseguradora · **% de prima neta** · **monto fijo** (`comValor`). `calc`/`calcSobre` lo respetan.
- **Tarifas de comisión** (módulo Comisiones): por asesor se elige el **modelo** (selector) y su valor (% o Q fijo). Seed demo: L. Herrera = % de prima neta, A. Lemus = monto fijo.
- Seed `__v=13` con `comModo`/`comValor` por asesor.
### Docs — RONDA 7 (plan)
- Registrada completa y priorizada: A&S como primer cliente; comisión por asesor; comisiones visibles al asesor en ficha; **KPIs clicables en todas las secciones**; **Insights profundo** (Metas, Cumplimiento, Recaudo, Cartera, Devengado, Top clientes con modal, Vencidas, Análisis crítico; **nuevas vs renovadas con metas**; comparativos **interanual/intermensual** por aseguradora/producto/ramo/asesor); ficha de póliza pendientes; **Automatizaciones (Make) + herramientas creativas**; **Academia** (bloques de capacitación); **Correo (Outlook)** transversal; **Siniestros/reclamos** + importador; **Finanzas** y **Marketing**.

## [0.13.0] — 2026-06-22 · Motor de comisiones + aplicar pago con factura
### Added — `core/comisiones-eng.js` (motor de comisiones)
- **Comisión de la aseguradora**: % por **ramo** con override por **producto**, sobre **prima neta**. Tarifas viven en cada aseguradora (`comisiones`, `comisionesProd`, `comisionDefault`).
- **Comisión del vendedor**: **participación %** que asignamos a cada asesor (`shareCom`) sobre la comisión de la aseguradora; el resto es **comisión de la empresa**.
- API: `calc(poliza)`, `calcSobre(neta, poliza)`, `pctAseguradora`, `shareVendedor`, setters que persisten, y `aplicarPlanilla(filas)`.
- Seed `__v=12`: aseguradoras con matriz de % por ramo; asesores con `shareCom`. La generación de recibos/comisiones usa estas tarifas (consistencia total).
### Added — Tarifas de comisión (módulo Comisiones)
- Nueva vista **⚙ Tarifas**: matriz **editable** por aseguradora × ramo (+ overrides por producto) y **participación del vendedor** por asesor. Explica la fórmula de cálculo.
- Botón **⬇ Importar planilla**: la importación de planilla de comisiones **lee, por producto, cuánto paga cada aseguradora**, muestra las tarifas detectadas **editables** y al confirmar las **aplica al matriz** (sin duplicar).
### Added — Aplicar pago (Cliente 360 · Recibos)
- Modal de **aplicar pago**: **fecha de envío a gestión** (default hoy, editable), forma de pago, y **carga de factura** opcional que fija la **fecha real** en que pagó la aseguradora y **concilia** el recibo (medio adicional de conciliación). Distingue **Pagado** vs **Conciliado**. Deja rastro en el historial del cliente.

## [0.12.0] — 2026-06-22 · Ronda 5 (4/n): modelo de póliza + motor de primas/recibos
### Added — `core/primas.js` (motor de primas y recibos)
- **Desglose de prima** confirmado con pólizas reales: Prima Neta + Gastos de Expedición + Gastos Financieros (recargo por fraccionamiento, % sobre neta, solo si fraccionado) + Otros/asistencias = Base gravable; + **IVA** (configurable por país) = **Prima Total**. Validado con el ejemplo GT (Q17 752,15).
- **Generación de recibos por forma de pago**: Contado / Tarjeta de crédito / Visa Cuotas al contado → **1 recibo** (sin recargo); fraccionado (Mensual=12, Bimestral=6, Trimestral=4, Cuatrimestral=3, Semestral=2) → **N recibos** prorrateados con recargo, ajustando el residuo de redondeo en el último para cuadrar exacto. Cada recibo trae su propio desglose + comisión aseguradora/vendedor + fecha límite.
### Added — Tasas por país configurables
- `Orbit.PAISES` ahora define `iva` y `recargoFinanciero` por país (demo: **GT IVA 12% · CO IVA 19%**); `Orbit.paisCfg()` y `Orbit.primas.cfgPais()` los exponen. Pensado para fijarse al **dar de alta el país**.
### Changed — Seed `__v=11` (pólizas enriquecidas)
- Cada póliza incluye: primaNeta, gastosEmision, gastosFinan, otros, ivaPct/ivaMonto, recargoFinPct, baseGravable, prima(total), frecuencia, formaPago, conducto, tarjeta, tipoPoliza, subramo, concepto, **renovable** (~15% no renovables), multianual, contadorRenovaciones, comAseguradoraPct, comVendedorPct, vendidaPor.
- Los **cobros/recibos se generan desde el motor** (coinciden con el desglose); cada recibo guarda neta/gastos/g.finan/otros/iva + comisiones + fecha límite + conducto.
### Changed — Drawer de póliza (Cliente 360)
- Rediseñado: cabecera grafito, tags (estado, **Renovable/No renovable**, multianual, contador), datos clave, **conducto de pago**, **cuadro de desglose de prima**, y **cuadro de recibos** con columnas Neta/Gastos/G.Finan/Otros/IVA/Total + fila Total y fechas límite. Botón Renovar solo si la póliza es renovable.

## [0.11.0] — 2026-06-21 · Ronda 5 (3/n): Orbit Insights (analítica)
### Added — `modules/insights.js`
- **Orbit Insights**: módulo de analítica real con 5 vistas conmutables:
  - **Resumen**: KPIs (prima vigente, recaudado, por cobrar, comisión) + dona de prima por ramo + dona de estado de cartera + top aseguradoras + producción por canal.
  - **Producción**: avance por asesor vs meta (barras con %), prima por ramo, top productos.
  - **Cartera**: aging de vencido por tramos, saldo por forma de pago, recibos vencidos prioritarios (clicables al 360).
  - **Pipeline**: embudo comercial por etapa del ciclo, prima potencial/ponderada, tasa de conversión, pipeline por canal.
  - **Renovaciones**: prima a renovar por mes (6 meses), motivos de cancelación, renovaciones inminentes (clicables al detalle de póliza).
- **Micro-gráficos sin librerías** (barras, donas conic-gradient, embudo, barras de meta) con CSS propio.
- Respeta el **selector de país** y normaliza a base GTQ para comparación; se re-renderiza en vivo ante cambios del store/país/ciclo.
- Registrado en NAV (ya existía la ruta) + `MODULE_TITLES.insights` + script en `index.html`.
### Docs
- **PLAN**: agregado **CHECKLIST MAESTRO 1.0** explícito (todo el alcance, con estado ✅/🟡/⏳/🧩) para que ningún módulo quede fuera de vista; aclaración de cómo opera "Solicitud del cliente" hoy (proxy) vs en el Portal 1.0.

## [0.10.0] — 2026-06-21 · Ronda 5 (2/n): catálogos, listas editables, notificaciones, confidencialidad
### Added — Catálogos configurables (`Orbit.cat`)
- Catálogos persistentes y editables: **canales** (redes sociales, conocido, referido, cliente actual/antiguo, web…), **ramos**, **productos**, **prioridades**, **tipos de gestión**. Todo desplegable para alimentar analítica.
- **Opción "➕ Otro…"** en los desplegables del ciclo: al elegirla se agrega el valor al catálogo (persistente).
### Added — Listas de Ops y Leads EDITABLES
- Botón **⚙ Listas** en ambos tableros → **crear, renombrar, recolorear, reordenar y eliminar** listas. Las del ciclo (atadas a etapa) se editan pero no se eliminan; al renombrar una lista de gestiones se migran sus tarjetas. Listas personalizadas de Leads aceptan negocios vía selector "Columna en Leads".
### Added — Notificaciones (WhatsApp / correo) + Portal del cliente
- `Orbit.ciclo.notify()`: al **solicitar** una gestión (equipo o cliente) y al **resolverla** se notifica al asesor con **toast + enlaces a WhatsApp y correo**; queda registro en `avisos`.
- **Solicitud del cliente** (🙋): crea la gestión en Ops con origen "Solicitud del cliente" y notifica.
- **Adjuntos de soporte** en Solicitar gestión (drag&drop; se listan en la ficha).
### Added — Mi Día · seguimientos manuales
- Sección **"Seguimientos de hoy"** en Inicio: negocios sin cadencia con toque vencido/hoy y botón directo a **WhatsApp** (o correo).
### Changed
- **Cadencias** = seguimiento por **WhatsApp** y, en su ausencia, **correo** (no llamadas por defecto).
- **Ficha de gestión**: **Responsable** (por defecto asesor, seleccionable); **Nota debajo del checklist**; tipo/estado con "Otro".
- **País con bandera** en tarjetas + seleccionable.
- **Ficha del cliente**: se quitó "Importar estado de cuenta"; **pólizas y vehículos abren detalle** (drawer + renovar/comparar/solicitar gestión).
- **CRM**: filas de **Pólizas, Cobros y Cancelaciones** abren detalle.
### Added — Seguridad
- **Acuerdo de confidencialidad** obligatorio en el primer ingreso (aceptar + se almacena fecha/usuario).

## [0.9.0] — 2026-06-21 · Ronda 5 (1/n): Ops+Leads ciclo completo, multi-rol, solicitar gestión
### Added — Motor del ciclo comercial (`core/ciclo.js`)
- **Modelo unificado `negocios`**: una sola oportunidad se **proyecta en dos tableros** (Ops equipo / Leads asesor) según su **etapa canónica** (nuevo → contactado → cotizando → propuesta → negociación → inspección → emisión → emitido). **Sincronización en vivo**: cambiar la etapa en cualquier lado se refleja al instante en el otro (misma fuente de datos + listeners).
- **Automatizaciones**: al **enviar propuesta** se activa la **cadencia** de seguimiento; al cotizar se genera N.º de cotización; al **emitir** se **crea el cliente** heredando datos + se activa **cadencia de encuestas de satisfacción**.
- **Cierre con decisión** (Inspección o Emisión) → **reaparece en Ops sin salir de Leads** (listas espejo Inspección/Emisión en Leads, solo lectura para el asesor).
- **Bitácora estructurada** + **comentarios** + **checklist** por negocio y por gestión.
### Changed — Orbit Ops (`modules/ops.js`) y Orbit Leads (`modules/leads.js`) — rediseño
- **Listas con emoji + color** por columna (cabecera `.kcol-h2`). Ops = tablero **interno** (Cotizaciones/Inspecciones/Emisiones del ciclo + Gestiones Admin + Renov./Modif.). Leads = **vista del asesor** con listas espejo y subtotales.
- Tarjetas clickeables a **ficha rediseñada** (drawer con **stepper de etapas**, datos editables, indicador de **sincronización** Ops↔Leads, cadencia, bitácora, acciones de etapa contextuales).
- Ambos tableros **re-renderizan en vivo** ante cualquier cambio del ciclo.
### Added — Multi-rol "ver como" (`Orbit.session`)
- Selector de **rol activo** en la topbar. Con rol **Asesor** se **oculta Orbit Ops** (interno) y se filtra el pipeline a sus negocios; ve las etapas operativas vía Leads. El router respeta `session.canSee()`.
### Added — Solicitar gestión desde la ficha del cliente
- Botón **🗂 Gestión** en la ficha (y por póliza en Renovaciones): elige **tipo** (con opción de **crear otro**), nota y póliza → crea la gestión en **Orbit Ops** en la lista correcta, asociada al cliente/póliza, con bitácora y checklist. Deja rastro en el historial del cliente.
### Fixed — UI
- **Tabs de la ficha** ahora con **indicador "hay más"** (degradado + flecha que aparece al desbordar y desplaza; lleva la pestaña activa a la vista).
- **Quitadas notas técnicas** visibles (login "DEMO", pie del sidebar, "capa de datos/localStorage", referencias de build, confirmaciones "(demo)").
- Seed `__v=10`: colección `negocios` (14) + `gestiones` admin/renov (9); se retira `leads` legacy.

## [0.8.0] — 2026-06-21 · Ops + Leads, Finanzas avanzada, Novedades, Renovación IA
### Added — Ops + Leads (`modules/ops.js`, `modules/leads.js`)
- **Orbit Ops**: kanban operativo (Gestiones Admin, Cotizaciones, Inspecciones, Emisiones, Renovaciones/Modif.), **sin prospectos**, listas personalizables, tarjetas clickeables, enlace a Leads.
- **Orbit Leads**: pipeline por etapa con **probabilidad**, **cadencias** y pronóstico ponderado; convierte a cliente.
- Seed: colecciones `leads`, `gestiones`, `novedades` (`__v=9`).
### Added — Finanzas avanzada
- **Dashboard**: comparativo intermensual e interanual, salud financiera, fijar metas desde datos.
- **Presupuesto**: ingresos (comisiones + financiamiento) y egresos (comisiones + gastos fijos + operación), ppto vs real.
- **Metas**: por asesor/empresa/aseguradora, mensual/anual, sobre **prima NETA**; deriva recaudo.
- **Producción neta** con **ajuste por no devengado** (cancelaciones).
- **Liquidación asesores**: el asesor ve **solo su** liquidación; pagos cruzables/ajustables.
### Added — Novedades / Incentivos (`core/novedades.js`)
- Tablón con **contador** de no leídas (campana), **modal grande al ingresar** (1/día), publicación por todo el equipo.
### Added — Renovación inteligente (Cliente 360)
- **Renovar** modificando N.º de póliza, **aseguradora**, prima, producto (renovación con otra aseguradora).
- **Comparativo IA**: renovación vs actual con análisis crítico y recomendación; cargar propuesta y enviar al cliente.

## [0.7.0] — 2026-06-21 · Finanzas + Calidad de datos + Plantillas
### Added — Orbit Finanzas (`modules/finanzas.js`, `#/finanzas`)
- **Movimientos**: KPIs (recaudo, comisión a cobrar, a pagar asesores, vencida), tabla, importar histórico, generar cierre mensual.
- **Liquidación empresa**: comisión a **cobrar a cada aseguradora** (prima neta recaudada), conciliable contra planilla.
- **Liquidación asesores**: % fijo/variable por asesor sobre **prima neta recaudada** (no sobre venta); a pagar / pendiente / liquidar.
- **Conciliación bancaria**: doble conciliación (depósito↔recaudo y pago↔póliza); importar estado bancario.
### Added — Importación
- KIND **`estados-banco`** (estado de cuenta bancario, cualquier formato) con detección.
- **Planillas de comisiones** ahora con detección: pagos no aplicados y validación de liquidación por asesor.
### Added — Calidad de datos (`modules/calidad.js`, `#/calidad`)
- Reporte de **expedientes incompletos**, prioridad **teléfono › dirección › resto**, foco en **póliza vigente**; campaña de actualización por **WhatsApp** (con tel) o **correo** (sin WA, con email). `seed __v=8` con clientes incompletos.
### Added — Plantillas de mensajes (`modules/plantillas.js`, `#/plantillas`)
- Plantillas WhatsApp/correo (propuesta, prima pendiente, actualización de datos, renovación, bienvenida) con variables; editables y persistentes.
### Added — Configuración interna
- **Planes comercializables**: importar catálogo o **crear plan**; editable por acuerdos/promos. Asignación de plan configura funcionalidades.

## [0.6.0] — 2026-06-21 · Configuración (sin código) + detección en cartera
### Added — Configuración (dos niveles)
- **`Orbit.tenant`** (config.js): fuente única de la cuenta — `plan`, `modulosActivos[]`, `branding`, `paises[]`, `addons`, `portalVisibility`, `apis`. Persistente.
- **`Orbit.PLANES`** (Estándar / Profesional / Personalizado) y **`Orbit.ROLES`** (Dirección, Admin, Finanzas, Asesor, Asistente).
- **Módulo Configuración** (`modules/configuracion.js`, `#/configuracion`):
  - *Self-service del cliente* (según plan): Marca (logo, paleta, menú claro/oscuro, auto-branding IA por manual de marca), Usuarios y permisos (roles, comisión, metas), Países y monedas (multipaís, no se mezclan), Integraciones (Make, Drive, WhatsApp), APIs (cifradas, scopes, por rol), Plan.
  - *Interna (Orbit)*: banner privado, asignación de plan y **selección de módulos activos por cliente** → el sidebar se ajusta solo.
- **Sidebar dinámico**: filtra por `tenant.modulosActivos`; `router.rebuildSidebar()` en caliente.
### Added — Importación de estados de cartera
- **Detección** en estados de cuenta (cualquier formato): **recibos no creados** y **pagos no aplicados**; conciliación **no-duplicante**.

## [0.5.0] — 2026-06-21 · Ficha rediseñada + campos + importación en ficha
### Changed
- **Ficha cliente rediseñada**: header con chips de contacto, KPIs con acento e ícono, **menú interno tipo píldoras con íconos** (ya no se corta), bandera de país.
### Added
- **Campos extendidos** (editables, cascada): país → departamento → ciudad, dirección, canal, **contacto alterno (check)**, fecha de nacimiento, sexo (segmentación). `seed __v=7`.
- **Importar al expediente** (`importa.openFor`): multi-archivo, vincula al cliente, asocia vehículo a póliza/cliente; tipos **facturas** y **documentos** (DPI/RTU/patente).
- **Comisiones**: % por asesor, fija/variable; nota de base (prima neta, sobre recaudada).
- **WhatsApp** en renovaciones y ficha. **Sidebar claro/oscuro** con auto-contraste. **FIX** deep-link abre la pestaña correcta.

## [0.4.0] — 2026-06-21 · UI ronda 2 + Expediente del cliente
### Changed (refinamiento UI)
- **Topbar blanca** con **slot de logo del cliente** (white-label).
- **Sidebar**: títulos de grupo con **cintilla** (barra de acento) + texto blanco de mayor contraste.
- **Header de módulo tipo banda** (oscuro, ícono + título + descriptor rojo + features) vía `K.banner`/`K.bannerFor` y registro `Orbit.MODULE_TITLES` (personalizable por plantilla). Aplicado a CRM global, Inicio, Importa.
- **Login**: órbita sobre fondo claro y sobrio, **ambos anillos giran** (con dots), núcleo = marca del cliente, **footer centrado** con texto blanco corregido.
- Ícono de Inicio: **🌅** (sol) en lugar de asterisco.
### Added (Expediente del cliente)
- **Vehículos** (pestaña + datos por póliza de auto: placa, marca/línea, año, uso, color, VIN, motor, suma asegurada) — `seed __v=6` con colección `vehiculos`.
- **Recibos y pagos**: recibos por forma de pago + **aplicar pago** (concilia recibo↔póliza).
- **Comisiones**: split **vendedor/empresa** con **visibilidad por rol** (empresa interna, configurable).
- **Contacto alterno** + Drive link editables en la ficha.
- Queries `vehiculosDe`, `vehiculoDePoliza`.
- Docs: PLAN actualizado (Expediente + modelo de Configuración en dos niveles + visibilidad Portal).

## [0.3.0] — 2026-06-21 · Infraestructura transversal (white-label)
### Added
- **Theming / paleta seleccionable** (`core/theme.js`): 6 paletas, cambia el color primario en toda la plataforma y el login. Default Rojo Orbit. Persistente. Picker en topbar (🎨) y en login.
- **Login white-label** (`core/auth.js` + markup en `index.html` + `styles/infra.css`): órbita dinámica animada, palette-adaptive, slot de logo del cliente, gate de sesión demo + logout.
- **Operación multipaís**: `Orbit.PAISES` + switcher en topbar (Todos / GT / CO).
- **Importación inteligente** (`core/importa.js` + `modules/importar.js`): drawer/wizard reutilizable (cargar → extracción → confirmar) que acepta cualquier formato; hub con 9 secciones (base inicial, clientes, pólizas, vehículos, directorio aseguradoras, estados de cuenta, planillas comisiones, movimientos finanzas, calendario marketing). Estados de cuenta despliegan recibos por forma de pago y permiten aplicar pagos por póliza.
- **Cliente 360**: ficha **editable** (modal: nombre, contacto, asesor, segmento, Drive link, notas), **link de Drive**, hook de importación, **gestionar renovaciones** desde la ficha.
- **Config**: nav nuevos (Importación inteligente, Reportes, Portal del Cliente) + metadata; `seed __v=5` con `driveLink`.
- **Docs**: `docs/PLAN-INFRAESTRUCTURA.md` (plan maestro con todos los requisitos).

## [0.2.0] — 2026-06-20 · CRM vistas globales
### Added — núcleo CRM completo (vistas por cartera)
- **CRM Kit** (`core/crmkit.js`): piezas compartidas (page head, KPI row, celdas cliente/asesor/aseguradora, barra de filtros con wiring) para módulos delgados y consistentes.
- **Pólizas** (`modules/polizas.js`, `#/polizas`): cartera completa con KPIs, filtros (búsqueda en vivo, ramo, aseguradora, asesor, estado) y tabla enlazada a Cliente 360.
- **Cobros y cartera** (`modules/cobros.js`, `#/cobros`): KPIs de cartera, **aging** de vencidos (1–30/31–60/61–90/90+), tabla con conciliación pago↔póliza.
- **Renovaciones** (`modules/renovaciones.js`, `#/renovaciones`): tablero kanban por urgencia (vencidas/≤15/16–45/46–90 d) con prima en juego.
- **Cancelaciones** (`modules/cancelaciones.js`, `#/cancelaciones`): motivos, valor perdido y tasa de fuga.
- **Comisiones** (`modules/comisiones.js`, `#/comisiones`): generada vs liquidada con cortes por asesor / aseguradora / periodo.
- **Historial** (`modules/historial.js`, `#/historial`): feed cronológico de la cartera agrupado por día, con KPIs por tipo.
- **Queries** (`core/queries.js`): nuevas agregaciones `agingVencido()`, `comisionesPor(campo)`, `norm()`.
- Docs: `docs/crm-vistas-globales.md`.

## [0.1.0] — 2026-06-20 · Fundación + CRM Cliente 360
### Added — Paso 1: Shell + capa de datos + tokens
- **Shell** (`index.html`): topbar (marca Orbit 360, búsqueda, badge demo, usuario), sidebar agrupado y host de contenido. Responsive con sidebar colapsable en móvil.
- **Tokens** (`styles/tokens.css`): paleta de marca (rojo #C5162E, grafito #1E2227), tipografías (Manrope / Source Sans 3 / JetBrains Mono), escalas de radio, sombra y espaciado.
- **Base** (`styles/base.css`): componentes compartidos — KPIs, tablas, badges, botones, tabs, avatares, drawer, controles de formulario.
- **Capa de datos** (`data/store.js`): API única (`all/get/where/find/insert/update/remove/on`) sobre localStorage, swappable a backend. Versión de seed con re-siembra.
- **Seed ficticio** (`data/seed.js`): universo relacional determinista — 5 asesores, 6 aseguradoras, 20 clientes, pólizas, cobros, comisiones, actividades y cancelaciones.
- **Core**: `ui.js` (formato moneda/fecha, avatares, badges de estado), `config.js` (navegación + metadatos de módulos), `queries.js` (agregaciones de negocio), `router.js` (sidebar + router por hash con query params).

### Added — CRM · Cliente 360 (núcleo de oro)
- **Lista de cartera**: KPIs (clientes, pólizas activas, prima vigente, por renovar), filtros (búsqueda en vivo, tipo, país, segmento, asesor), tabla con asesor, pólizas, prima, estado de cartera y barra de salud.
- **Ficha 360 (el "cerebro")**: encabezado con datos de contacto, asesor, segmento, score de salud, y banda KPI (pólizas vigentes, prima anual, cartera al día/vencida, comisión generada).
- **Desglose** por pestañas:
  - *Resumen*: próximas acciones, distribución de cartera por ramo, actividad reciente.
  - *Pólizas*: detalle por ramo/producto/aseguradora/vigencia/estado.
  - *Cobros y cartera*: cuotas con estado y bandera de **conciliación** (pago ↔ póliza).
  - *Renovaciones*: línea de tiempo por póliza con días a vencer.
  - *Comisiones*: por periodo, base, %, monto y estado (devengada/liquidada).
  - *Historial*: timeline + alta de interacción (escribe en la capa de datos).
- **Deep-link**: `#/cliente360?c=<id>` desde Inicio y desde la lista.

### Added — Orbit Inicio (Mi Día)
- Metas del mes (diales prima/recaudo), KPIs de cartera, avance por asesor (leaderboard) y prioridades (renovaciones próximas + cobros vencidos), todo derivado del CRM.

### Notes
- Los módulos no construidos muestran una pantalla de estado honesta con su alcance objetivo.
- Pendiente backend real: reimplementar `store` manteniendo la API.

## v0.83–v0.86 (25 Jun 2026)
### Nuevo
- ✉️ Correo interno: helper Orbit.correoCompose — todos los botones de correo abren redactor interno (no mailto)
- 🤖 Orbit IA: módulo completo con 3 contextos (equipo/asesor/cliente), respuestas sobre datos reales del CRM
- 💬 Notificaciones WhatsApp: 6 plantillas, envío wa.me + API, historial en expediente del cliente
- 🧮 Cotizador: campos dinámicos por ramo (Auto/Vida/GM/Hogar/Daños), historial tab, tabs con navegación
- 💳 Cobros: aplicar pago con modal real (fecha + factura + conciliación automática al cargar factura)
- 💳 Filtro por póliza en cobros de la ficha del cliente
- 📊 Insights comparativo profundo: tabla 12 meses clicable, drill-down por mes y por segmento, nueva vs renovada
- 🎓 Academia: bug de backticks anidados corregido, cursos sin null
- ⚡ Automatizaciones: ruta añadida al NAV
- 📊 Reportes: exportar Excel (.xls) y PDF además de CSV
- 🎨 Paletas: Suave/Orbia (púrpura) + Coral cálido; selector de tipografía
- 👥 Roles: 8 roles con módulos predeterminados (Dirección/Admin/Comercial/Finanzas/Marketing/Operativo/Asesor/Asistente)
- 🔒 Confidencialidad doble vía en el portal del cliente
- 📚 Cursos por rol: 4 cursos nuevos (Leads para Asesores, Finanzas para Directores, Marketing Digital, Portal del Cliente)
- 🔧 Capacitación técnica interna (docs/capacitacion-tecnica-interna.html)
- 📱 Responsive global CSS pass

### Corregido
- Academia: función cursos() usaba Orbit.session.rol() inexistente → Orbit.auth.user().rol
- Academia: template literals anidados en quiz → concatenación pura
- Academia: curso null por doble coma en seed → eliminado
- Tipografía duplicada en theme.js → removida
- KPIs clicables en 10 módulos (renovaciones, aseguradoras, finanzas, marketing, siniestros, historial, polizas, cobros, cancelaciones, comisiones)
- Editor de novedades: reemplaza prompt() con modal real con emoji picker y formato
- Configuración: logo y manual usan FileReader real (no alert)
- Cotizador: syntax error onclick quotes → data-drill attributes
- Insights: syntax error onclick quotes → data-drill-mes/label attributes

### Pendiente (todo #121)
- Cotizador: guardar en historial al cotizar; PDF upload propuestas
- Conciliación Finanzas: widget estado bancario vs recibos
- Ficha póliza: editar asesor + sustitución vehículo desde endosos
- Demo interactivo: actualizar con módulos v0.83-v0.86
- Academia: 14 cursos por módulo completos
- Handoff A&S: actualizar con v0.86+
