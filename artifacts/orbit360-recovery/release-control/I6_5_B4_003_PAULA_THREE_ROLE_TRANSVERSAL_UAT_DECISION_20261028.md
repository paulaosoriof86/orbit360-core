# Gravicentra Insurance — matriz transversal de Paula y Carlos, 28-oct-2026

**Gate:** I6.5/B4-003 (continuidad, no gate nuevo). **Fuente:** Dirección Paula + lectura autenticada de Preview en Chrome. **Alcance de este registro:** pruebas READ-ONLY de Inicio y decisión de UAT; no hubo escrituras, despliegues ni datos alterados.

## Decisión congelada

1. Dirección exige UAT transversal con **dos identidades independientes**: Paula Osorio y Carlos Castro. Cambiar de rol dentro de un solo UID **no** constituye prueba multi-UID.
2. Paula tiene las **tres vistas confirmadas en UI**: Dirección, Operativo y Asesor. Carlos tiene **Operativo y Asesor** comprobados en pruebas previas. Los permisos efectivos del servidor se deben acreditar por UID, rol y país; no se presuponen solo por un selector visual.
3. Países a cubrir: Guatemala, Colombia y Todos los países cuando la cuenta esté autorizada. Las verificaciones compararán identidades y alcance, sin exigir números iguales a perfiles con permisos diferentes.
4. Los tests PASS históricos se conservan; cada caso nuevo debe comprobar carga final 5/5, relación con fuente canónica, pantalla/dato y resultado tras recarga. Las escrituras, cuando correspondan, únicamente sobre fixtures sintéticos previamente autorizados.
5. Priorización de salida: transporte lector protegido LIVE, Historial por rol/país, Cliente 360↔Cobros, Cronograma durable, Aseguradoras entitlement y smoke de roles/identidades. Otros flujos no acreditados siguen NOT TESTED, sin inventar PASS.
6. La excepción explícita de riesgo de Firestore vigente en Control Plane tras la decisión de Paula del 28-oct no se reabre como bloqueo de reglas; el hallazgo sigue abierto y su mitigación es P0 de postproducción.

## Readback autenticado actual — Preview LAB 40805562769

URL: https://ays-orbit-360-lab--gi-i65-b4-40805562769-e9si0n0l.web.app/

| Identidad visible | Rol en UI | País | Fuentes | Clientes | Pólizas | Cobros confirmados | Cartera vencida | Resultado |
|---|---|---|---|---:|---:|---|---|---|
| Paula Osorio | Operativo | GT | 5/5 | 420 | 1301 | Q 2,744; 5 pagos | Q 216K aprox.; 629 obligaciones/248 con monto | PASS lectura focal |
| Paula Osorio | Operativo | CO | 5/5 | 17 | 124 | COP 0; 0 pagos | COP 9.3M aprox.; 12 obligaciones/4 con monto | PASS lectura focal |
| Paula Osorio | Dirección | CO | 5/5 | 17 | 124 | COP 0; 0 pagos | COP 9.3M aprox.; 12 obligaciones/4 con monto | PASS lectura focal |
| Paula Osorio | Asesor | CO | 5/5 | 17 | 92 | COP 0; 0 pagos | COP 8.2M aprox.; 3 obligaciones/3 con monto | PASS lectura focal |
| Paula Osorio | Asesor | GT | 5/5 | 378 | 1153 | Q 2,306; 3 pagos | Q 164K aprox.; 556 obligaciones/217 con monto | PASS lectura focal |
| Paula Osorio | Dirección | GT/Todos | — | — | — | — | — | NO CERTIFICADO en este recorrido por interrupción de conexión |

**Observación:** valores abreviados de la interfaz no son conciliación contable exacta. No se registran nombres ni identificadores de terceros. La diferencia de alcance entre Asesor y Operativo es observación UI, no certificación de aislamiento backend. Un intento adicional de Dirección/GT quedó inconcluso al interrumpirse Chrome; no se declara FAIL de producto por ese incidente.

## Próximo movimiento

Una sola candidata acumulativa de funciones/Hosting; completar los casos de lectura transversales pendientes con las dos identidades reales, ejecutar pruebas controladas de persistencia sobre fixtures y promover únicamente con artefacto exacto y comprobaciones de LIVE. No reabrir decisiones ni repetir la matriz completa ya leída.

## Addendum técnico focal — pruebas de recuperación y transporte

Evidencia ejecutada localmente en árbol de fuente B4-003, fixtures sintéticos, sin Firebase externo ni escrituras reales. No equivale a UAT real ni a aprobación LIVE:

- `gravicentra-b4-003-role-context-recovery.test.cjs`: **2/2 grupos PASS**. Al cambiar rol, se invalida la caché previa; lectura prioritaria, reintento transitorio acotado, denegación no reintentada, sin fallback Firestore directo.
- `gravicentra-b4-003-operational-write-security-regression.test.cjs`: **30/30 PASS**. Incluye aseguradora del país autorizado permitida; país ajeno o faltante denegado. `releaseAccepted:false` declarado por el propio reporte; no es certificación LIVE.
- `gravicentra-b4-003-scoped-related-reader.test.cjs`: **PASS** en lector protegido, relaciones de historial, filtros de país/rol/tenant, páginas y cuatro colecciones; sin escritura externa.
- `gravicentra-b4-003-cronograma-durable-task.test.cjs`: **4/4 PASS** en simulación. La anterior incidencia de persistencia de Cronograma en Preview **no queda resuelta** por esta prueba local.

