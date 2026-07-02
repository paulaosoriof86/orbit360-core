# BITACORA DE ERRORES

---

Fecha: 2026-06-30 16:05
Modulo: Login / Auth LAB / Generacion temporal index-dev-auth.html
Sintoma/necesidad: En la validacion DEV/LAB aparecieron caracteres mojibake y emojis corruptos en pantalla: textos como sesion, contrasena, administracion y etiquetas del login se renderizaron como caracteres extraños.
Esperado: Todos los textos del prototipo y archivos temporales de validacion deben conservar UTF-8 correcto, incluyendo acentos, signos y emojis permitidos.
Causa raiz probable: Generacion del archivo temporal con PowerShell usando lectura/escritura sin codificacion UTF-8 explicita; esto puede reinterpretar archivos UTF-8 como ANSI/Windows-1252 y producir mojibake.
Archivo/funcion: index-dev-auth.html generado desde index.html durante validacion Fase 1 Auth LAB.
Fix o mejora aplicada: Regenerar index-dev-auth.html con System.Text.UTF8Encoding(false), documentar regla de migracion y evitar Get-Content/Set-Content sin encoding explicito en scripts que manipulen HTML/JS/CSS.
Impacto en prototipo comercializable: Aplicar a prototipo base como guardrail de migracion; cualquier script de preparacion, ZIP, validacion o hotfix debe preservar UTF-8 y validar que no aparezcan patrones Ã, Â, ðŸ, â en UI.
Estado: EN PROGRESO
---

Fecha: 2026-06-30 16:21
Módulo: Login / Sidebar / UX tenant A&S
Síntoma/necesidad: En la validación DEV/LAB una URL temporal mostró caracteres mojibake y se evidenció que los badges técnicos BETA/NÚCLEO/ROAD no deben aparecer al cliente final.
Esperado: Textos UTF-8 correctos y sidebar limpio para tenant A&S, sin etiquetas técnicas visibles al usuario final.
Causa raíz si aplica: index-dev-auth.html es archivo temporal generado para validación; los badges técnicos pertenecen al prototipo/control interno y deben ocultarse por tenant/rol/modo.
Archivo/función: index-dev-auth.html temporal; core/config.js / renderer de navegación / estilos sidebar.
Fix o mejora aplicada: Hallazgo documentado. La URL demo correcta no mostró caracteres raros y permitió login/logout. Pendiente aplicar ocultamiento de badges técnicos para tenant cliente.
Impacto en prototipo comercializable: Aplicar como mejora al prototipo base: separar modo interno/desarrollo de modo cliente real; evitar señales de laboratorio en white-label.
Estado: ABIERTO para UX tenant A&S / aplicar a prototipo base.

## 2026-06-30 - Auth/Firestore LAB config mismatch

- Modulo: Auth LAB / Store Firestore LAB.
- Sintoma: index-dev-firestore.html limpio abrio sin mojibake, pero Auth mostro alerta: Firebase Auth LAB requiere config local de ys-orbit-360-lab.
- Esperado: Auth y Store deben leer la configuracion local LAB ya existente.
- Causa raiz: uth-firebase.config.local.js define window.Orbit.firebaseAuthConfig, mientras uth.js buscaba window.OrbitFirebaseAuthConfig.
- Archivo/funcion: core/auth.js / ensureFirebase; data/store.js / inicializacion Firebase previa a Firestore.
- Fix aplicado: compatibilidad con ambos nombres de configuracion: window.Orbit.firebaseAuthConfig y window.OrbitFirebaseAuthConfig.
- Impacto: permite continuar validacion backend Firestore LAB sin tocar modulos ni frontend grande.
- Estado: EN PROGRESO hasta validar login LAB limpio.

