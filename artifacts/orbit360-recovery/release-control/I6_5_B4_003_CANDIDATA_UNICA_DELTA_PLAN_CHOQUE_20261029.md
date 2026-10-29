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
