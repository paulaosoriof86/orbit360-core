# Gravicentra Insurance — I6.5/B4-003 | Delta verificable de la candidata única

**Corte:** 29 de octubre de 2026, Guatemala. **Autoridad:** congelamiento de Dirección y continuidad incremental dentro del Control Plane existente. **No abre otro gate, rama, candidata lógica ni permiso de producción.** Se aplica en conjunto con `I6_5_B4_003_PLAN_CHOQUE_LINEAGE_CI_UAT_FREEZE_20261029.md`, sin reemplazar sus decisiones ni los 15 linajes aprobados, 295 hallazgos y 86 tareas.

## 1. Material publicado y vinculado a la misma candidata

| Hito | Fuente exacta / evidencia | Estado acreditado |
| --- | --- | --- |
| Predecesora con UAT parcial de Paula | `a63a7af5eb066bc87f94131e7b981741b29e4afc`, Preview `gi-i65-b4-a63a7af5-40889172816` | Histórico preservado; 0/15 capacidades con aceptación integral actual |
| Corrección acumulativa de dos módulos | `cee34a50a2bc65b4162798348725a8657ed2d6fe`; `insights.js` blob `b6c90e3c`; `plantillas.js` blob `702c90d4`; test blob `839a82a7` | Pruebas sintéticas PASS; sin LIVE ni escritura operativa |
| Reconciliación del guard sin reescribir el lock de 114 fuentes | `1f2d6e2a489ddf988f6fa6fb7a65464027d64b3e`; recibo `I6_5_B4_003_INSIGHTS_PLANTILLAS_SAFEREAD_SUCCESSOR_20261029.json` | Guard local PASS; Control Plane Guard run `40909117303` SUCCESS |
| Transporte Hosting-only a la nueva Preview | `5ec0bf8c22e6c5b08b876c73220e90b56c9d71e8`, run `40909475540` SUCCESS; Guard run `40909475386` SUCCESS | Build, archivo servido y LIVE sin cambios PASS |
| Preview para UAT | `https://ays-orbit-360-lab--gi-i65-b4-sr-40909475540-l24fpt16.web.app/` | Acceso HTTP 200, `build.json` y hashes HTTP de ambos módulos confirmados; **UAT autenticada de esta URL pendiente** |

El cambio correcto de los dos módulos está publicado y transportado. Esto **no** equivale a aceptación de su UI o de todas sus acciones. La versión de UAT histórica `a63a7af5` permanece asociada a sus evidencias previas. El nuevo sucesor `5ec0bf8c` es el corte técnico vigente de la **misma** línea canónica.

## 2. Pruebas y cobertura — sin inflar avances

- `45` archivos de regresión B4-003 ejecutados localmente en forma aislada, con `60` pruebas PASS, `0` FAIL y `0` canceladas; se excluyó explícitamente `gravicentra-b4-003-firestore-emulator.test.cjs`. Comprenden contrato de roles, Inicio, Cliente 360, Pólizas, Cobros/cartera, Renovaciones, historial, Cronograma, Ops/Leads, aseguradoras, Portal y seguridad. Son **pruebas de código/simuladas**, no UAT multiusuario.
- Control Plane Guard con historial íntegro: PASS local sobre sucesor, PASS CI en `1f2d6e2a`, PASS CI sobre el build `5ec0bf8c`.
- Pipeline Preview: SUCCESS; compara el bundle y el origen servido, observa las raíces LIVE antes y después, y no invoca Functions, Rules ni alteración de Auth/IAM o datos.
- Readback HTTP independiente: `/__recovery__/build.json` reporta exactamente `5ec0bf8c`; `/modules/insights.js` SHA de blob `b6c90e3caa9c86c27f36f95e6aea2aee28aae975`; `/modules/plantillas.js` SHA `702c90d4c655013fc168430cb44a48aab7bdfcd0`.
- Browser conectado: detecta la pestaña nueva; el control Chrome devuelve `DataCloneError` al reclamarla y una lectura previa produjo `Runtime.evaluate timeout`. **No registrar nuevos PASS de navegación o persistencia sobre esta Preview**. No se ha usado navegador sustituto ni suplantado UIDs.

## 3. Estado de las dos correcciones y causa original