## 2026-06-30 - Fase 2C Firestore rules LAB sin BOM
- Modulo: Backend / Firestore rules LAB
- Sintoma/necesidad: el deploy anterior fallo por BOM en firestore.rules con error token recognition at BOM.
- Esperado: reglas publicadas solo en Firebase LAB ays-orbit-360-lab y validacion write/read autenticada.
- Causa raiz: archivo firestore.rules generado con BOM y script previo no detuvo flujo tras fallo.
- Archivo/funcion: firestore.rules, firebase.json, validacion REST Auth/Firestore.
- Fix aplicado: reglas reescritas UTF-8 sin BOM, here-string single-quoted para preservar $(database), deploy detenido si Firebase CLI falla.
- Impacto en prototipo comercializable: asegura base de reglas tenant-aware para conectar Orbit.store a Firestore sin tocar modulos.
- Estado: RESUELTO.
## 2026-06-30 - Fase 2C validacion visual LAB detenida por mojibake en copia dev
- Modulo: Backend LAB / index-dev-firestore.html
- Sintoma/necesidad: la validacion visual se detuvo antes de abrir navegador por marcadores de mojibake en la copia DEV.
- Esperado: usar index.html aprobado o copia limpia index-dev-firestore.html, sin usar index-dev-auth.html.
- Causa raiz: copia DEV generada o leida con riesgo de codificacion incorrecta; el control evito validar pantalla danada.
- Archivo/funcion: index-dev-firestore.html.
- Fix aplicado: regenerar index-dev-firestore.html desde index.html aprobado, UTF-8 sin BOM, con inyeccion LAB antes de data/store.js.
- Impacto en prototipo comercializable: evita validar backend sobre una pantalla con caracteres danados y conserva el flujo LAB limpio.
- Estado: RESUELTO.
## 2026-06-30 - Fase 2C servidor local no abrio por Python ausente
- Modulo: Backend LAB / validacion visual local
- Sintoma/necesidad: Chrome mostro ERR_FAILED porque el servidor local no arranco; Windows reporto Python no instalado.
- Esperado: abrir index-dev-firestore.html desde servidor local para validar Firestore LAB.
- Causa raiz: dependencia local Python no disponible en Windows.
- Archivo/funcion: servidor local de validacion.
- Fix aplicado: usar servidor estatico Node sin dependencias externas en _orbit360_tmp/server-lab-firestore.js.
- Impacto en prototipo comercializable: reduce reproceso de validacion local y evita depender de Python.
- Estado: RESUELTO.
## 2026-06-30 21:18:44 - Infra/Backend LAB - Riesgo de retroceso por store.js del ZIP
- Sintoma/necesidad: el ZIP nuevo incluye data/store.js de prototipo local/demo, no Firestore LAB.
- Esperado: no sobrescribir el store.js conectado a Firestore LAB.
- Causa raiz: el prototipo de Claude sigue entregando store local para demo; backend vive en la rama LAB local.
- Archivo/funcion: data/store.js.
- Fix o mejora aplicada: se preservo el store.js local con Firestore LAB y se excluyo data/store.js del ZIP durante la copia.
- Impacto en prototipo comercializable: evita perder la capa unica conectable al backend.
- Estado: RESUELTO.

## 2026-06-30 21:38:43 - Prototipo v93 - Falsos positivos de mejoras declaradas
- Modulo: Novedades, Aseguradoras, Insights, Finanzas.
- Sintoma/necesidad: el prototipo documenta avances en v1.43-v1.47, pero la validacion visual muestra que algunas mejoras no estan completas, no son suficientemente visibles o no cumplen profundidad requerida.
- Esperado: no cerrar mejoras solo por CHANGELOG; cerrar solo con render real y flujo clickeable validado.
- Causa raiz: documentacion del prototipo mezcla avances parciales de codigo con cierre funcional/visual.
- Archivo/funcion: core/novedades.js, modules/aseguradoras.js, modules/insights.js, modules/finanzas.js, docs/PENDIENTES-CLAUDE-ACUMULADO.md.
- Fix o mejora aplicada: se documenta como pendiente para Claude/prototipo base y se activa regla de validacion por render real.
- Impacto en prototipo comercializable: protege la calidad del producto y evita entregar modulos superficiales como cerrados.
- Estado: ABIERTO.

