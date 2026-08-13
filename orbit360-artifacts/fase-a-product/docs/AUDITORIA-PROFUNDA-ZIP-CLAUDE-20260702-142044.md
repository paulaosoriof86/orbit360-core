# Orbit 360 - Auditoria profunda ZIP Claude 2026-07-02 14:20:44

Fecha: 2026-07-02
ZIP auditado: `Prototype Development Request - 2026-07-02T142044.699.zip`
Version funcional declarada por el ZIP: v1.80
Estado: AUDITADO / BASE VISUAL MAS RECIENTE / EMPALME BACKEND-SAFE PENDIENTE
Rama objetivo: `backend/v99-clean-claude-lab-20260701`
PR: #3 draft

## 0. Correccion metodologica

La auditoria anterior quedo demasiado resumida. Este documento reemplaza ese resumen corto y reconoce que el ZIP si contiene un bloque amplio de mejoras frente al prototipo anterior. La decision correcta no es minimizar los avances, sino separarlos en tres grupos:

1. Mejoras reales que deben adoptarse como nueva base visual/UX v1.80.
2. Mejoras parciales que requieren empalme o validacion antes de darse por cerradas.
3. Pendientes que siguen abiertos para Claude o para backend ChatGPT/Codex.

Orbit 360 se mantiene como SaaS multi-tenant versionado. Claude entrega prototipo/base UX. A&S es un tenant que se personaliza aqui por configuracion, datos, backend LAB, integraciones y futuro backend real. No se bifurca el core por cliente.

## 1. Inventario forense del ZIP

- Raiz interna: `orbit360-platform/`.
- Total de archivos: 83.
- Directorios incluidos: `core/`, `data/`, `modules/`, `styles/`, `docs/`, raiz app.
- Contiene `index.html`, `data/store.js`, `data/seed.js`, modulos funcionales y documentacion.
- No contiene `data/store-firestore-lab.local.js`.
- No contiene `core/auth-firebase.config.local.js`.
- No contiene reglas Firestore ni secretos locales LAB.
- No contiene `.firebaserc`, `firebase.json` ni archivos de deploy.

## 2. Comparacion contra ZIP anterior disponible en esta sesion

Base de comparacion disponible: `Prototype Development Request - 2026-07-01T131700.175.zip`.

### Archivos nuevos

- `core/notify.js`
- `docs/AUDITORIA-SINCRONIAS.md`
- `docs/REQ-FINANZAS-PROFUNDO.md`

### Archivos eliminados

- Ninguno.

### Archivos modificados

- `core/ciclo.js`
- `core/config.js`
- `core/importa.js`
- `core/queries.js`
- `core/ui.js`
- `data/seed.js`
- `docs/AUDITORIA-FORENSE.md`
- `docs/BITACORA-CAMBIOS.md`
- `index.html`
- `modules/automatizaciones.js`
- `modules/cancelaciones.js`
- `modules/cliente360.js`
- `modules/cobros.js`
- `modules/comparativo.js`
- `modules/cotizador.js`
- `modules/finanzas.js`
- `modules/inicio.js`
- `modules/insights.js`
- `modules/marketing.js`
- `modules/polizas.js`
- `modules/portal.js`
- `modules/renovaciones.js`
- `modules/siniestros.js`

### Cambios de mayor peso

- `modules/finanzas.js`: cambio mayor, con dashboard profundo, metas y sugeridor.
- `docs/BITACORA-CAMBIOS.md`: registra v1.74 a v1.80.
- `core/importa.js`: dry-run y conciliacion con recaudo.
- `modules/portal.js`: flujo canonico de reclamo.
- `modules/siniestros.js`: sincronia estado -> Ops/Historial.
- `core/queries.js`: `postRecaudo`.
- `core/notify.js`: capa transversal nueva de notificacion cliente.

## 3. Scans ejecutados

### Encoding / mojibake

Resultado: LIMPIO EN ARCHIVOS.

No se detectaron patrones funcionales de mojibake como `Ã`, `Â`, `â`, `ðŸ` o caracter de reemplazo en archivos activos del ZIP.

Pendiente: validacion visual real en Chrome, especialmente login, sidebar, Portal, Ops, Historial, Siniestros y Cliente 360.

### Referencias ajenas funcionales

