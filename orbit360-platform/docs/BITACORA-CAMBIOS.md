# BITACORA DE CAMBIOS

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
Módulo: Auth / Login / Migración A&S LAB
Síntoma/necesidad: Validar Auth real con Firebase LAB correcto para Orbit 360 Core, evitando el proyecto antiguo ays-dashboard-4a575.
Esperado: Login/logout funcional en ays-orbit-360-lab, modo demo conservado, data/store.js intacto y sin avanzar a Fase 2.
Causa raíz si aplica: La validación previa se contaminó por referencia histórica al dashboard antiguo; se corrigió a Firebase LAB limpio de Orbit.
Archivo/función: core/auth.js, core/auth-firebase.config.example.js, core/auth-firebase.config.local.js local no versionado.
Fix o mejora aplicada: Validación funcional realizada; login, logout y modo demo confirmados. Config local ignorada por Git. Proyecto viejo no usado.
Impacto en prototipo comercializable: Auth real queda preparado por bandera y tenant, conservando demo como default; A&S será primer tenant real sin bifurcar código.
Estado: RESUELTO EN LAB / pendiente commit local de documentación.

## 2026-06-30 - Fase 2C Store Firestore LAB (EN PROGRESO)

- Modulo: data/store.js.
- Necesidad: preparar backend Firestore LAB sin tocar modulos ni romper modo demo/local.
- Esperado: Orbit.store mantiene API publica: init, reseed, all, get, where, find, insert, update, remove, on, raw.
- Cambio aplicado: se agrego modo Firestore LAB activado solo por bandera explicita ?orbitBackend=firestore-lab&tenant=alianzas-soluciones.
- Cambio aplicado: se mantiene localStorage demo como default y fallback.
- Cambio aplicado: se agrega cache en memoria, snapshots por tenant/coleccion y escrituras insert/update/remove hacia Firestore solo en LAB.
- Archivo/funcion: orbit360-platform/data/store.js; init, insert, update, remove, onSnapshot interno.
- Impacto en prototipo comercializable: habilita backend multi-tenant sin reescribir modulos y sin hardcodear cliente.
- Protecciones: no se toco modules/, no se hizo push, no se hizo deploy, no se uso ays-dashboard-4a575.
- Estado: EN PROGRESO hasta validacion visual en navegador.
## 2026-06-30 - Fase 2C Firestore LAB rules

- Modulo: Backend / Firestore LAB.
- Necesidad: permitir validacion read/write del adapter Orbit.store en Firebase LAB.
- Esperado: Auth LAB + Firestore LAB funcionando por tenant lianzas-soluciones, sin tocar produccion ni datos reales.
- Archivo/funcion: irestore.rules, irebase.json, data/store.js, core/auth.js, index-dev-firestore.html.
- Cambio aplicado: reglas Firestore publicadas unicamente en proyecto LAB ys-orbit-360-lab; usuario DEV autorizado como miembro del tenant; prueba REST write/read OK.
- Impacto: backend multi-tenant validado en LAB para continuar snapshots Orbit.store.
- Estado: RESUELTO EN LAB / pendiente commit local.