## 2026-06-30 21:43:35 - Documentacion - Reclasificacion de hallazgo Aseguradoras
- Modulo: Aseguradoras / documentacion.
- Sintoma/necesidad: se documento Aseguradoras como si el rediseño premium fuera pendiente previo, cuando Paula lo solicito ahora.
- Esperado: separar solicitud nueva actual de pendientes previos y de arquitectura ya definida.
- Causa raiz: interpretacion demasiado amplia al documentar hallazgos visuales post v93.
- Archivo/funcion: docs/PENDIENTES-CLAUDE-ACUMULADO.md.
- Fix o mejora aplicada: se agrego correccion metodologica y auditoria real v93; Aseguradoras visual premium queda como solicitud nueva actual.
- Impacto en prototipo comercializable: protege la precision del backlog para Claude.
- Estado: RESUELTO.

## 2026-07-01 00:04:14 - Backend LAB / Lectura seed

- Modulo: Backend LAB / Orbit.store.
- Sintoma/necesidad: la validacion de lectura del seed desde la app real no quedo OK.
- Esperado: lectura de colecciones seed mediante Orbit.store desde index-dev-firestore.html.
- Causa raiz: pendiente de confirmar; revisar autenticacion LAB, carga de scripts o resultado JSON.
- Archivo/funcion: index-dev-firestore.html, data/store.js, core/auth.js.
- Fix o mejora aplicada: se genero runner real en navegador y reporte JSON para diagnostico.
- Impacto en prototipo comercializable: aplicar a prototipo base solo si se confirma bug de carga real, no si fue sesion/auth local.
- Estado: ABIERTO

## 2026-07-01 00:13:31 - Backend LAB / Validacion seed

- Modulo: Backend LAB / Firestore seed.
- Sintoma/necesidad: la validacion real de lectura del seed LAB no quedo OK.
- Esperado: todos los documentos ficticios de docs/SEED-FICTICIO-FIRESTORE-LAB.json deben leerse desde Orbit.store en index-dev-firestore.html.
- Causa raiz: pendiente de confirmar con esultado.json.
- Archivo/funcion: index-dev-firestore.html, data/store.js, core/auth.js.
- Fix o mejora aplicada: se corrigio _emit y se genero validador V2 con checks por documentos exactos.
- Impacto en prototipo comercializable: aplicar a prototipo base solo el fix de API; revisar backend si los documentos LAB no aparecen.
- Estado: ABIERTO

## 2026-07-01 00:17:02 - Backend LAB / Seed Firestore

- Modulo: Backend LAB / Firestore seed.
- Sintoma/necesidad: la validacion V3 no quedo OK.
- Esperado: sesion LAB autorizada, tenant lianzas-soluciones, API Orbit.store completa y documentos seed legibles.
- Causa raiz: pendiente de confirmar con esultado.json.
- Archivo/funcion: index-dev-firestore.html, data/store.js, core/auth.js, docs/SEED-FICTICIO-FIRESTORE-LAB.json.
- Fix o mejora aplicada: se separo login pendiente de error real y se genero reporte JSON.
- Impacto en prototipo comercializable: aplicar aprendizaje a validadores del backend.
- Estado: ABIERTO

## 2026-07-01 00:24:13 - Backend LAB / Validacion seed V4

- Modulo: Backend LAB / Firestore seed.
- Sintoma/necesidad: V4 no quedo OK.
- Esperado: sesion LAB autorizada, tenant correcto, API completa y seed legible.
- Causa raiz: pendiente de confirmar con esultado.json.
- Archivo/funcion: index-dev-firestore.html, data/store.js, core/auth.js, docs/SEED-FICTICIO-FIRESTORE-LAB.json.
- Fix o mejora aplicada: se valido en puerto estable 5177 y se genero reporte JSON.
- Impacto en prototipo comercializable: mantener smoke tests con puerto estable y no pedir password manual.
- Estado: ABIERTO

## 2026-07-01 00:48:15 - Backend LAB / Fallback demo activo