**Dependencia técnica aislada para corte LIVE:** el `functions/bootstrap.js` vigente no exporta `b4-003-scoped-policy-callable`. El empaquetador `tools/gravicentra-i6-1-preview-package.mjs` integra ambos nombres en artefacto efímero, pero el ejecutor autorizado despliega exclusivamente `orbit360ScopedPolicyReadPreview`. El frontend LIVE invoca `orbit360ScopedPolicyRead`, cuya disponibilidad en LIVE no está acreditada. Antes del corte se requiere una promoción específica del backend con lectura exacta de función; no basta transportar Hosting. **La excepción temporal de Firestore Rules aceptada por Paula permanece fuera de esta dependencia y no se reabre.**

**Cobertura pendiente:** Dirección/GT, selector Todos, autorización negativa real cruzando Paula/Carlos, ciclo operativo sintético de Cronograma, edición autorizada de Aseguradoras, y flujo LIVE con readback. El último reintento de Chrome fue interrumpido; no se registra como PASS/FAIL del producto.

## Decisión prevalente de dominio y continuidad operativa — Dirección, 28-oct-2026

**Congelado por Paula:** el dominio público y estable de Gravicentra Insurance será **https://app.aysseguros.com**. El equipo comenzará a crear y actualizar datos en la aplicación mientras continúan postproducción y Fase B. Las siguientes versiones **no pueden eliminar, reiniciar, reimportar ni sobrescribir** esos datos. El dominio Firebase `ays-orbit-360-lab.web.app` queda como identificador técnico del site; no debe anunciarse como URL oficial del equipo.

**Lectura pública previa, sin cambios:** el subdominio `app.aysseguros.com` ya resuelve a un registro A `107.161.178.166`, responde HTTP 200 y sirve el login heredado `Orbit 360 · Plataforma`, marcado `product-readonly`, con Last-Modified del 17-ago-2026. La zona del dominio usa NS `ns2738.dizinc.com` y `ns2739.dizinc.com`. Por tanto, **no es un subdominio vacío**: queda prohibido sobrescribir su `public_html` o modificar su DNS sin comprobar la propiedad efectiva de la zona, respaldo y plan de retorno.

**Arquitectura recomendada para ejecutar, aún no aplicada:** mantener la dirección y la gestión DNS en el hosting corporativo; conectar `app.aysseguros.com` como **custom domain del site Firebase Hosting** que recibe la promoción certificada de Gravicentra. La aplicación se sirve desde Firebase Hosting, mientras Firestore/Auth y los servicios backend continúan independientes. No hacer publicaciones manuales duplicadas al cPanel; un único pipeline con build reproducible y canales Preview/LIVE. Si la Dirección exige que los archivos residan físicamente en HostDime, esa alternativa requerirá decisión explícita adicional y un mecanismo de publicación automatizado equivalente; el dominio personalizado de Firebase es la vía preferida para evitar divergencia de versiones.

**Condiciones técnicas previas al cambio de tráfico:**
1. Respaldar los archivos y configuración actuales de `app.aysseguros.com`; registrar DNS A/CNAME/AAAA/TXT/CAA y TTL efectivos. No afectar `aysseguros.com`, correo ni otros subdominios.
2. Acreditar el paquete exacto del frontend y backend, incluido `orbit360ScopedPolicyRead` de LIVE, junto con UAT de Paula (tres roles) y Carlos (UID independiente), países GT/CO/Todos y pruebas de persistencia autorizadas. La excepción de Firestore Rules aceptada permanece P0 de postproducción, sin reabrirse como bloqueo de reglas.
3. Preparar el dominio en Firebase Hosting y verificar titularidad, certificado HTTPS, rutas SPA, archivos estáticos, Service Worker/cache, Firebase Auth Authorized Domains, configuración `authDomain`, redirecciones, CORS y enlaces de acceso; no presumir que el certificado o el dominio ya están conectados.
4. Elegir corte coordinado con rollback: conservar Hosting LIVE previo, verificar HTTPS y login en `app.aysseguros.com`, y solo entonces conmutar el registro DNS exacto según el asistente de Firebase. La propagación DNS/SSL no es instantánea. Mantener HostDime original disponible hasta terminar comprobación y período de retorno.
5. Publicaciones futuras: CI/CD limitado por objetivo (`hosting` o funciones nombradas), versionado y readback; **nunca un `firebase deploy` indiscriminado ni despliegues automáticos de Rules/IAM/Auth/datos**. No ejecutar scripts de semillas/importación/reimportación contra Firestore productiva durante una actualización de código.
6. Evolución de datos: esquema versionado, migraciones aditivas e idempotentes con respaldo verificable y reversión propia; prohibidas sustituciones de colecciones, regeneraciones de IDs y pérdida de relaciones, cobros, pólizas o histórico. Distinguir rollback de código (Hosting) de rollback de datos (requiere procedimiento específico). Auditoría de quién y cuándo modificó cada expediente.
7. Separar Preview/QA y LIVE: el equipo escribe únicamente en LIVE oficial una vez habilitado; pruebas sintéticas en entorno aislado. Comprobar que el frontend no usa `localStorage` como fuente maestra de registros de negocio y que las operaciones confirmadas son durables en backend.