Resultado: LIMPIO EN UI/CODIGO FUNCIONAL ACTIVO.

No se detectaron referencias funcionales activas en `core/`, `modules/`, `data/`, `styles/` o `index.html` a CXOrbia, Orbia, TyA, shopper, mystery shopping, Mystery Shopping o CX / Mystery.

Notas:

- Persisten referencias documentales internas de deslinde como “Orbit no es CXOrbia”. Eso no es contaminacion si queda solo en documentos tecnicos.
- Existe una referencia historica de paleta “Orbia” en `CHANGELOG.md` y `PLAN-INFRAESTRUCTURA.md`; no debe llegar a UI cliente ni demo comercial.

### localStorage directo

Resultado: P0 ABIERTO EN MODULO CONFIGURACION.

Hallazgo activo:

- `modules/configuracion.js` conserva `localStorage.setItem('orbit360_logo', ...)` y `localStorage.removeItem('orbit360_logo')` dentro del bloque “Logo del cliente”.

Esperado:

- Ningun modulo debe tocar `localStorage` directo.
- El logo debe guardarse por `Orbit.tenant`, `Orbit.store.pref/setPref` o configuracion tenant.

Nota tecnica:

- `data/store.js` usa localStorage porque es el store demo. Eso es aceptable en prototipo demo, pero en backend se sustituye/overridea manteniendo API.
- Algunos `core/` usan localStorage para auth demo/tema; esto no es el P0 de modulos, pero debe revisarse en backend real.

### Dialogos nativos

Resultado: No se detectan `alert/prompt/confirm` nativos en modulos como llamadas directas de navegador.

Lo que aparece son llamadas a `Orbit.ui.alert`, `Orbit.ui.prompt` y `Orbit.ui.confirm`, que son wrappers/modales Orbit.

### Fechas quemadas

Resultado: P1/P0 PARCIAL.

Avance real:

- `core/ui.js` usa fecha real del sistema.
- `data/seed.js` usa fecha real del sistema y sube `seed.__v` a 34.
- `modules/siniestros.js` reemplaza parte de los timestamps por `Orbit.ui.today()`.

Pendiente activo detectado:

- `core/ciclo.js` aun contiene literales `2026-06-20`, `2026-06-22`, `2026-06-27` en bitacoras, creacion de clientes, negocios, gestiones, avisos, vencimientos y proximos toques.
- `modules/cliente360.js` conserva fechas default `2026-06-22` y `2026-06-20` en inputs de formularios.
- `modules/portal.js` conserva `2026-06-24` y `2026-06-26` en reportes de pago / gestion.
- `modules/siniestros.js` conserva un timestamp `2026-06-24` dentro de bitacora al crear reclamo manual.

Esperado:

- Reemplazar por `Orbit.ui.today()`, fechas relativas desde hoy o campos editables sin default historico.

## 4. Mejoras reales detectadas por version interna Claude

### v1.80 - Finanzas profundo

Estado: MEJORA MAYOR / DEBE ADOPTARSE COMO BASE v1.80.

Mejoras:

- Finanzas ahora incluye pestaña visible `Metas`; antes la funcion existia pero no estaba en tab bar ni dispatch.
- Metas con real vs ideal por empresa, asesor y aseguradora.
- Semaforos de cumplimiento: verde >=100%, amarillo >=70%, rojo <70%.
- Medicion mensual real con `primaNetaMes` y `recaudoMes`.
- Motor `metasSugerir()`:
  - meta de prima = promedio 3 meses x 1.10,
  - meta de recaudo = tasa historica recaudo/venta,
  - alerta si supera 1.5x presupuesto de ingresos,
  - permite establecer metas empresa y asesor.
- Dashboard mas profundo:
  - KPIs acumulados,
  - utilidad operativa,
  - variacion interanual,
  - variacion intermensual,
  - hallazgos criticos reales,
  - grafico ingresos vs egresos,
  - tabla numerica de respaldo,
  - comparativo interanual,
  - produccion por vendedor,
  - produccion por aseguradora.
- Finanzas abre en el ultimo mes con datos si el mes actual no tiene movimientos.

Pendiente:

- El analisis critico es calculado por logica local, no por IA real de backend.
- Validar visualmente con datos A&S/tenant y no solo seed.
- Alinear `metas` como coleccion definitiva Firestore.

