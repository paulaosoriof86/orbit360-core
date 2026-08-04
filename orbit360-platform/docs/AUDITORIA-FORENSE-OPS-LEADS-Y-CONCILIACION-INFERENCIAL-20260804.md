# Auditoría forense — Ops/Leads y conciliación inferencial

Fecha: 2026-08-04  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Alcance: source-only, sin deploy, Firestore/Auth, Rules, producción, main ni merge.

## 1. Decisión ejecutiva

```text
COBROS_365_UNRECONCILED_LABEL_INVALID_PENDING_INFERENCE_REPLAY
OPS_LEADS_FRONTEND_CYCLE_PARTIAL_PASS
OPS_LEADS_PRODUCTIVE_BACKEND_NOT_COMPLETE
VISUAL_EVIDENCE_PORTAL_IS_NOT_CANONICAL_PLATFORM_RUNTIME
```

## 2. Corrección de Cobros

El workbook anterior impuso deliberadamente la regla:

```text
pagos de SIGA/aseguradora = pago reportado hasta un bloque posterior
```

Por eso agrupó 365 registros bajo “Pagos reportados, no conciliados”. Esa etiqueta describe la decisión conservadora del dry-run, no una conclusión probatoria definitiva.

Las planillas recibidas contradicen que todos deban permanecer sin conciliar:

- 19 archivos y 10 paquetes de fuente;
- 67 filas detalladas;
- 65 elegibles para CRM;
- 8 paquetes con conciliación de fuente `EXACT`;
- reportes emitidos por aseguradoras que se denominan expresamente “Reporte mensual de cobros” y contienen póliza, día de pago, requerimiento, factura, prima, comisión y forma de pago.

Clasificación de la brecha:

```text
DATA_CONTRACT_FAILURE
PIPELINE_MECHANISM_FAILURE
VALIDATOR_STALE
```

### Regla probatoria corregida

1. Pago explícito de aseguradora con contraparte única: `CONCILIADO_DIRECTO_ASEGURADORA`.
2. Fila positiva de planilla de comisión reconocida por aseguradora, vinculada a póliza/periodo/recibo: `CONCILIADO_RECONOCIMIENTO_ASEGURADORA`.
3. Si una planilla reconoce la cuota N y el calendario es continuo para la misma póliza, vigencia y moneda, las cuotas anteriores 1..N-1 se clasifican como `CONCILIADO_SECUENCIA_PLANILLA`, salvo contradicción.
4. Si un estado completo de cartera muestra como primera pendiente la cuota N, las cuotas anteriores se clasifican como `CONCILIADO_SECUENCIA_CARTERA`, siempre que el bloque pendiente sea continuo y no exista reversión, anulación, cambio de vigencia, moneda o conflicto.
5. El pago reportado en Orbit/SIGA sigue siendo válido como hecho reportado aunque aún no tenga evidencia externa. Su estado correcto es `PAGO_REPORTADO_VALIDO_PENDIENTE_CRUCE`, no “inválido”.
6. Filas negativas, reversos, duplicados, endosos ambiguos, cruces de vigencia, moneda o identificación permanecen en HOLD.
7. La desaparición de una cuota en un corte posterior solo se usa cuando la fuente declara completitud y existe una secuencia consistente; nunca por ausencia aislada.

Motor source-only incorporado:

`tools/orbit360-cobros-inferencia-secuencial-v20260804.mjs`

El total de 365 no se reutilizará como conteo de “no conciliados”. Debe recalcularse sobre todas las fuentes normalizadas antes de publicar la visualización final.

## 3. Auditoría forense de Ops/Leads

### Arquitectura observada

`Ops` y `Leads` comparten el motor de navegador `Orbit.ciclo` y las colecciones `negocios` y `gestiones` de `Orbit.store`.

Un negocio es un solo registro que se proyecta por etapa:

```text
nuevo          → Leads
contactado     → Leads
cotizando      → Leads + Ops/Cotizaciones
propuesta      → Leads solamente
negociacion    → Leads solamente
inspeccion     → Leads + Ops/Inspecciones
emision        → Leads + Ops/Emisiones
emitido        → cierre
```

La proyección fuente es coherente y evita duplicar el negocio entre tableros.

### Matriz de flujos solicitados