**Movimiento técnico ya ejecutado sin LIVE:** commit de un solo workflow `5445fe1d4edab93371ad8e3788a9cfa906eb1060`, corrida GitHub `40815544529`, **SUCCESS**, despliegue de la función `orbit360ScopedPolicyReadPreview` en `us-east1`, readback HEAD 400 esperado, y prueba automática de bytes LIVE sin cambios. No publica `orbit360ScopedPolicyRead` ni cambia DNS, reglas, identidades o datos. La matriz de dos UID y los flujos de persistencia siguen pendientes; no atribuirles PASS.

**Regla de continuidad:** en todo informe distinguir (a) dominio final aprobado, (b) Hosting de producción y frontend efectivamente servido, (c) funciones backend efectivamente desplegadas, (d) base de datos real conservada y (e) pruebas pendientes. No volver a confundir Firebase Preview, Firebase LIVE y HostDime `app.aysseguros.com`.

**Precisión de aislamiento (obligatoria):** un canal de Firebase Hosting Preview por sí solo **no aísla Firestore ni Auth**: puede consultar el backend real del mismo proyecto. Hasta disponer de un Firebase project separado para QA o emuladores, la validación de Preview se limita a lecturas y fixtures sintéticos expresamente acotados, con comprobación previa del tenant/proyecto y sin escrituras sobre expedientes reales. No describir una Preview de Hosting como «base de datos de pruebas aislada». Los respaldos/PITR de Firestore requieren configuración y eventual coste propios; no asumirlos habilitados. Esta precisión protege la operación activa del equipo y no reabre la excepción específica de Rules ya aceptada.


## Addendum prevalente de ejecución autenticada — 28-oct, continuación nocturna

Este addendum **supersede las filas históricas de Dirección GT/Todos marcadas NO CERTIFICADO** sin borrar el checkpoint anterior. Se ejecutó en Chrome mediante la cuenta autenticada de Paula sobre la Preview LAB `gi-i65-b4-40805562769-e9si0n0l`, sin escrituras y con espera a la carga final; no equivale a pruebas de Carlos ni a LIVE.

| Paula rol | País | Inicio fuentes | Clientes | Pólizas | Cobros confirmados | Cartera vencida | Cobros filas | Historial visible |
|---|---|---|---:|---:|---|---|---:|---|
| Dirección | TODOS | 5/5 PASS | 434 | 1425 | — | — | — | no medido en Todos |
| Dirección | GT | 5/5 PASS | 420 | 1301 | Q 2,744 / 5 pagos | Q 215,658 aprox. | 2514 | 35 |
| Dirección | CO | 5/5 PASS | 17 | 124 | COP 0 / 0 pagos | COP 9,262,532 | 46 | 35 |
| Operativo | GT | 5/5 PASS (previo) | 420 | 1301 | Q 2,744 / 5 pagos | Q 215,658 aprox. | 2514 | no medido |
| Operativo | CO | 5/5 PASS (previo) | 17 | 124 | COP 0 / 0 pagos | COP 9,262,532 | 46 | 35 |
| Asesor | GT | 5/5 PASS (previo) | 378 | 1153 | Q 2,306 / 3 pagos | Q 164,377 aprox. | 2161 | 24 |
| Asesor | CO | 5/5 PASS (previo) | 17 | 92 | COP 0 / 0 pagos | COP 8,221,630 | 15 | 24 |

- **PASS focal Cobros**: Operativo y Dirección exponen igual universo; Asesor reduce alcance; no se hace conversión GTQ↔COP ni se interpreta origen SIGA como pago confirmado. El listado pasa por una fase transitoria de métricas en carga y se certificó solo tras estabilizarse.
- **PASS focal Cliente 360, Dirección CO**: 17 clientes listados; 9 pólizas vigentes de 76 relacionadas con clientes, COP 73,920,141 de prima neta vigente mostrada. No comparar directamente esos denominadores con las 124 pólizas globales de Inicio sin validar semántica.
- **HALLAZGO Historial por país, confirmado en UI previo a corrección**: Dirección CO→GT conservó 35 interacciones; Asesor CO→GT conservó 24, con entradas de contexto GT en vista CO. En la fuente, Historial no filtraba el país elegido, mientras el scope concedido de la persona abarcaba ambos países. Esto es una falla de segmentación visual; la autorización de servidor y el origen exacto de cada evento requieren readback separado.
- **CORRECCIÓN SOURCE-ONLY publicada**: `3043a825a60e33b33847bcf2faa8daa7cc04a39b` introduce filtro por país elegido, país canónico de póliza antes que domicilio del cliente y protección del detalle; `5441f8d510b937ef0a9ebe46a4485d93cc3c142e` agrega prueba de regresión GT/CO/TODOS. Test nuevo, `node --check`, tests de contexto de rol y lector protegido PASS; bytes fuente/remoto equivalentes. **La UI corregida aún no es PASS** hasta Preview nueva, Chrome y readback.
- **Preview preparado, no acreditado como desplegado hasta SUCCESS/readback**: workflow nuevo `650db2fd26178b5059dc8a0398fd01f8bedfb15f` exclusivamente Hosting Preview LAB por siete días, sin funciones LIVE, reglas, IAM, Auth, DNS ni escrituras.
- **Revisión de datos no confundible con falla**: Cobros GT advierte cuatro filas con estado vencido en COP sin contraparte en Cartera Primas del alcance; una fila de Cobros CO tiene etiqueta de cliente domiciliado GT. Verificar relaciones por póliza, país canónico y origen SIGA antes de reclasificar o modificar nada.
- **Pendiente de certificación**: Carlos como segundo UID real (Operativo/Asesor); prueba sintética durable de Cronograma y edición de Aseguradoras; flujo Cliente360→Historial→Cobros en Preview corregida; `orbit360ScopedPolicyRead` en LIVE; backup/PITR verificable; dominio HTTPS `app.aysseguros.com` sin corte todavía. La excepción Firestore Rules aceptada por Paula **permanece congelada como P0 postproducción, no bloqueo por sí sola**. El personal no debe usar la versión antigua de HostDime para crear expedientes que después quedarían en otro origen.