### v1.79 - Auditoria render 28/28 y limpieza de codigo muerto

Estado: MEJORA DOCUMENTAL Y DE CALIDAD.

Mejoras:

- El ZIP documenta auditoria de salud de render con 28/28 modulos sin errores JS.
- Se descarto clic masivo a ciegas porque contaminaba DOM/store.
- Se verificaron flujos clave en documento separado.
- `finanzas.js` elimina funciones muertas duplicadas que contenian arrays hardcodeados.

Pendiente:

- Complementar con validacion local de ChatGPT/Codex tras empalme backend-safe.
- No usar la auditoria declarada como sustituto de Fase 7D o render real local.

### v1.78 - Auditoria de sincronias + pago a Finanzas

Estado: MEJORA MAYOR BACKEND-RELEVANT.

Mejoras:

- Nuevo documento `docs/AUDITORIA-SINCRONIAS.md`.
- Se identifica una clase critica de bug: objetos vivos del store mutan en sitio tras `update()`.
- Nuevo helper `Orbit.q.postRecaudo(cobro, fecha, metodo)`:
  - inserta/actualiza `finmovs`,
  - idempotente por `fmv_cob_<cobroId>`,
  - estado `recaudado`,
  - clase `Recaudo de primas`,
  - periodo derivado de fecha de pago.
- Cableado desde `modules/cobros.js`, `modules/cliente360.js` y `core/importa.js`.

Impacto backend:

- Firestore LAB debe soportar correctamente `finmovs` idempotente.
- El adaptador backend debe mantener `insert/update/get` con misma semantica y `_emit`.
- Se debe revisar concurrencia/idempotencia cuando pase de local a backend real.

### v1.77 - Portal a Siniestro profundo

Estado: P0 CASI RESUELTO / PENDIENTE VALIDACION VISUAL LOCAL.

Mejoras:

- Se verifico flujo real de Portal, no insert simulado.
- `modules/portal.js` crea reclamo canonico cuando la gestion es `Reclamo / Siniestro`.
- El reclamo aparece en modulo Siniestros, Cliente 360 > Siniestros, Historial y Ops.
- `modules/siniestros.js` corrige bug real de referencia viva:
  - captura `cambioEstado` antes de `update()`,
  - inserta actividad en Historial,
  - actualiza gestion Ops enlazada,
  - resuelve gestion si siniestro pasa a Pagado/Rechazado.
- Cerrar gestion Ops no borra el reclamo.

Pendiente:

- Ejecutar prueba visual local sobre repo empalmado, no solo ZIP.

### v1.76 - Portal siniestro canonico + badges ocultos + saneo referencias ajenas

Estado: MEJORA P0 REAL.

Mejoras:

- `Orbit.tenant.DEFAULT.hideTechnicalBadges = true`.
- Merge de claves nuevas del default sobre tenant persistido, sin pisar configuracion del cliente.
- Toggle interno/demo sigue en Configuracion.
- `data/seed.js` reemplaza contenidos de Marketing ajenos por servicio al cliente.
- `modules/automatizaciones.js` reemplaza comentario de inspiracion ajena por texto neutro.
- `seed.__v` sube a 34.

Pendiente:

- Validacion visual de sidebar sin BETA/NUCLEO/PROX/ROAD.
- Confirmar que Configuracion no permita reactivar esto por accidente en modo cliente, salvo modo interno.

### v1.75 - Calendario vivo

Estado: MEJORA P0 REAL / PARCIAL POR FECHAS RESTANTES.

Mejoras:

- `core/ui.js` y `data/seed.js` ya no estan anclados a `2026-06-20`.
- Demo sigue fecha real del sistema.
- `Orbit.tenant.demoDate` puede fijar fecha si se requiere demo controlado.

Pendiente:

- Aun quedan literales historicos en `core/ciclo.js`, `modules/cliente360.js`, `modules/portal.js`, `modules/siniestros.js`.

### v1.74 - Metas sin literales duros

Estado: MEJORA REAL / AMPLIADA EN v1.80.

Mejoras:

- Inicio elimina literales duros de metas.
- Meta empresa deriva de coleccion `metas` o suma por asesor.
- Finanzas e Inicio comparten mejor fuente de medicion.