| Módulo | Regresión causal acreditada | Corrección actual | Qué NO está cerrado |
| --- | --- | --- | --- |
| **Insights** | País GT por defecto para cliente inexistente y país tomado del cliente para pólizas; rutas de detalle sin filtro efectivo | País de póliza, padre financiero validado, filas huérfanas/contradictorias en cuarentena, desgloses año/mes/renovaciones bajo país/rol. Prueba GT/CO/TODOS sintética PASS | Confrontar las cifras reales GT/CO con fuente, moneda COP/GTQ y selector; UAT de detalles, exportes, rol asesor y recarga |
| **Plantillas** | `boot()` disparaba `insert('plantillas')` durante lectura, pero el escritor productivo no autoriza esa colección; dejaba `#host` vacío | Catálogo base histórico de seis elementos en **consulta**, sin crear datos. Copiar/usar visibles; edición/duplicado deshabilitados mientras no exista contrato seguro. Prueba cero writes PASS | Probar UI autenticada; **CRUD durable servidor sigue HOLD**. No añadir permiso de Firestore directo ni fingir persistencia |

## 4. Plan de choque vigente por frentes paralelos

Los avances por fila se registrarán como `HISTÓRICO PRESERVADO`, `SOURCE QA PASS`, `TECH PREVIEW PASS`, `AUTH READ PASS`, `AUTH WRITE/READBACK PASS`, `BLOCKED CAUSAL` o `LIVE PASS`. No se retrocede una aprobación histórica, pero tampoco se extrapola a otra fuente/UID/rol.

| Prioridad / frente | Evidencia conservada | Verificación funcional de cierre aún requerida | Criterio material |
| --- | --- | --- | --- |
| **P0 — Inicio, identidad y permisos** | Login, multirrol, 5/5 hidratación, 7 usuarios en UAT histórica | Paula y UID distinto, Dirección/Operativo/Asesor, GT/CO/TODOS, cambio de rol y recarga, primer render, errores de sesión | Sin fuga entre país/rol ni falsa carga terminada |
| **P0 — Cliente 360, Pólizas, Vehículos** | 1,425 pólizas y universo de relación; importes por monedas separados | Resolver vínculos faltantes sin reimportar; flujos sintéticos leer→editar→recargar→restaurar y país por póliza | Fuente, relación, monto y asesor coherentes |
| **P0 — Cobros, cartera, recibos, Conciliaciones** | 2,560 registros Cobros (GT 2,514 / CO 46), 1,229 SIGA por confirmar y 5 pagos confirmados de la UAT histórica | Diferencia de cuatro renglones COP bajo GT, cambio a Asesor con carga prolongada, operaciones `finmovs`, exporte/PDF y recarga | Saldo y vencido por moneda, alcance y fuente coinciden; sin pagos inferidos |
| **P0 — Renovaciones y upsell** | Seguimientos históricos y mensaje WhatsApp con cliente válido | Vencidas vs sucesora acreditada; Lead/Ops, tarea y actividad, latencia tras cambio rol | No duplicar gestiones ni perder sucesora/historial |
| **P0 — Ops, Leads, comercial** | 4 gestiones Ops y 6 leads de lectura histórica | Lead→gestión→cliente/póliza, UID dueño, GT/CO, notificación y negativa a usuario ajeno | Una sola identidad de negocio y ownership durable |
| **P0 — Aseguradoras, conocimiento, Fianzas** | 33 fichas (2 sintéticas), 29 activas; test de update→reload→restore sintético autenticado en antigua Preview | Readback del mismo subflujo en la nueva fuente; probar rol autorizado y denegado, origen de tarifas | Edición controlada sin tocar reales ni inventar precios |
| **P0 — Cronograma e Historial** | Tareas y actividades; pruebas source PASS y UAT previa | Persistencia de tarea sintética y relación con renovación/cliente en el sucesor; rol/país | Recarga y restore exactos |
| **P1 — Cancelaciones y Siniestros** | Históricos de cancelación; sin reclamos reales en lectura | Motivos de fuente, moneda y país; caso QA aislado si contrato permite | No transformar vacío en falso PASS transaccional |
| **P1 — Comisiones, Reportes y Calidad** | Vistas, indicadores y ruta Reportes cargados tras hidratación | Reconciliar 74 diferencias importación, comisiones cero vs histórico; PDF y exportes descargados | Documento real generado y montos conciliados |
| **P1 — Portal, Notificaciones y Correo** | Rutas históricas visibles, dependencia OAuth explícita | **Portal GT/CO global desincronizado**, modal legal tras salida; destinatarios Notificaciones bajo país; correo sin envío externo | Teardown, autoridad de país y ninguna notificación accidental |
| **P1 — Shell, PWA, diseño y catálogo extendido** | 31 rutas navegadas en antigua fuente (30 con contenido; Plantillas antes FAIL); 15 capacidades históricas | Las 31 rutas en nueva fuente; pantalla 320/390 y escritorio; Cotizador, Comparativo, Academia, IA, Importación, Marketing, Finanzas, Automatizaciones, Endosos, Certificados | Función, accesibilidad, diseño consistente y rol verificados sin cerrar a ciegas |