### Resultado posterior del canal Historial por país

- Commit del ejecutor corregido: `29a29da69345ffc50f5af423dca48b475a50da3f`. GitHub Actions **#40818161842 SUCCESS**; pruebas sintéticas y regresiones PASS, empaquetado canónico confirmado, nuevo Hosting Preview servido con archivo `modules/historial.js` byte-a-byte idéntico al blob `7dfef4b69a9dafffafde5f6f627f81ad27a33c37`; Hosting LIVE conservó bytes antes/después.
- Preview nueva de siete días: https://ays-orbit-360-lab--gi-i65-hco-40818161842-j7k7r4ll.web.app/ . **No se desplegaron** funciones LIVE, Firestore Rules, Auth, IAM, DNS o datos. La primera corrida #40818000285 falló antes de publicación por ausencia de variables de gate, corregida en la corrida SUCCESS; no hubo publicación parcial.
- **UI autenticada corregida aún NO CERTIFICADA**: en el nuevo origen el navegador presenta formulario de inicio de sesión, sin heredar sesión Firebase de la Preview anterior. Es necesaria autenticación legítima en esa URL y readback GT/CO/TODOS; no copiar tokens ni interpretar CI como PASS del flujo real. Mantener la sesión de Paula en la Preview antigua sin cerrarla.


## Addendum de cierre causal y UAT transversal real — 28-oct-2026, 22:45–23:00 GT (PREVALENTE)

**Causa del falso rechazo de ingreso en la nueva Preview**: el canal `gi-i65-hco-40818161842-j7k7r4ll` no cumple la lista de hosts protegidos `^ays-orbit-360-lab--gi-i65-b4-` implementada por `core/product-runtime-browser-providers-p0.js`, `core/product-app-p0.js` y `core/auth-product-runtime-p0.js`. El proveedor rechaza con `PROTECTED_READ_HOST_DENIED` **antes** de invocar la verificación de credenciales; la interfaz transforma ese rechazo en «No fue posible iniciar sesión». Las capturas del usuario no prueban contraseña incorrecta. Se verificó en Equipo que `finanzasyadmin@aysseguros.com` es Paula: activo, correo verificado, SuperAdmin/Operativo/Asesor, GT+CO. Configuración pública de ambos artefactos apunta al mismo Firebase `ays-orbit-360-lab`. Este diagnóstico reemplaza cualquier hipótesis anterior de correo inexistente o clave errónea.

**Decisión de canal congelada (anti-regresión)**: mientras subsistan esos guards, TODOS los nuevos canales de Preview I6.5/B4-003 deben usar prefijo `gi-i65-b4-`. No reutilizar `gi-i65-hco-` ni pedir reintentos de contraseña sobre él. No retirar controles de host, no copiar tokens ni abrir lecturas Firestore directas. El canal con prefijo incorrecto queda como evidencia técnica, **no apto para UAT**, hasta su expiración.