| Flujo | Evidencia source | Resultado forense |
|---|---|---|
| Solicitud desde Portal → Ops | `portal.js` crea `gestiones` con origen Portal | PASS frontend/store; notificación durable incompleta |
| Solicitud desde ficha Cliente → Ops | `Orbit.ciclo.solicitarGestion` crea gestión, actividad y aviso preparado | PASS frontend/store |
| Gestión creada en Ops → responsable | `crearGestion` y edición guardan `asesorId`; reasignar prepara aviso | PASS de asignación; FAIL de visibilidad del Asesor activo |
| Enviar cotización → Leads y salir de Ops | `cotizando → propuesta` elimina la proyección Ops y conserva el mismo negocio en Leads | PASS en motor manual; integración automática Cotizador/Comparativo no demostrada |
| Negociación → Inspección/Emisión | `negociacion → inspeccion|emision` mantiene Leads y vuelve a proyectar Ops | PASS source-level |
| Propuesta aceptada → emisión tipada | `issuance-workflow-v1201` crea gestión tipada en Ops/Emisiones | PASS frontend/store; backend protegido no demostrado |
| Gestión resuelta → aviso al cliente | `openGestion` llama `Orbit.notify.pedir` | PARTIAL: comunicación preparada, no entrega confirmada |
| Solicitud Portal → respuesta visible en Portal | Portal lee `notifs`; cierre de gestión no garantiza escribir `notifs` | FAIL contractual |
| Gestión asignada visible al asesor | Asesor no puede entrar a Ops y las gestiones no se proyectan en Leads | FAIL frente al requerimiento |
| Sincronización durable entre módulos | ambos leen el mismo registro y reaccionan a `_emit` | PASS en sesión; backend/eventos durables incompletos |
| Automatización de WhatsApp/correo | `notify.js` abre `wa.me`, compositor o `mailto` | FAIL productivo: no proveedor ni confirmación de entrega |

## 4. Causa raíz de Ops/Leads

No se construyó un backend de dominio completo. Se implementó primero un motor frontend compartido y luego se conectó al adaptador genérico de `Orbit.store`.

Las colecciones `negocios` y `gestiones` están declaradas como `legacy-unmigrated`, mientras las colecciones canónicas selladas se limitan a Clientes, Aseguradoras, Pólizas, Vehículos, Recibos, Cartera y Cobros.

Clasificación:

```text
DATA_CONTRACT_FAILURE
FUNCTIONAL_DEFECT
```

Brechas estructurales:

1. No existe servicio protegido de transiciones para negocios/gestiones.
2. No existe outbox/event ledger idempotente para sincronización y automatizaciones.
3. La autorización de escritura depende del store genérico; no hay contrato de transición por rol y scope en backend.
4. Portal mantiene una ruta de creación duplicada respecto de `Orbit.ciclo.solicitarGestion`.
5. El rol activo Asesor no ve Ops y tampoco recibe una proyección de gestiones asignadas en Leads/Mi Día.
6. Las notificaciones son acciones preparadas en navegador, no entregas verificadas.
7. La respuesta de una gestión no queda garantizada como notificación consultable en Portal.
8. Gate 7.11 comprobó lectura, rutas y permisos; no probó estos flujos end-to-end ni escrituras durables.

## 5. Qué puede incluirse en visualización

Ops y Leads pueden mostrarse para revisar:

- diseño de tableros;
- etapas;
- tarjetas;
- filtros;
- proyección compartida;
- flujo manual de cotización, propuesta, negociación, inspección y emisión;
- ficha de negocio y gestión.

No pueden presentarse como terminados en:

- backend productivo;
- notificaciones automáticas reales;
- portal bidireccional completo;
- gestión visible al asesor;
- integración automática probada desde Cotizador/Comparativo;
- seguridad de transición en backend.

## 6. Aclaración sobre el index entregado

El archivo:

`orbit360-visualizacion-acumulativa-source-only-20260804/index.html`

es un portal de evidencia que organiza capturas y conteos. No es:

- la aplicación Orbit 360;
- la candidata runtime canónica;
- un deploy;
- una prueba de backend;
- la versión para aprobación visual final.

La plataforma canónica corresponde al árbol acumulativo `orbit360-platform/` de la rama viva, conectado al snapshot y backend autorizados. Todavía debe construirse y desplegarse una candidata visual única después de cerrar la reclasificación de Cobros y definir honestamente el alcance Ops/Leads.

## 7. Siguiente frontera única

```text
1. Ejecutar el replay inferencial completo de Cobros.
2. Obtener el conteo corregido por tipo de evidencia y por póliza/cuota.
3. Mantener en HOLD solo contradicciones reales.
4. Implementar o excluir de la declaración productiva las brechas de Ops/Leads.
5. Construir inmediatamente una sola candidata runtime acumulativa.
6. Visualizar CRM, Aseguradoras, Ops y Leads con estados honestos.
```

La revisión visual final no debe iniciarse con el portal HTML de evidencia.