## 5. Decisión productiva y siguiente acción

- **B4-003 continúa HOLD.** Paula aceptó una excepción temporal relativa a reglas compartidas el 28-oct; ello no representa `SECURITY PASS` ni reemplaza UAT, respaldo/restauración y puertas subsiguientes.
- **No hay nueva autorización implícita** de LIVE, funciones backend, IAM/Rules, datos reales, reimportación de agosto ni envíos externos.
- Primero restablecer control del Chrome conectado y probar en la **URL exacta `5ec0bf8c`** los dos módulos modificados, luego UAT cruzada de diez frentes con usuarios y países, y registrar por caso el resultado autenticado + persistencia/captura. Si la extensión sigue fallando, informar bloqueo instrumental; no falsificar ejecución.
- Después: matriz de 44 áreas y 15 capacidades con `CURRENT_PREVIEW_AUTH_*` acreditado por evidencia, revisión de seguridad/backup/restore en destino aislado, cierre material B4-003 y continuación de los gates originales. Sólo entonces evaluar promoción LIVE con aprobación específica de cambio y rollback verificable.

**Regla de anti-regresión:** toda corrección entra como sucesor del único branch, con prueba, manifestación de hashes, Guard CI, Preview aislada/byte readback y posterior UAT; cada PASS queda asociado al **SHA exacto + UID/rol/país + prueba**. No crear otra candidata lógica ni borrar certificaciones previas.

## 6. Delta acumulativo posterior — cuatro frentes corregidos y Preview exacta

**Corte:** 29 de octubre de 2026, Guatemala. Esta adenda actualiza únicamente el estado técnico y la acción inmediata. Conserva todas las decisiones, aprobaciones y gates anteriores. El punto de reanudación ya no es el error instrumental de Chrome ni la Preview 5ec0bf8c: el navegador conectado abrió la nueva URL y confirmó su formulario de inicio de sesión.

### 6.1 Publicación y prueba material

| Hito | Evidencia exacta | Resultado |
| --- | --- | --- |
| Sucesor fuente acumulativo | 779a71495366d8224dfb945ed7d84fee93482020, padre 26fbca77c810695cb9c5b2041cfd4cffac602234 | Exactamente 12 archivos: seis fuentes, cuatro tests, guard y recibo |
| Activación exclusivamente de transporte | 95f980719387c042625f5cfeb62340b1066ca361 | Un solo archivo YAML; ningún cambio adicional de producto |
| Regresión sintética conjunta | 49 archivos: 45 históricos y cuatro nuevos | 120/120 pruebas PASS, 0 FAIL y 0 omitidas; diez blobs antes/después idénticos |
| Guard local y remoto | Run 40923629966 sobre 95f980719387c042625f5cfeb62340b1066ca361 | PASS completo; PRODUCT_SOURCE_DRIFT=false; no se reescribió frozen114 |
| Build y Hosting Preview | Run 40923629860 | SUCCESS; fuente, transformaciones del index, bytes servidos y raíces LIVE sin cambios verificados |
| Workflows heredados | I6 Post-Salida 40923630266, 51 jobs terminados | SUCCESS; 71 pasos mutantes omitidos y B3-006 confirmado NOOP |

Preview vigente para esta UAT:
https://ays-orbit-360-lab--gi-i65-b4-sr-40923629860-q2geokqk.web.app/

BuildId: gi-i65-b4-95f980719387-57f234755dc1.

Hosted payload digest: 2a68697679dfda4a8ccf66c296a45c8df4e9942e9c58b828792da45208dc6beb.

Bundle digest: e618ac17b659ddc4ff55ba28cc9d0af5311a5c5b7f300457c3ca6c5d801af1f1.

Artifact retenido en GitHub: 12919327894, nombre gi-b4003-cumulative-hosting-40923629860, vencimiento informado 5-nov-2026. Contiene el sitio Hosting, su configuración y manifiestos; no contiene credenciales ni archivos de backend. El digest del ZIP es distinto del digest del payload Hosting. No se reconstruyó el build para verificarlo ni se autoriza reconstruirlo como sustituto de una futura promoción exacta.