**Acción material**: Workflow Hosting-only exacto, commit `42d1ffe54f3efc564c30f8f989a3c652ff687cc6`, GitHub Actions [#40819377347](https://github.com/paulaosoriof86/orbit360-core/actions/runs/40819377347) **SUCCESS**; re-publicó en el mismo canal previamente autenticado `gi-i65-b4-40805562769` y obtuvo el mismo URL `https://ays-orbit-360-lab--gi-i65-b4-40805562769-e9si0n0l.web.app/`. El preflight comprobó existencia de la versión anterior; las pruebas y readback del Historial nuevo pasaron, y el Hosting LIVE mantuvo hashes idénticos antes/después. No se desplegaron funciones, Firestore Rules, Auth, IAM, DNS ni migraciones; cero escrituras de negocio.

**UAT interactiva Chrome sobre el artefacto nuevo y el mismo UID autenticado de Paula**, esperando a confirmar la carga por rol:

| Rol activo de Paula | TODOS | GT | CO | Conciliación |
|---|---:|---:|---:|---|
| Dirección/SuperAdmin | 35 | 23 | 12 | 23+12=35 PASS |
| Operativo | 35 | 23 | 12 | 23+12=35 PASS |
| Asesor | 24 | 17 | 7 | 17+7=24 PASS |

- El selector país segmenta ahora Historial en tres roles; no se volvió a reproducir el error anterior de 35/35 o 24/24 en GT/CO. En Asesor, el subconjunto autorizado del rol es menor que Dirección/Operativo, como corresponde. Todas las cifras son de la fuente actual leída en Preview, **no prueba de identidad Carlos**.
- Interacción de detalle CO abierta correctamente bajo Asesor CO; se cerró sin escritura. UI de Dirección/TODOS restaurada después.
- En un cambio rápido inicial de rol y país, la pantalla mostró un estado legítimo de «Consultando historial autorizado» (no se certificó falso cero); tras esperar hidratación y recargar, Operativo CO confirmó 5/5 en Inicio y 12 en Historial. Mantener una espera al estado confirmado como regla de QA; no hacer varios cambios de contexto en cascada mientras hidrata.

**Certificación de este frente**: `HISTORIAL_COUNTRY_SELECTOR_REAL_UAT = PASS (Paula 3 roles × GT/CO/TODOS)`. Conserva como pendientes independientes, NO certificados: Carlos UID real; pruebas de escritura sintética con durabilidad en Cronograma/Aseguradoras; flujo end-to-end Cliente360→Historial→Cobros y regresiones del resto de módulos sobre la misma candidata; backend protegido LIVE y respaldo/PITR; corte y SSL real de `app.aysseguros.com`. La aceptación de Paula de reglas amplias sigue congelada como riesgo específico temporal y endurecimiento **P0 postproducción**; no se reabre ese debate ni se convierte en falso PASS de los otros gates.


### Dependencia real del dominio de Paula y parche SOURCE-ONLY congelado

- **Origen final obligatorio**: `https://app.aysseguros.com`, document root histórico de HostDime `/home/ayssegur/public_html/app.aysseguros.com`. Chrome confirmó que el dominio todavía sirve la interfaz antigua **Orbit360°**, no la candidata nueva Gravicentra Insurance. Firebase Hosting Preview es entorno de pruebas, no se sustituye silenciosamente el dominio solicitado.
- El mismo guard protegido que había rechazado `gi-i65-hco-` también habría rechazado `app.aysseguros.com` al publicar sin parche. Quedó corregido en **SOURCE-ONLY**, rama única, mediante commits secuenciales `750c060b1c828dec3b0e1dde79ddc4cc9a14f522` (selector de transportes), `5a3d790c854e54afc66a7541649a48a39d7d6437` (activación app) y `55ef080917a71e7a3a9121b3fcac2da67f4ba200` (regresión de hosts exactos). Todos los blobs publicados coinciden byte-a-byte con fuente local ensayada.
- Contrato probado: `app.aysseguros.com` exacto → lector protegido `orbit360ScopedPolicyRead` LIVE; hosts falsificados, subdominios no autorizados y canal `gi-i65-hco-` → `PROTECTED_READ_HOST_DENIED`; no degradación a lectura Firestore directa. Pruebas `dual-host-protected-transport`, `protected-hydration`, `historial-country-selection` y verificaciones de sintaxis **PASS**. **No desplegado** a Preview nueva, Firebase LIVE ni HostDime.
- **Migración operativa segura, pendiente antes del corte**: preservar el backend único y sus datos; tomar y verificar respaldo recuperable de datos, más copia recuperable del sitio HostDime actual; preparar paquete exacto en staging versionado, comprobar integridad de archivos y conectividad por dominio; mover exclusivamente contenido estático del front-end en una ventana controlada con rollback. Un deploy posterior del front-end **no debe resetear Firestore, cargar seeds de QA ni sobrescribir datos ingresados por el equipo**. El transporte concreto (FTPES/SFTP/cPanel con capacidad real comprobada) queda por verificar; no presumir éxito ni automatización por existir un workflow de otro proyecto.
- El backend de lectura protegida LIVE `orbit360ScopedPolicyRead` sigue reportado como ausente en verificación histórica (HTTP 404), y backup/PITR, pruebas sintéticas de escritura durable, Carlos UID real y certificar cortes de sesión/roles/país no están cerrados. La aceptación temporal de Rules no subsana estos puntos. **Producción de Gravicentra no acreditada todavía**; no invitar al equipo a editar en el antiguo Orbit360 de HostDime.

- **Readback posterior en Chrome (28-oct noche, sin autenticación ni escrituras)**: GET público de `https://us-east1-ays-orbit-360-lab.cloudfunctions.net/orbit360ScopedPolicyRead` mostró «Error: Page not found»; el equivalente `orbit360ScopedPolicyReadPreview` devolvió `INVALID_ARGUMENT` al GET no válido, lo cual confirma existencia de Preview, no funcionalidad autenticada de LIVE. El bloqueo de función LIVE permanece verificado, distinto de la excepción temporal de Rules. No se cambió backend.


## Addendum: preflight de recuperación y lector LIVE (28-oct-2026 GT)

**Naturaleza:** comprobación READ-ONLY en Firebase/Google Cloud Console, proyecto exacto `ays-orbit-360-lab`, base Firestore `(default)`, tenant `alianzas-soluciones`; no se habilitó configuración, no se inició exportación, no se desplegaron funciones ni se alteró HostDime/LIVE/datos.

1. **Recuperación ante desastres — confirmado en UI:** PITR `Inhabilitada` (checkbox/interruptor desmarcado); copias de seguridad programadas `Inhabilitada` (sin diaria ni semanal); tabla de backups `No hay filas para mostrar`. URL de comprobación: `https://console.cloud.google.com/firestore/databases/-default-/disaster-recovery?authuser=0&project=ays-orbit-360-lab`.
2. **Importaciones/exportaciones — confirmado:** tabla de operaciones `No has movido datos recientemente`. La consola admite exportación de base completa del estado actual, pero exige bucket GCS y factura lecturas; no se inició. Sólo aparecen buckets de código Cloud Functions y `gravicentra-insurance-assets-60e88ed5a1`; ninguno está acreditado como destino privado de backup ni se reutiliza sin verificar IAM/retención/ubicación. URL: `https://console.cloud.google.com/firestore/databases/-default-/import-export?authuser=0&project=ays-orbit-360-lab`.
3. **Functions — confirmado en UI:** 77 funciones listadas al ampliar paginación 100; presente `orbit360ScopedPolicyReadPreview` v2 `us-east1`; ausente `orbit360ScopedPolicyRead` LIVE. Coincide con HTTP GET previo de LIVE `Page not found` y con la exclusión expresa en el executor Preview. El `functions/bootstrap.js` de fuente no incorpora el export B4-003; el empaquetador Preview sólo lo integra en artefacto efímero y despliega el nombre Preview. URL: `https://console.firebase.google.com/u/0/project/ays-orbit-360-lab/functions`.
4. **Regresiones locales (sin datos externos):** `gravicentra-b4-003-scoped-policy-reader.test.cjs` PASS (21 checks), `gravicentra-b4-003-scoped-related-reader.test.cjs` PASS, `gravicentra-b4-003-scoped-boundary.test.cjs` PASS (incluidas regresiones enlazadas 12/12), `gravicentra-b4-003-dual-host-protected-transport.test.cjs` PASS, `gravicentra-b4-003-role-context-recovery.test.cjs` PASS y `gravicentra-b4-003-security-release-barrier.test.cjs` PASS de contrato; la última reconoce que las reglas efectivas siguen inseguras. El primer intento de `scoped-boundary` sufrió `EPERM spawnSync` por aislamiento de ejecución, NO falla de producto; reejecución autorizada sin bloqueo terminó exit 0.
5. **Copia histórica distinta:** el Control Plane registra un snapshot cifrado de septiembre con `runId 35390568668`; su antigüedad/retención y capacidad de recuperación del estado actual no están acreditadas. No equivale al backup antes del corte.
6. **Acción mínima siguiente y su frontera:** habilitar PITR y copias programadas, preparar una exportación íntegra a bucket privado con IAM y retención verificadas, acreditar completitud y restaurabilidad; después preparar/promover *sólo* el callable `orbit360ScopedPolicyRead` desde fuente y artefacto exactos, comprobar `functions:list`, denegaciones por rol/país y readback autenticado LIVE sin mutaciones. Cualquier cambio de configuración con costos, creación de bucket, despliegue de callable o corte en `app.aysseguros.com` exige autorización específica en el movimiento material correspondiente. Ninguno fue realizado aquí.
7. **Protección del equipo en Fase A/Postproducción/B:** frontend versionado, datos persistentes en Firestore fuera del paquete, sin importación/seed/reemplazo destructivo, publicación por staging y rollback de código; no habilitar ingreso operativo hasta comprobar corte y recuperación. La excepción de Rules aceptada por Paula permanece congelada como P0 postproducción, sin marcar seguridad certificada.

**Estado:** `PREPARED / BACKUP-NOT-READY / LIVE-READER-MISSING / HOSTDIME-UNCHANGED / PRODUCTION-NO-GO`. No revocar avances UAT previos ni declarar PASS de Carlos independiente o de escrituras durables que no se ejecutaron.


## Addendum PREVALENTE — reconciliación integral del plan de choque y pruebas (28-oct-2026 GT, posterior al preflight)

**Finalidad:** corregir el desfase de lectura del expediente sin reiniciar el recovery, modificar los gates históricos ni inventar certificaciones. Este addendum es el **estado prevalente** respecto de los apartados anteriores que dicen «PITR inhabilitada», «backup no listo» o «lector LIVE ausente»: esos fueron hechos verdaderos en el momento del *preflight* y **dejaron de describir el estado posterior**. Se conserva su evidencia intacta para auditoría. Fuente de ejecución: commit `8f2848077589bc8fa633917886e2cbbc33c96b36` de la rama única y workflow de lectura protegida LIVE [#40822620839](https://github.com/paulaosoriof86/orbit360-core/actions/runs/40822620839), `SUCCESS`.

### 1. Autoridades y decisión congelada que manda

1. Gate activo único: **I6.5/B4-003**. Secuencia posterior única: **B4-004 → B4-005 → B4-006 → B4-007 → I6.6 → I6.7 → I6.8 → I6.9**, según `I6_PENDING_CLOSURE_MASTER_PLAN_LOCK_20261004.json`. No abrir gates, ramas, planes de ejecución paralelos ni reimportar los registros históricos.
2. La aceptación expresa de Paula en `I6_5_B4_003_PAULA_OWNER_TEMPORARY_FIRESTORE_RISK_ACCEPTANCE_20261028.md` y `CONTROL_PLANE.b4003OwnerTemporaryRulesRiskException20261028` **prevalece** sobre las condiciones históricas incompatibles de `b4003SecurityReleaseHold.requiredExit`: **las mismas reglas Firestore amplias, por sí solas, NO impiden la salida LIVE controlada**. Su hallazgo sigue `OPEN/NOT PASS`, el riesgo fue aceptado temporalmente y el endurecimiento es **P0 URGENTE POSTPRODUCCIÓN**, antes de ampliar accesos a nuevas personas o tenants. Prohibido confundir `OWNER_RISK_ACCEPTED` con `SECURITY_PASS`.
3. La excepción **no** convierte en PASS pruebas funcionales, autorizaciones reales, aislamiento del lector, rutas de dinero, durabilidad, corte ni rollback. No autoriza desplegar Rules, cambiar Auth/IAM, hacer cambios de datos, ni promover automáticamente Hosting LIVE o HostDime. Otros hallazgos nuevos o independientes se tramitan según su evidencia, no por la regla ya aceptada.
4. `I0, I1, I2, I3, I4A, I4B, I5` están formalmente sellados `7/7 = 100%` en su expediente; **I6.0–I6.4** son los cinco minigates congelados de diez: el **50% formal I6** no es porcentaje de funciones ni de pruebas UAT actuales. B4-004 a B4-007 son los gates **pre-LIVE inicial**; I6.6–I6.9 continúan **tras** ese corte según la secuencia congelada, sin encubrir dependencias causales previas.

### 2. Avances posteriores al preflight anterior: estado vigente

| Frente | Evidencia verificada | Estado correcto y límite de la prueba |
| --- | --- | --- |
| Historial auténtico, Paula 3 roles × GT/CO/TODOS | Mismo canal LAB `gi-i65-b4-40805562769`, workflow `40819377347` SUCCESS; Dirección `35/23/12`, Operativo `35/23/12`, Asesor `24/17/7` | **PASS visual autenticado** de filtro de país, sin repetirlo mientras la candidata no altere ese flujo; no prueba al UID de Carlos |
| Hidratación y vistas de Paula | La UAT anterior acredita `5/5` en los roles/países observados y las filas GT/CO/Todos de Dirección posteriormente recuperadas | **PASS de lectura focal**; no es prueba de escritura o conciliación financiera completa |
| Firestore PITR / calendario de backups | Consola del proyecto `ays-orbit-360-lab`, `(default)`: PITR 7 días; copia diaria retención 7 días y semanal domingos UTC retención 28 días, habilitadas posteriormente | **CONFIGURADO Y OBSERVADO**; no afirmar que ya se disparó la primera copia programada ni que se ejecutó restauración |
| Exportación integral privada | Bucket privado `ays-orbit360-firestore-private-backup-646761409743`, operación `2026-10-29T05:13:28_17344` UTC observada `Disponible/Completada`; **21,290 documentos, ~27.76 MB**, metadata y namespaces presentes | **BACKUP EXPORT COMPLETED**; una restauración real y su RTO/RPO siguen **NOT PROVEN**. No usar la exportación como autorización para importar |
| Lector protegido LIVE | Función v2 `orbit360ScopedPolicyRead`, `us-east1`, desplegada con fuente `8f284807`, workflow [#40822620839](https://github.com/paulaosoriof86/orbit360-core/actions/runs/40822620839) `SUCCESS`; POST anónimo sin token volvió a dar HTTP **401** en comprobación posterior | **DEPLOYED / DENEGACIÓN ANÓNIMA PASS**; **UAT autenticada entre UIDs, roles y países aún pendiente**. El HTTP 404 del preflight anterior fue superado |
| Transporte de frontend protegido | `product-app-p0.js`, `product-runtime-browser-providers-p0.js` y `store-firestore-product-readonly-p0.js` implementan ruta protegida condicionada por host y bandera; dual-host exacto `app.aysseguros.com` tiene regresión local PASS | **INTEGRACIÓN SOURCE EXISTE**; falta certificar el paquete servido exacto, configuración activa, inicio de sesión y flujo real; el simple hallazgo de métodos Firestore legacy inactivos por *scanner* no prueba una regresión en la ruta protegida |
| Hosting LIVE y dominio de Paula | El frontend de `app.aysseguros.com` continuaba siendo el antiguo Orbit360 al último readback documentado; no se modificó HostDime ni DNS en este movimiento | **NO PUBLICADO**; staging, respaldo del sitio antiguo, conexión FTPES/SFTP/cPanel, TLS/Auth origins, corte atómico y reversión pendientes |

### 3. Pruebas efectivamente ejecutadas y sus límites

- **PASS de código/simulación sobre HEAD exacto `8f284807` (28-oct GT / 29-oct UTC):** role-context-recovery; scoped-policy-reader (21); scoped-related-reader (paginación, tenant/rol/país); uat5-display-contract (20); c360-cobros-currency-overdue (26); cronograma-durable-task **4/4 SIMULADO**; operational-write-security-regression **30/30 SIMULADO** (`releaseAccepted:false`); protected-hydration; historial-country-selection; dual-host-protected-transport; inicio-role-country-team (19); role-first-paint-and-team-regression (120); ops-leads-role-scopes; cobros-q683-filter-parity (33); cartera-bridge-policy-country (14); insurer-readiness-facade-bridge. Son regresiones útiles, **NO** UAT de persistencia real ni certificación del LIVE.
- **`security-release-barrier.test.cjs`:** PASS del contrato de prueba que detecta Rules aún amplias. **No equivale** a `SECURITY_PASS`; la decisión de Paula impide que estas mismas Rules por sí solas vuelvan a bloquear el LIVE controlado.
- **`secure-hydration-release-check.cjs`:** sigue emitiendo `B4_003_RELEASE_READINESS=BLOCKED` por criterios estáticos anteriores (módulos de compatibilidad legacy, export inmutable en bootstrap, Rules candidatas, flags históricos). **No está reconciliado con la excepción explícita de Dirección ni con el despliegue LIVE efímero ya verificado**. Su señal conserva valor como alerta técnica por revisar, pero **no es dictamen ejecutivo ni justificación suficiente para reabrir la misma excepción**. Corregir/verificar el criterio de empaquetado al certificar el artefacto final, sin desactivar pruebas de denegación.
- **No contados como fallas de producto:** auditoría `one-pass-readonly-integrity` no ejecutada por dependencia local `firebase-admin/app`; `country-finance-parity` requirió historia Git más profunda. No inventar ejecución/PASS ni convertir errores del entorno de QA en fallas de negocio.
- **No repetir:** UAT auténtica de Paula en Historial `35=23+12`, `35=23+12`, `24=17+7`, ni gates históricamente sellados, a menos que una modificación posterior toque causalmente esos módulos.

### 4. Plan de choque ejecutivo: salidas de cada gate y pruebas que realmente faltan

| Orden | Gate congelado | Resultado exigido para poder pasar | Estado de cierre |
| --- | --- | --- | --- |
| 1 | **B4-003**, actual | En el **mismo paquete LAB**: Carlos como segundo UID independiente en roles Operativo/Asesor y países GT/CO/TODOS según permisos; pruebas negativas cross-UID/rol/país; origen canónico de filas y monedas Cobros GT/CO; `Cliente 360 → Historial → Cobros` con reload; **Cronograma create/reload** y **Aseguradoras edit/reload** con fixtures sintéticos autorizados; smoke de sesión/roles y regresión de módulos afectados; cotejo exacto fuente→artefacto→Preview | **ABIERTO**, con grandes avances parciales PASS preservados |
| 2 | **B4-004 Siniestros/Cronograma** | Regression dirigida funcional, persistencia y visual sobre Siniestros y Cronograma con `0` errores relevantes, sin reabrir PASS anteriores | **PENDIENTE** |
| 3 | **B4-005 E2E integral Fase A** | Matriz módulo×rol×país×viewport con relaciones y recibos reales; Endosos/Certificados/Anexos, gestión de emisión, Documentos/Drive, Renovaciones/Upsells, Calidad, Aseguradoras/tarifas, cotizador/comparativo según autoridad aprobada; todas las incidencias P0 pre-LIVE con disposición explícita en ledger/carry | **PENDIENTE** |
| 4 | **B4-006 aceptación de Paula** | Una sola Preview exacta acumulativa, QA visual focal y aprobación de Dirección sin repetir PASS no afectados | **PENDIENTE** |
| 5 | **B4-007 SAME-ARTIFACT LIVE** | Frontend **inmutable** aprobado + backend certificado, backup y respaldo estático, SSL/Auth origins, staging versionado, corte a `https://app.aysseguros.com`, readback, smoke de identidades y reversión lista; cero reimportaciones de Firestore | **PENDIENTE; NO-GO aún** |
| 6–9 | **I6.6, I6.7, I6.8, I6.9** | Cobros/Conciliación; Comisiones; Historial/Academia/habilitación gradual; aceptación postproducción integral | **POSTERIORES al LIVE inicial**, sin omitirlos |

**Anomalías a resolver antes de acreditar B4-003:** Cobros GT mostró cuatro filas vencidas con moneda COP ausentes de la cartera consolidada; Cobros CO expuso un rótulo de cliente GT. Comprobar país canónico de póliza y procedencia del movimiento sin reclasificar por el nombre del cliente ni convertir monedas. La ausencia de pagos en CO no demuestra por sí sola error o completitud. Los conteos `295/166/117` del ledger son **corte histórico de 12-oct**: no volverlos porcentaje o número vigente de defectos bloqueantes sin reconciliación de IDs.

### 5. Reglas operativas de anti-regresión y siguiente movimiento único

1. **No pedir nuevamente permiso para «aceptar Rules»**. Está concedido y asentado. El riesgo P0 postproducción sigue visible. Sólo plantear una nueva decisión a Paula si aparece un **riesgo distinto**, incumplimiento real de autorización del lector o cambio material de alcance.
2. **No declarar pruebas ejecutadas sin sesión/UID, rol, país, fuente, artefacto, persistencia y readback**. Distinguir siempre `PASS local simulado`, `PASS UAT autenticado`, `PASS LIVE`, `NO TESTED` y `HOLD`.
3. **Una sola candidata acumulativa**: asegurar que la bandera de lectura protegida esté activa en el paquete `gi-i65-b4-` real y que no exista fallback a Firestore directo en el flujo protegido; ejecutar Carlos y flujos focales pendientes; registrar resultados en las autoridades ya existentes. No abrir planes de choque nuevos ni volverse a detener en el diagnóstico de Rules aceptadas.
4. Después cerrar **B4-004 → B4-005 → B4-006 → B4-007** en ese orden. La aceleración proviene de ejecutar una matriz focal única y reutilizar PASS históricos, no de omitir comprobaciones de negocio ni fabricar un GO.

**Dictamen vigente:** `OWNER_RULES_RISK_ACCEPTED / BACKUP_EXPORT_COMPLETE / LIVE_PROTECTED_READER_DEPLOYED / PAULA_HISTORIAL_ROLE_COUNTRY_UAT_PASS / CARLOS_MULTI_UID_AND_DURABLE_UAT_PENDING / B4-003_OPEN / PRELIVE_GATES_PENDING / HOSTDIME_UNCHANGED / PRODUCTION_NO_GO`. Este dictamen reemplaza el estado de disponibilidad del preflight anterior, no borra la prueba ni autoriza una nueva promoción LIVE por sí mismo.
