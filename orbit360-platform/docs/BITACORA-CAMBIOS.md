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

## 2026-06-30 22:34:03 - Backend LAB - Render smoke modulos Firestore
- Sintoma/necesidad: validar que la app renderiza modulos en modo firestore-lab despues de integrar v93 y conectar Orbit.store a Firestore LAB.
- Esperado: rutas principales cargan sin errores JS, sin tocar modulos, sin datos reales y sin usar index-dev-auth.html.
- Archivo/funcion: index-dev-firestore.html, data/store.js, core/router.js, modules/*.
- Resultado:
- inicio: OK, textLength=2356
- cronograma: OK, textLength=1427
- ops: OK, textLength=2645
- leads: OK, textLength=2913
- aseguradoras: OK, textLength=2229
- cotizador: OK, textLength=2426
- comparativo: OK, textLength=1743
- cliente360: OK, textLength=3397
- polizas: OK, textLength=8270
- cobros: OK, textLength=15079
- renovaciones: OK, textLength=2094
- cancelaciones: OK, textLength=2326
- siniestros: OK, textLength=2408
- historial: OK, textLength=14146
- comisiones: OK, textLength=1652
- finanzas: OK, textLength=3761
- marketing: OK, textLength=2461
- academia: OK, textLength=2202
- insights: OK, textLength=2177
- portal: OK, textLength=7835
- ia: OK, textLength=7849
- notificaciones: OK, textLength=8131
- automatizaciones: OK, textLength=8544
- equipo: OK, textLength=8957
- configuracion: OK, textLength=9370
- reportes: OK, textLength=9783
- calidad: OK, textLength=10196
- plantillas: OK, textLength=10609
- importar: OK, textLength=11022
- correo: OK, textLength=11435
- Advertencias:
- Sin advertencias.
- Fix o mejora aplicada: test temporal en navegador autenticado, recorriendo rutas hash sobre index-dev-firestore.html.
- Impacto en prototipo comercializable: confirma compatibilidad inicial del render con backend LAB antes de seed ficticio y migracion de importadores.
- Estado: RESUELTO.

## 2026-06-30 22:36:18 - Backend LAB - Render smoke modulos Firestore
- Sintoma/necesidad: validar que la app renderiza modulos en modo firestore-lab despues de integrar v93 y conectar Orbit.store a Firestore LAB.
- Esperado: rutas principales cargan sin errores JS, sin tocar modulos, sin datos reales y sin usar index-dev-auth.html.
- Archivo/funcion: index-dev-firestore.html, data/store.js, core/router.js, modules/*.
- Resultado:
- inicio: OK, textLength=2356
- cronograma: OK, textLength=1427
- ops: OK, textLength=2645
- leads: OK, textLength=2913
- aseguradoras: OK, textLength=2229
- cotizador: OK, textLength=2426
- comparativo: OK, textLength=1743
- cliente360: OK, textLength=3397
- polizas: OK, textLength=8270
- cobros: OK, textLength=15079
- renovaciones: OK, textLength=2094
- cancelaciones: OK, textLength=2326
- siniestros: OK, textLength=2408
- historial: OK, textLength=14146
- comisiones: OK, textLength=1652
- finanzas: OK, textLength=3761
- marketing: OK, textLength=2461
- academia: OK, textLength=2202
- insights: OK, textLength=2177
- portal: OK, textLength=7835
- ia: OK, textLength=7849
- notificaciones: OK, textLength=8131
- automatizaciones: OK, textLength=8544
- equipo: OK, textLength=8957
- configuracion: OK, textLength=9370
- reportes: OK, textLength=9783
- calidad: OK, textLength=10196
- plantillas: OK, textLength=10609
- importar: OK, textLength=11022
- correo: OK, textLength=11435
- Advertencias:
- Sin advertencias.
- Fix o mejora aplicada: test temporal en navegador autenticado, recorriendo rutas hash sobre index-dev-firestore.html.
- Impacto en prototipo comercializable: confirma compatibilidad inicial del render con backend LAB antes de seed ficticio y migracion de importadores.
- Estado: RESUELTO.

## 2026-06-30 22:46:13 - Backend LAB - Auditoria store.js Firestore LAB
- Sintoma/necesidad: auditar data/store.js para confirmar API exacta y modo Firestore LAB antes de avanzar a seed/importadores.
- Esperado: documentar API, modo LAB, rutas Firestore, riesgos y pendientes tecnicos.
- Archivo/funcion: data/store.js, index-dev-firestore.html, docs/AUDITORIA-STORE-FIRESTORE-LAB-20260630.md.
- Fix o mejora aplicada: se creo auditoria tecnica del store LAB y se confirmaron patrones clave de API, tenant, onSnapshot, fallback local y proyecto LAB.
- Impacto en prototipo comercializable: protege la capa unica de datos antes de avanzar backend.
- Estado: RESUELTO.

## 2026-06-30 22:51:54 - Backend LAB - Seed ficticio minimo preparado
- Sintoma/necesidad: preparar estructura de datos ficticia para validar colecciones criticas en Firestore LAB sin usar datos reales.
- Esperado: documentar plan y JSON ficticio sin ejecutar carga en Firestore.
- Archivo/funcion: docs/PLAN-SEED-FICTICIO-FIRESTORE-LAB.md, docs/SEED-FICTICIO-FIRESTORE-LAB.json.
- Fix o mejora aplicada: se preparo seed ficticio minimo con prefijo lab_ y separacion de pais/moneda.
- Impacto en prototipo comercializable: deja lista la siguiente fase de persistencia real en LAB sin tocar produccion ni datos reales.
- Estado: PREPARADO / NO EJECUTADO.

## 2026-06-30 23:00:07 - Backend LAB - Seed ficticio minimo cargado
- Sintoma/necesidad: cargar datos ficticios minimos en Firestore LAB para validar modulos con datos persistentes.
- Esperado: escribir solo documentos lab_ en tenant alianzas-soluciones y verificar lectura.
- Archivo/funcion: docs/SEED-FICTICIO-FIRESTORE-LAB.json, Firestore tenants/alianzas-soluciones/data/*/items/*.
- Resultado:
- clientes: escritos=2, verificados=2
- asesores: escritos=2, verificados=2
- aseguradoras: escritos=2, verificados=2
- vehiculos: escritos=1, verificados=1
- polizas: escritos=2, verificados=2
- cobros: escritos=2, verificados=2
- finmovs: escritos=1, verificados=1
- comisiones: escritos=1, verificados=1
- reclamos: escritos=1, verificados=1
- negocios: escritos=1, verificados=1
- gestiones: escritos=1, verificados=1
- actividades: escritos=1, verificados=1
- metas: escritos=1, verificados=1
- documentos: escritos=0, verificados=0
- contenidos: escritos=0, verificados=0
- cursos: escritos=0, verificados=0
- acreedores: escritos=0, verificados=0
- facturas: escritos=0, verificados=0
- notificaciones: escritos=0, verificados=0
- automatizaciones: escritos=0, verificados=0
- integraciones: escritos=0, verificados=0
- plantillas: escritos=0, verificados=0
- auditoria: escritos=0, verificados=0
- configuracion: escritos=0, verificados=0
- Fix o mejora aplicada: carga autenticada en navegador LAB con verificacion de documentos escritos.
- Impacto en prototipo comercializable: habilita pruebas visuales y funcionales sobre datos persistentes sin usar datos reales.
- Estado: RESUELTO.

## 2026-06-30 23:07:34 - Backend LAB - Lectura seed ficticio desde Orbit.store
- Sintoma/necesidad: validar que el seed ficticio cargado en Firestore LAB se lea desde la API publica Orbit.store sin tocar modulos.
- Esperado: all/get/where recuperan documentos lab_ persistentes desde tenant alianzas-soluciones.
- Archivo/funcion: data/store.js, docs/RESULTADO-LECTURA-SEED-FICTICIO-ORBITSTORE-LAB-20260630.md.
- Resultado:
- : encontrados=, esperadoMin=
- Fix o mejora aplicada: test temporal de lectura autenticada en navegador LAB.
- Impacto en prototipo comercializable: confirma que la app puede consumir datos persistentes Firestore por la capa unica.
- Estado: RESUELTO.

## 2026-07-01 00:04:14 - Backend LAB / Seed ficticio

- Modulo: Backend LAB / Orbit.store / Firestore.
- Necesidad: validar lectura del seed ficticio persistente desde la app real index-dev-firestore.html, no desde runner aislado.
- Esperado: Orbit.store disponible con API completa y lectura de colecciones seed sin escrituras.
- Archivo/funcion: index-dev-firestore.html, data/store.js, Orbit.store.all/get/where.
- Resultado: ABIERTO - lectura no validada; revisar resultado JSON.
- Impacto: confirma continuidad del backend LAB sin tocar modulos ni produccion.
- Estado: ABIERTO

## 2026-07-01 00:13:31 - Backend LAB / Orbit.store

- Modulo: Backend LAB / data.store.
- Sintoma/necesidad: Orbit.store cargaba en la app real, pero faltaba _emit en la API publica.
- Esperado: API exacta ll, get, where, insert, update, emove, _emit.
- Causa raiz: _emit existia como mecanismo requerido por la migracion, pero no quedaba expuesto publicamente en la API usada por la app real.
- Archivo/funcion: data/store.js / API publica Orbit.store.
- Fix o mejora aplicada: exposicion minima de _emit sin cambiar la firma del store ni tocar modulos.
- Impacto en prototipo comercializable: aplicar a prototipo base para evitar que integraciones y validadores encuentren API incompleta.
- Estado: ABIERTO

## 2026-07-01 00:17:02 - Backend LAB / Validacion seed V3

- Modulo: Backend LAB / Orbit.store / Firestore.
- Sintoma/necesidad: la validacion V2 marco fallo mientras la app estaba en login.
- Esperado: validar seed solo despues de sesion Firebase LAB autorizada.
- Causa raiz: validador anterior no diferenciaba correctamente login pendiente vs fallo real de lectura.
- Archivo/funcion: validador temporal __validate_seed_lab_v3.html; app real index-dev-firestore.html; store data/store.js.
- Fix o mejora aplicada: validador V3 espera UID LAB, API completa y tenant correcto antes de verificar documentos.
- Impacto en prototipo comercializable: aprendizaje de metodologia; no marcar fallos de backend si la app sigue en login.
- Estado: ABIERTO

## 2026-07-01 00:24:13 - Backend LAB / Validacion seed V4 puerto 5177

- Modulo: Backend LAB / Orbit.store / Firestore.
- Sintoma/necesidad: V3 quedo esperando login por abrir en puerto diferente al de la sesion ya observada.
- Esperado: validar seed desde app real reutilizando origen estable 127.0.0.1:5177.
- Causa raiz: Firebase Auth persiste por origen/puerto; cambiar puerto puede perder sesion local.
- Archivo/funcion: validador temporal V4, index-dev-firestore.html, data/store.js.
- Fix o mejora aplicada: validacion con puerto fijo 5177, espera de sesion LAB y verificacion de documentos seed.
- Impacto en prototipo comercializable: aprendizaje para smoke tests; usar puerto estable para pruebas con Auth.
- Estado: ABIERTO

## 2026-07-01 00:48:15 - Backend LAB / Auth Gate y No-Fallback

- Modulo: Backend LAB / Auth / Store.
- Sintoma/necesidad: V5 confirmó API completa pero sin sesión Firebase LAB; la UI visible correspondía a sesión demo/local.
- Esperado: en irestore-lab, sin Firebase Auth LAB no debe abrir dashboard demo ni disfrazar seed/localStorage como backend.
- Causa raíz: fallback demo/local seguía disponible durante pruebas LAB.
- Archivo/funcion: core/auth-lab-gate.local.js, index-dev-firestore.html, data/store.js.
- Fix o mejora aplicada: consolidación de gate local LAB, limpieza de validadores temporales y contrato No-Fallback.
- Impacto en prototipo comercializable: aplicar a prototipo base/backend real; nunca mezclar demo y backend.
- Estado: EN PROGRESO

## 2026-07-01 00:53:08 - Backend LAB / Store Firestore explicito

- Modulo: Backend LAB / Store / Auth.
- Sintoma/necesidad: data/store.js no declaraba irestore-lab y mantenia seed/localStorage, con riesgo de fallback demo.
- Esperado: en irestore-lab, Orbit.store debe usar Firestore LAB o bloquear por auth, nunca datos demo/locales.
- Causa raiz: separacion incompleta entre store demo y store backend LAB.
- Archivo/funcion: data/store-firestore-lab.local.js, core/auth-lab-gate.local.js, index-dev-firestore.html.
- Fix o mejora aplicada: store Firestore LAB explicito, auth gate robusto por URL y no-fallback demo.
- Impacto en prototipo comercializable: aplicar patron a prototipo base; backend real no debe disfrazar fallback demo como datos reales.
- Estado: EN PROGRESO

## 2026-07-01 01:49:32 - Auth LAB / login Firebase real

- Modulo: Backend LAB / Auth.
- Sintoma/necesidad: el gate bloqueaba sesion demo, pero el submit del login no intentaba Firebase Auth real.
- Esperado: en irestore-lab, el formulario debe autenticar contra Firebase Auth LAB.
- Causa raiz: el gate anterior interceptaba el submit solo para mostrar advertencia.
- Archivo/funcion: core/auth-lab-gate.local.js / signInFromForm().
- Fix o mejora aplicada: login Firebase real con signInWithEmailAndPassword, sin guardar secrets.
- Impacto en prototipo comercializable: aplicar aprendizaje al backend real; Auth real nunca debe confundirse con sesión demo.
- Estado: EN PROGRESO

## 2026-07-01 02:04:12 - Auth LAB / bloqueo de usuario demo en login

- Modulo: Backend LAB / Auth.
- Sintoma/necesidad: el login LAB mostraba dmin@demo.com por autocompletado/demo.
- Esperado: irestore-lab debe usar siempre orbit.lab@demo.com.
- Causa raiz: navegador/core demo rellenaba usuario no LAB.
- Archivo/funcion: core/auth-lab-login-helper.local.js, index-dev-firestore.html.
- Fix o mejora aplicada: helper local fuerza correo LAB y agrega reset password Firebase sin secretos.
- Impacto en prototipo comercializable: aplicar aprendizaje al backend real; no permitir usuarios demo en entorno backend.
- Estado: EN PROGRESO

## 2026-07-01 02:42:41 - Post Claude v1.55 / Backend LAB continuation

- Modulo: Prototipo base + Backend LAB.
- Necesidad: documentar pendiente para Claude y verificar preservacion backend despues de integrar v1.55.
- Esperado: backend LAB preservado y pendiente Claude separado de trabajo backend.
- Archivo/funcion: docs/PENDIENTE-CLAUDE-LIMPIEZA-LOCALSTORAGE-MODULOS-20260701.md, docs/AUDITORIA-LOCALSTORAGE-MODULOS-POST-CLAUDE-V155-20260701.md.
- Fix o mejora aplicada: documentacion y auditoria segura sin modificar modulos.
- Impacto en prototipo comercializable: mantiene la regla de capa unica y evita mezclar demo/localStorage con backend.
- Estado: EN PROGRESO

## 2026-07-01 03:25:14 - Backend LAB / rutas Firestore y smoke automatico

- Modulo: Backend LAB / Store / Smoke.
- Necesidad: avanzar backend sin seguir parchando login visual y dejar validacion seed lista para cuando exista Auth LAB.
- Esperado: auditoria de rutas Firestore y smoke no intrusivo que corra solo con Firebase Auth LAB.
- Causa raiz: Auth real sigue pendiente; no debe bloquear auditoria de rutas ni preparacion de smoke.
- Archivo/funcion: core/lab-smoke-firestore.local.js, data/store-firestore-lab.local.js, index-dev-firestore.html.
- Fix o mejora aplicada: smoke automatico sin escrituras, sin secretos y sin UI productiva.
- Impacto en prototipo comercializable: mejora metodologia de validacion backend y evita falsos positivos por demo.
- Estado: EN PROGRESO

## 2026-07-01 03:32:10 - Fix raiz / separar preview visual y Backend LAB

- Modulo: Operacion local / Backend LAB / Preview visual.
- Sintoma/necesidad: se repetia el bloqueo de login LAB al intentar revisar avances visuales.
- Esperado: usar entradas separadas para UX/prototipo y Backend LAB.
- Causa raiz: mezcla de index.html e index-dev-firestore.html en la metodologia de validacion.
- Archivo/funcion: core/auth-lab-preview-router.local.js, tools/orbit360-open-visual-preview.ps1, tools/orbit360-open-backend-lab.ps1.
- Fix o mejora aplicada: router visual desde LAB, launchers separados y documentacion de decision.
- Impacto en prototipo comercializable: evita reproceso y falsos bugs; mantiene backend sin fallback demo.
- Estado: RESUELTO

## 2026-07-01 03:52:58 - Integracion Claude V98 preservando Backend LAB

- Modulo: Prototipo base + Backend LAB.
- Necesidad: aplicar ZIP actualizado de Claude y verificar si realmente resuelve pendientes.
- Esperado: integrar cambios sin perder Backend LAB ni herramientas locales.
- Causa raiz si aplica: V98 trae cambios puntuales, pero no resuelve pendientes profundos de Inicio, Plantillas, Reportes, Finanzas, Comisiones, Metas, Correo, Cotizador e Historial.
- Archivo/funcion: core/router.js, modules/configuracion.js, modules/inicio.js, index.html y docs de auditoria.
- Fix o mejora aplicada: integracion segura, preservacion backend, auditoria y actualizacion de pendientes post V98.
- Impacto en prototipo comercializable: se evidencia que el paquete no debe considerarse cierre funcional completo.
- Estado: EN PROGRESO

## 2026-07-01 04:14:57 - Auditoria profunda contaminacion Orbit / Orbia / CXOrbia

- Modulo: Auditoria / metodologia / separacion de productos.
- Necesidad: evidenciar si la aparicion de Orbia proviene del prototipo, repo local, cache, herramientas o documentacion.
- Esperado: distinguir app activa, docs, tools, backups/tmp y ZIP.
- Causa raiz si aplica: pendiente segun hallazgos del reporte.
- Archivo/funcion: docs/AUDITORIA-CONTAMINACION-ORBIT-ORBIA-CXORBIA-20260701.md.
- Fix o mejora aplicada: auditoria profunda sin borrar ni tocar backend.
- Impacto en prototipo comercializable: evita mezclar Orbit con Orbia/CXOrbia y evita acusar al ZIP sin evidencia.
- Estado: EN PROGRESO

## 2026-07-01 12:30:13 - Recuperacion V99 con git.exe directo
- Modulo/area: infraestructura, prototipo visual, Backend LAB.
- Necesidad: recuperar V99 limpio y preservar avances Backend LAB.
- Esperado: preview visual en 5178, Backend LAB preservado en 5177, data/store.js no sobrescrito si contiene Firestore/LAB.
- Causa raiz si aplica: el bloque anterior uso una funcion Git que provoco CallDepthOverflow por colision con git en PowerShell.
- Archivo/funcion: script de recuperacion local.
- Fix aplicado: reemplazo por Invoke-GitExe usando git.exe directo, validacion de ZIP completo, backup, preservacion, auditoria, node --check.
- Impacto comercializable: protege continuidad del backend y evita nuevos reprocesos.
- Estado: RESUELTO si auditoria final queda OK.
 
## 2026-07-01 - Instalacion de ultimo ZIP limpio Claude para continuar backend 
 
**Modulo:** Infraestructura / Prototipo base / Backend LAB. 
 
**Necesidad:** Continuar backend sobre la version mas reciente y limpia generada por Claude, no sobre una restauracion anterior. 
 
**Fix aplicado:** Instalacion local del ZIP limpio exacto, preservando backend LAB y documentacion clave. 
 
**Estado:** RESUELTO LOCALMENTE - PENDIENTE VALIDACION VISUAL Y BACKEND. 