Pendiente:

- Unificar definitivamente modelo de metas para backend: coleccion `metas` por tenant/pais/mes/tipo/ambito.

### v1.65 - Notificacion al cliente desde la plataforma

Estado: MEJORA TRANSVERSAL IMPORTANTE / BACKEND PENDIENTE.

Mejoras:

- Nuevo `core/notify.js`.
- `Orbit.notify.cliente()` y `Orbit.notify.pedir()` centralizan mensajes al cliente.
- Selector de canal WhatsApp/correo.
- Preview editable.
- Registro automatico en `actividades`.
- Integrado en pago aplicado, respuesta de gestion, envio de comparativo y envio de cotizacion.

Pendiente backend:

- `_deliver` actualmente usa `wa.me`, compositor Orbit o `mailto`.
- Produccion debe pasar por Make/webhook/WhatsApp Cloud API/correo real.
- Debe registrar estado de entrega, error, plantilla usada, canal y usuario.

## 5. Auditoria por modulo/archivo principal

### `core/notify.js` - NUEVO

Valor: capa transversal para notificar al cliente, registrar actividad en expediente y permitir backend swappable en `_deliver`.
Riesgo: no es envio real; falta manejo de fallos y acuse de entrega.
Estado: ACEPTAR COMO PROTOTIPO; documentar contrato backend.

### `core/queries.js`

Valor: agrega `postRecaudo`; conecta Cobros/Cliente360/Importador con Finanzas.
Riesgo: en Firestore real hay que asegurar idempotencia transaccional.
Estado: ACEPTAR, backend debe respetar.

### `core/importa.js`

Valor: dry-run antes de guardar y conciliacion a Finanzas.
Riesgo: validar con Excel reales de A&S.
Estado: ACEPTAR, validar con importadores reales.

### `core/config.js`

Valor: badges tecnicos ocultos por defecto y tenant persistido hereda claves nuevas.
Riesgo: core config aun usa localStorage para tenant/catalogos demo; backend real debe persistir config en backend.
Estado: ACEPTAR.

### `core/ciclo.js`

Valor: integra `Orbit.notify` al resolver gestiones.
Riesgo: persisten fechas quemadas.
Estado: ACEPTAR SOLO CON PARCHE DE FECHAS.

### `modules/portal.js`

Valor: reporte de siniestro crea entidad canonica `reclamos`, enlazada con Ops e Historial.
Riesgo: persisten fechas quemadas en reporte de pago/gestion. Requiere validacion visual completa.
Estado: ACEPTAR CON PARCHE DE FECHAS Y PRUEBA VISUAL.

### `modules/siniestros.js`

Valor: corrige sincronia estado -> Ops/Historial, usa `reclamoId` como vinculo, no borra reclamo al cerrar gestion.
Riesgo: persiste timestamp historico en creacion manual.
Estado: ACEPTAR CON PARCHE DE FECHAS.

### `modules/cliente360.js`

Valor: pago desde ficha puede postear recaudo y notificar cliente; reclamos visibles desde ficha.
Riesgo: fechas default historicas en formularios.
Estado: ACEPTAR CON PARCHE DE FECHAS.

### `modules/cobros.js`

Valor: pago rapido llama `postRecaudo`; mejora coherencia cartera -> finanzas.
Estado: ACEPTAR.

### `modules/finanzas.js`

Valor: una de las mejoras mas grandes del ZIP; pestaña Metas visible; dashboard profundo; tablas; vendedor; aseguradora; variaciones; analisis critico; sugeridor de metas; limpieza de codigo muerto.
Riesgo: requiere validacion visual y con datos A&S; IA real no conectada.
Estado: ACEPTAR COMO BASE v1.80.

### `modules/comparativo.js` y `modules/cotizador.js`

Valor: envio de comparativo/cotizacion al cliente usando `Orbit.notify`.
Riesgo: envio real depende de backend/Make.
Estado: ACEPTAR.

### `modules/renovaciones.js`

Valor: filtros por asesor y ramo en campaña/lote.
Estado: ACEPTAR.

### `modules/marketing.js`

Valor: estado `Medido`, responsable y aprobacion.
Riesgo: falta profundidad comercial completa: flujo de aprobacion, programacion real, metricas, integraciones.
Estado: AVANCE P1.