- Modulo: Backend LAB / Auth / Store.
- Sintoma/necesidad: la app podía mostrar UI demo/local sin Firebase Auth LAB real.
- Esperado: irestore-lab debe requerir Firebase Auth LAB y Firestore LAB por tenant.
- Causa raíz: separación incompleta entre modo demo y modo backend LAB.
- Archivo/funcion: core/auth.js, core/auth-lab-gate.local.js, data/store.js.
- Fix o mejora aplicada: gate LAB y contrato No-Fallback; pendiente endurecer data/store.js.
- Impacto en prototipo comercializable: aplicar a prototipo base antes de producción.
- Estado: EN PROGRESO

## 2026-07-01 00:53:08 - Backend LAB / data.store sin modo LAB formal

- Modulo: Backend LAB / Store.
- Sintoma/necesidad: el store base contenia Firestore, localStorage y seed, pero no irestore-lab formal.
- Esperado: los modos demo, LAB y produccion deben separarse explicitamente.
- Causa raiz: store base mezclaba rutas/fallbacks durante migracion inicial.
- Archivo/funcion: data/store.js, data/store-firestore-lab.local.js.
- Fix o mejora aplicada: override LAB explicito solo en index-dev-firestore.html.
- Impacto en prototipo comercializable: aplicar a base comercializable antes de produccion.
- Estado: EN PROGRESO

## 2026-07-01 03:32:10 - Reproceso por entrada incorrecta de validacion

- Modulo: Metodologia local / Auth LAB.
- Sintoma/necesidad: se intento corregir repetidamente el login LAB aunque el bloqueo era esperado.
- Esperado: revisar prototipo desde index.html y backend desde index-dev-firestore.html.
- Causa raiz: no habia separacion operativa clara entre preview visual y backend LAB.
- Archivo/funcion: launchers locales y documentacion de decision.
- Fix o mejora aplicada: separacion formal, guia rapida y router a preview visual.
- Impacto en prototipo comercializable: reduce reproceso y evita parches innecesarios.
- Estado: RESUELTO

## 2026-07-01 03:52:58 - Prototipo V98 no resuelve pendientes profundos

- Modulo: Prototipo general.
- Sintoma/necesidad: la plataforma se ve igual y varios flujos siguen sin detalle, sincronizacion o edicion.
- Esperado: cambios visibles y verificables en los modulos priorizados.
- Causa raiz: el ZIP V98 atiende solo cambios puntuales y no el bloque profundo solicitado.
- Archivo/funcion: Inicio, Plantillas, Reportes, Finanzas, Comisiones, Metas/Insights, Correo, Cotizador, Historial.
- Fix o mejora aplicada: se documenta pendiente post V98 para Claude y se evita atribuir esto al backend.
- Impacto en prototipo comercializable: no aprobar como version funcional completa para migraciones futuras.
- Estado: ABIERTO

## 2026-07-01 04:14:57 - Posible contaminacion cruzada Orbit / Orbia / CXOrbia

- Modulo: Repositorio local / preview / documentacion.
- Sintoma/necesidad: la usuaria reporta aparicion de Orbia al revisar Orbit normal.
- Esperado: Orbit 360 debe mantenerse independiente, sin branding, modulos ni textos de Orbia/CXOrbia.
- Causa raiz: pendiente segun auditoria; puede ser app activa, docs, cache, localStorage, tools, zip o backups.
- Archivo/funcion: ver docs/AUDITORIA-CONTAMINACION-ORBIT-ORBIA-CXORBIA-20260701.md.
- Fix o mejora aplicada: se audita antes de limpiar.
- Impacto en prototipo comercializable: critico si esta en app activa; medio/bajo si solo esta en docs/backups.
- Estado: ABIERTO