## 2026-06-30 - Fase 2C Backend LAB: reglas Firestore y membresia tenant
- Modulo: Backend / data store Firestore LAB
- Necesidad: habilitar acceso controlado por tenant para validar write-through de Orbit.store.
- Mejora aplicada: reglas Firestore LAB tenant-aware, membresia DEV para orbit.lab@demo.com y prueba diagnostica tenants/alianzas-soluciones/data/_diagnostics/items/ping.
- Archivo/funcion: firestore.rules, firebase.json, docs/BITACORA-ERRORES.md, docs/BITACORA-CAMBIOS.md.
- Impacto en prototipo comercializable: valida el patron multi-tenant previo a seguir con pruebas visuales de index-dev-firestore.html.
- Estado: RESUELTO.
## 2026-06-30 - Fase 2C regeneracion limpia de index-dev-firestore.html
- Modulo: Backend LAB / validacion visual
- Mejora aplicada: copia DEV limpia desde index.html, Firebase compat SDK + config local + OrbitBackend LAB antes de data/store.js.
- Archivo/funcion: index-dev-firestore.html.
- Impacto en prototipo comercializable: permite continuar validacion Firestore LAB sin tocar frontend grande ni usar index-dev-auth.html.
- Estado: RESUELTO.
## 2026-06-30 - Fase 2C validacion visual servida con Node
- Modulo: Backend LAB / validacion visual
- Mejora aplicada: servidor local estatico con Node, sin instalar paquetes, para abrir index-dev-firestore.html.
- Archivo/funcion: _orbit360_tmp/server-lab-firestore.js, docs/BITACORA-ERRORES.md, docs/BITACORA-CAMBIOS.md.
- Impacto en prototipo comercializable: metodologia de validacion local mas estable para Paula.
- Estado: RESUELTO.
## 2026-06-30 21:18:44 - Infra/Backend LAB - Integracion prototipo Claude v93
- Sintoma/necesidad: integrar ZIP nuevo del prototipo sin perder Auth LAB, Firestore rules LAB, store.js Firestore LAB ni index-dev-firestore.html limpio.
- Esperado: tomar mejoras frontend/modulos/docs del prototipo nuevo y conservar backend LAB.
- Archivo/funcion: index.html, modules/, styles/, docs/, core/* excepto auth.js, data/* excepto store.js, index-dev-firestore.html.
- Fix o mejora aplicada: copia selectiva, preservacion de store.js LAB, preservacion/fusion minima de core/auth.js, regeneracion de index-dev-firestore.html desde index.html limpio.
- Impacto en prototipo comercializable: permite seguir backend sobre la version visual mas completa sin perder avances LAB.
- Estado: RESUELTO.

## 2026-06-30 21:23:06 - Documentacion - Pendientes Claude acumulados v1.47
- Sintoma/necesidad: consolidar en un solo documento los pendientes para Claude despues de integrar Prototype Development Request (93).
- Esperado: separar mejoras del prototipo base, pendientes para Claude y pendientes de backend ChatGPT.
- Archivo/funcion: docs/PENDIENTES-CLAUDE-ACUMULADO.md.
- Fix o mejora aplicada: documento acumulado creado/actualizado con estado v1.47, mejoras incorporadas y pendientes por lote.
- Impacto en prototipo comercializable: evita reprocesos y permite pasar a Claude un backlog claro sin mezclar backend con frontend.
- Estado: RESUELTO.

## 2026-06-30 21:38:43 - Documentacion - Hallazgos visuales post v93 acumulados para Claude
- Sintoma/necesidad: despues de integrar v93, Paula valido visualmente en Chrome y detecto que varias mejoras documentadas por Claude no cumplen aun el nivel esperado.
- Esperado: registrar como pendientes abiertos, no como cerrados, las mejoras de Novedades, Aseguradoras, Insights y Finanzas.
- Archivo/funcion: docs/PENDIENTES-CLAUDE-ACUMULADO.md.
- Fix o mejora aplicada: se agrego seccion de validacion visual Paula con hallazgos, esperado detallado, estado y criterio de cierre.
- Impacto en prototipo comercializable: evita falsos positivos y reprocesos; permite pedir a Claude un lote claro de profundizacion visual/funcional.
- Estado: RESUELTO.

## 2026-06-30 21:43:35 - Documentacion - Correccion metodologica auditoria v93
- Sintoma/necesidad: Paula indico que Aseguradoras visual premium no era un pendiente previo, sino una solicitud nueva actual.
- Esperado: no asumir ni registrar como previo lo que no fue pedido; clasificar con base en auditoria real del ZIP v93.
- Archivo/funcion: docs/AUDITORIA-ZIP-V93-CHATGPT-20260630.md, docs/PENDIENTES-CLAUDE-ACUMULADO.md.
- Fix o mejora aplicada: se creo auditoria forense v93, se registro que modules/aseguradoras.js no cambio, y se reclasifico Aseguradoras visual premium como solicitud nueva.
- Impacto en prototipo comercializable: mejora trazabilidad, evita falsos positivos y evita reprocesos con Claude.
- Estado: RESUELTO.

## 2026-06-30 21:53:47 - Backend LAB - Smoke test Orbit.store Firestore
- Sintoma/necesidad: validar la API exacta de Orbit.store contra Firestore LAB sin tocar modulos.
- Esperado: all, get, where, insert, update, remove y _emit funcionan en modo firestore-lab.
- Archivo/funcion: data/store.js, index-dev-firestore.html.
- Fix o mejora aplicada: se ejecuto smoke test temporal en navegador autenticado contra tenant alianzas-soluciones, coleccion actividades, con documento ficticio creado/actualizado/eliminado.
- Resultado:
- :  
- Impacto en prototipo comercializable: confirma que la capa unica de datos mantiene API compatible para avanzar backend sin reescribir modulos.
- Estado: RESUELTO.

## 2026-06-30 22:15:23 - Backend LAB - Aislamiento multi-tenant Firestore
- Sintoma/necesidad: validar que el usuario LAB pueda operar solo dentro del tenant autorizado y no en tenants ajenos.
- Esperado: lectura/escritura/borrado permitidos en tenant alianzas-soluciones; lectura/escritura denegadas en tenant no autorizado.
- Archivo/funcion: firestore.rules, core/auth-firebase.config.local.js, index-dev-firestore.html.
- Resultado:
- Firebase inicializado: OK ays-orbit-360-lab
- Auth LAB login: OK orbit.lab@demo.com / woJlxR1iFEeiQZvTscPj4qQ5Qc73
- Membership tenant autorizado: OK alianzas-soluciones
- WRITE tenant autorizado: OK tenants/alianzas-soluciones/data/_diagnostics/items/isolation_allowed_20260630_221511
- READ tenant autorizado: OK tenants/alianzas-soluciones/data/_diagnostics/items/isolation_allowed_20260630_221511
- DELETE tenant autorizado: OK tenants/alianzas-soluciones/data/_diagnostics/items/isolation_allowed_20260630_221511
- READ membership tenant no autorizado: OK denegado correctamente
- WRITE tenant no autorizado: OK denegado correctamente
- READ tenant no autorizado: OK denegado correctamente
- Fix o mejora aplicada: test temporal en navegador autenticado contra Firestore LAB; documento permitido creado y eliminado; intento cross-tenant denegado.
- Impacto en prototipo comercializable: confirma aislamiento por tenant antes de avanzar con datos reales o integraciones.
- Estado: RESUELTO.

## 2026-06-30 22:30:55 - Backend LAB - Estado y matriz Firestore documentados
- Sintoma/necesidad: despues de validar Orbit.store y aislamiento multi-tenant, documentar el estado tecnico y la matriz de colecciones antes de avanzar a persistencia real.
- Esperado: tener un documento claro para continuar backend sin perder restricciones ni mezclar frontend/Claude.
- Archivo/funcion: docs/ESTADO-BACKEND-LAB-20260630.md, docs/MATRIZ-COLECCIONES-FIRESTORE-LAB.md.
- Fix o mejora aplicada: se documento estado Auth LAB, Firestore rules, Store LAB, aislamiento multi-tenant, integracion v93 y colecciones base.
- Impacto en prototipo comercializable: establece la base de migracion Firestore multi-tenant sin tocar modulos ni datos reales.
- Estado: RESUELTO.