### 6.2 Correcciones por frente

| Frente | Corrección causal implementada | Prueba nueva | Límite del resultado |
| --- | --- | --- | --- |
| Insights financiero | Proyección desde contratos de cartera/recibos/pagos existentes; país por relación validada, importes por moneda nativa, estados de carga explícitos y enlaces al recibo/cliente correcto | 26/26 PASS | UAT de cifras y relaciones reales pendiente; no acredita todos los tabs históricos de analítica |
| Portal y presentación legal | Refresh por país/sesión dentro de su scope; teardown de overlays propios y dismiss del gate pendiente sin aceptación, almacenamiento ni callbacks de aceptación | 10/10 PASS | No cambia textos ni aprueba su interpretación jurídica GT/CO |
| Shell/país | El encabezado escucha el evento canónico de país y refleja su valor, sin originar otro cambio ni escritura | 8/8 PASS | UAT transversal del selector pendiente |
| Cobros/lector protegido | Una fuente de arranque denegada o fallida no bloquea dependencias permitidas; liberación de slots y drenaje al cambiar de rol, conservando denegación, tenant, UID y epoch | 16/16 PASS, incluida advertencia de moneda | UAT Asesor pendiente; el aviso detecta contradicciones de moneda visibles frente a póliza, no todos los posibles metadatos de calidad de origen |

Los importes, monedas y relaciones de negocio no fueron modificados. Tampoco se cambiaron permisos, Rules, Auth, IAM, Functions, datos operativos o envíos externos.

La revisión independiente del scheduler no encontró ampliación de permisos: liberar la cola no convierte una colección denegada en confirmada y cada lectura sigue pasando por el mismo plan de acceso protegido.

### 6.3 Plantillas y prioridad preservada

El blob de Plantillas permanece 702c90d4c655013fc168430cb44a48aab7bdfcd0. En la Preview predecesora 5ec0bf8c se observaron, con Paula/Dirección, seis tarjetas, filtro de renovación, modal de uso y copia de texto con fixture sintético; no hubo envío ni escritura. La variable de vencimiento sin dato del fixture permaneció sin resolver. Esto no acredita una prueba completa del nuevo build.

La observación D-09 del recibo I6_5_B4_003_UAT3_FINDING_PRIORITY_RECONCILIATION_20261008.json está clasificada DEFERRED_AUTHORIZED_P2. No convertir la falta del owner CRUD seguro en un nuevo P0 ni reactivar las escrituras LAB históricas. El bloqueo independiente de cadencias Ops/Leads B4-003-R20-B11 conserva su disposición y no se cierra mediante este cambio.

### 6.4 Medición del avance y reanudación

| Medida | Estado de este corte | Qué significa |
| --- | --- | --- |
| I6 formal | 50%, sin cambio | B4-003 sigue abierto; no mide cuánto código se escribió |
| Bloque correctivo actual | 4/5 actividades, 80% | Causa; código/tests; composición; y build/Preview/readback completos |
| Actividad restante de este bloque | UAT autenticada de la Preview exacta | No se sustituye con las 120 pruebas sintéticas |
| Aprobaciones históricas | 15 preservadas | No se reinician ni se extrapolan al nuevo SHA |
| Nuevas aceptaciones integrales por capacidad | 0 acreditadas en este corte | No equivale a 0% de producto ni invalida certificaciones previas |

La pestaña Chrome de la nueva Preview quedó abierta en Iniciar sesión. Reanudar con autenticación real, sin compartir credenciales por chat:

1. Insights GT/CO/TODOS, moneda nativa y reconciliación con Cliente 360/Cobros.
2. Cambio de rol desde arranque Aseguradoras a Asesor/Cobros; confirmar carga de lo permitido y denegación de lo no permitido, sin salir y entrar como remedio.
3. Sincronización país global/local y Portal: entrar, cambiar contexto, salir y regresar sin aceptar términos ni dejar un modal ajeno en otras rutas.
4. Smoke de Plantillas y regresión dirigida de Inicio, Pólizas, Historial, Cronograma, Renovaciones, Ops/Leads y Aseguradoras; conservar las pruebas anteriores por SHA/rol/país.

Después permanecen los cierres del plan congelado: pruebas con UID independiente, operaciones sintéticas expresamente autorizadas con recarga/restauración, relaciones y exportes pendientes, ensayo de restauración aislada y rollback; B4-004 a B4-007 e I6.6 a I6.9. No hay nueva aceptación productiva ni permiso LIVE implícito en este corte.