## 2026-07-01 12:30:13 - CallDepthOverflow por funcion Git
- Modulo/area: PowerShell / Git local.
- Sintoma/necesidad: Error en el script a causa de un desbordamiento de profundidad de llamada.
- Esperado: ejecutar git real sin recursion ni alias ambiguos.
- Causa raiz: PowerShell no diferencia mayusculas/minusculas; la funcion Git intercepto llamadas a git.
- Archivo/funcion: funcion Git del bloque anterior.
- Fix aplicado: eliminar nombre Git y usar git.exe explicito dentro de Invoke-GitExe.
- Impacto comercializable: evita bloqueo operativo y perdida de tiempo.
- Estado: RESUELTO.

## 2026-07-01 - Referencia localStorage en modulos detectada y corregida

**Modulo:** Configuracion / Plantillas.

**Sintoma:** El smoke backend encontro localStorage en modules/configuracion.js y una referencia textual heredada en modules/plantillas.js.

**Esperado:** Ningun modulo debe tocar localStorage directamente.

**Causa raiz:** Persistencia visual heredada para logo white-label y comentario de migracion anterior.

**Archivo/funcion:** modules/configuracion.js, modules/plantillas.js.

**Fix aplicado:** Se elimino localStorage del flujo del logo y se conserva Orbit.tenant.setDeep como mecanismo de configuracion. Se limpio la referencia textual heredada.

**Impacto:** Aplica al prototipo base Orbit 360.

**Estado:** RESUELTO.

## 2026-07-01 18:56:05 - P0 arquitectura post v1.73: localStorage directo y documentación backend eliminada
- Módulo: Configuración / documentación backend.
- Síntoma/necesidad: el ZIP v1.73 reintrodujo localStorage directo para logo y eliminó docs backend/metodología no incluidos en la base visual.
- Esperado: módulos solo usan Orbit.store/Orbit.tenant; la documentación de backend y continuidad no se pierde al instalar un ZIP visual.
- Causa raíz: empalme de ZIP visual completo no incluía todos los docs backend protegidos y traía un remanente de persistencia local en Configuración.
- Archivo/función: modules/configuracion.js, modules/automatizaciones.js, docs/*.
- Fix aplicado: reemplazo mínimo por Orbit.store.setPref, preservación de Orbit.tenant, restauración documental desde backup y referencia funcional ajena eliminada.
- Impacto en prototipo comercializable: evita romper la migración Firestore y reduce riesgo de contaminación funcional.
- Estado: RESUELTO.

## 2026-07-01 18:59:21 - Referencias funcionales ajenas post v1.73
- Módulo: Automatizaciones / Marketing seed.
- Síntoma/necesidad: aparecían términos funcionales de otro producto en módulo y datos demo.
- Esperado: Orbit 360 debe mantener términos propios de seguros, sin referencias funcionales a otros productos.
- Causa raíz: remanentes de inspiración/ejemplos heredados en comentario de módulo y seed de marketing.
- Archivo/función: modules/automatizaciones.js, data/seed.js.
- Fix aplicado: reemplazo por lenguaje propio de Orbit 360 y seguros.
- Impacto en prototipo comercializable: reduce riesgo de contaminación visual, comercial y documental.
- Estado: RESUELTO.

## 2026-07-01 19:20:11 - Falla contractual Fase 7D: hook LAB con API incompleta
- MÃ³dulo: Backend LAB / Orbit.store.
- SÃ­ntoma/necesidad: smoke runtime detectÃ³ window.Orbit y Orbit.store, pero faltaban ind, pref, setPref, init, eseed, aw; pref/setPref no hacÃ­an roundtrip.
- Esperado: backend LAB debe exponer la misma API expandida de data/store.js v1.73 sin tocar mÃ³dulos.
- Causa raÃ­z: data/store-firestore-lab.local.js quedÃ³ en contrato anterior y reemplazaba Orbit.store con una API reducida.
- Archivo/funciÃ³n: data/store-firestore-lab.local.js.
- Fix aplicado: shim de compatibilidad v1.73 al final del hook LAB; conserva diagnÃ³stico OrbitBackend.
- Impacto en prototipo comercializable: evita romper mÃ³dulos nuevos de v1.73 y mantiene migraciÃ³n Firestore por contrato.
- Estado: EN VERIFICACIÃ“N.
