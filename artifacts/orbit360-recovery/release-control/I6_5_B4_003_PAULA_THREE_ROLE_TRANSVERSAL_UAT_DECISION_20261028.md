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