### `modules/insights.js`

Valor: filtro global por asesor.
Riesgo: debe alinearse con modelo unico de metas.
Estado: ACEPTAR.

### `modules/polizas.js`

Valor: KPIs filtrables por estado.
Estado: ACEPTAR.

### `modules/configuracion.js`

Valor: modulo clave para tenant, pero este ZIP mantiene bloqueo de `localStorage` directo para logo.
Estado: NO COPIAR SIN PARCHE.

## 6. Estado de pendientes para Claude despues de este ZIP

### P0 resueltos o casi resueltos

1. Portal -> Siniestros -> Ops -> Historial -> Cliente 360: RESUELTO EN CODIGO / pendiente validacion visual local.
2. Badges tecnicos visibles: RESUELTO EN CODIGO / pendiente validacion visual.
3. Encoding/mojibake: SCAN LIMPIO / pendiente visual.
4. Referencias ajenas funcionales: SCAN LIMPIO / mantener vigilancia.
5. Finanzas superficial: AVANCE MAYOR. Ya no debe documentarse como “sin mejoras”; ahora el pendiente es validar profundidad completa y conexion backend/IA.

### P0/P1 que siguen abiertos

1. localStorage directo en `modules/configuracion.js`.
2. Fechas quemadas en `core/ciclo.js`, `modules/cliente360.js`, `modules/portal.js`, `modules/siniestros.js`.
3. Validacion visual real del flujo de siniestros.
4. Empalme backend-safe preservando LAB.
5. Notificacion real backend por Make/WhatsApp/correo.
6. Modelo unico de metas para Firestore.
7. Aseguradoras, Plantillas, Reportes, Automatizaciones y Marketing profundo.

## 7. Impacto backend v1.80

Este ZIP cambia el contrato de backend esperado en varios puntos:

1. `finmovs` pasa a ser destino directo de pagos aplicados y conciliaciones.
2. `reclamos` debe enlazarse por `reclamoId` con `gestiones` y `actividades`.
3. `actividades` se vuelve aun mas transversal: portal, siniestros, pagos, notificaciones.
4. `metas` debe ser coleccion formal para empresa/asesor/aseguradora, por mes y tipo.
5. `notify` necesita adaptador backend/Make sin tocar llamadores.
6. Importadores necesitan dry-run y luego commit controlado a `Orbit.store`.
7. Firestore debe preservar idempotencia y `_emit` tras insert/update/remove.

## 8. Plan de empalme v1.80 backend-safe

### Fase 8.5 propuesta

Objetivo: trabajar sobre la ultima version v1.80 sin perder backend LAB.

Pasos:

1. Confirmar estado local con `git status --short`.
2. Crear backup local.
3. Empalmar selectivamente archivos v1.80 aprobados.
4. No copiar `data/store.js` ni archivos backend protegidos.
5. Si se copia `index.html`, reinsertar hook LAB.
6. Parchar `modules/configuracion.js` para eliminar `localStorage` directo.
7. Parchar fechas quemadas operativas.
8. Ejecutar `node --check`.
9. Ejecutar scans.
10. Ejecutar Fase 7D.
11. Validar visualmente Chrome.
12. Solo despues continuar Auth/Fase 9.

## 9. Criterio para continuar backend

No continuar Auth/Fase 9 hasta completar Fase 8.5. La razon no es detener el backend, sino evitar construir Auth sobre una base visual desalineada. El backend debe migrarse sobre la ultima base v1.80, preservando el contrato LAB ya validado.

## 10. Dictamen final

Este ZIP si representa una mejora amplia frente al anterior y debe convertirse en la nueva base de trabajo. La restriccion es tecnica: no se debe instalar completo sin empalme seguro, porque puede romper backend LAB o reintroducir `localStorage` directo/fechas historicas.

Estado final:

- Base visual recomendada: v1.80.
- Empalme directo completo: NO.
- Empalme selectivo con parches: SI.
- Backend: continuar con Fase 8.5 antes de Auth/Fase 9.
- Claude: backlog actualizado; proximos paquetes deben partir de estos pendientes, no volver a tratar Finanzas/Portal como si no hubieran avanzado.
