# AUDITORÍA Y CORRECCIÓN OPERATIVA — RENOVACIONES v1.200

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.

## 1. Objetivo

Avanzar el cierre de Renovaciones sin inventar primas, sin afirmar envíos inexistentes y sin crear una nueva póliza antes de tener una cotización/propuesta y un número real emitido.

Flujo implementado:

```txt
Póliza Vigente / Por renovar
→ detectar horizonte de vencimiento
→ crear o reutilizar gestión de Renovación
→ abrir Cotizador con contexto de la póliza origen
→ continuar a Comparativo con ofertas reales/normalizadas
→ decisión y emisión permanecen pendientes de regla operativa final
```

## 2. Hallazgos previos

### P0 — primas estimadas presentadas como opciones

`modules/renovaciones.js` generaba valores mediante un hash determinista entre 88% y 115% de la prima actual. Aunque el copy las llamaba estimaciones, la interfaz permitía elegir una “propuesta”, enviarla y registrarla en Ops.

Impacto:

- una cifra sin tarifa o cotización real podía aparentar ser una propuesta de aseguradora;
- podía contaminar la decisión del cliente;
- mezclaba comisión de intermediación con una prima no oficial;
- no era compatible con el gate default-deny de Cotizador/Comparativo.

Corrección: el bridge v1.200 sustituye `solicitarPropuestas` por una gestión real y abre Cotizador con contexto. No calcula ni muestra primas artificiales.

### P0 — campaña afirmaba envíos no conectados

El flujo legacy mostraba “WhatsApp + correo”, insertaba actividad de campaña enviada y emitía un toast de envío, aun cuando WhatsApp/correo podían no estar conectados o verificados.

Corrección:

```txt
Preparar campaña
→ selecciona pólizas
→ registra seguimiento preparado
→ estado canal = pendiente_conexion
→ NO envía
→ copy = preparados; no enviados
```

El enlace manual de WhatsApp se identifica como “Abrir WhatsApp”; no representa automatización.

### P1 — KPI mezclaba monedas

“Prima en juego” sumaba valores mediante normalización de referencia y los mostraba bajo una moneda contextual.

Corrección: “Prima neta en gestión” presenta GTQ y COP por separado y abre el detalle de pólizas que compone cada indicador.

### P1 — gestiones duplicadas

Solicitar propuestas varias veces podía generar múltiples gestiones de la misma renovación.

Corrección: se busca una gestión activa por `polizaId + tipo Renovación`; si existe, se reutiliza.

### P1 — falta de contexto Cotizador

La renovación se resolvía dentro de un modal aislado, sin transportar el riesgo y la póliza origen al Cotizador.

Corrección:

```txt
window.__orbitRenewalContext = {
  policyId,
  clienteId,
  gestionId,
  pais,
  moneda,
  ramo,
  producto,
  renuevaDe
}

#/cotizador?renueva=<policyId>
```

Este objeto es un puente de UI; el DTO canónico y la persistencia backend todavía deben cerrarse en Cotizador/Comparativo.

## 3. Archivos implementados

```txt
modules/renewals-v1200-operational-bridge.js
data/academia-v1200-renewals.js
tools/orbit360-validar-renovaciones-v1200.mjs
```

`index.html` carga el bridge después del módulo base y conserva todos los archivos protegidos y bridges anteriores.

## 4. Comportamiento actual

### KPI

- Vencidas;
- ≤15 días;
- 16–45 días;
- prima neta en gestión separada por moneda;
- todos con detalle navegable.

### Solicitar propuestas

- valida scope de la póliza;
- solo acepta Vigente/Por renovar;
- crea o reutiliza gestión;
- registra checklist operativo;
- deja nota explícita: cotización real pendiente;
- audita que no se usaron estimaciones;
- abre Cotizador con contexto.

### Campaña

- selecciona pólizas dentro de 60 días;
- registra actividad por póliza;
- marca `renovacionSeguimientoPreparado`;
- marca `renovacionCanalEstado = pendiente_conexion`;
- no llama correo, WhatsApp, Make ni proveedor externo;
- no afirma envío exitoso.

### Academia

Rutas por Dirección, Operativo y Asesor sobre:

- KPI verificables;
- campañas preparadas vs enviadas;
- fuentes vigentes;
- Comparativo con ofertas reales;
- gestión única;
- límites por rol;
- evaluación aplicada.

## 5. Pruebas y validación

Se agregó:

```txt
node orbit360-platform/tools/orbit360-validar-renovaciones-v1200.mjs
```

El validador comprueba:

- composición y orden de carga;
- ausencia de `primaEstimada`/`hashStr` en el bridge;
- ausencia de envío directo desde el bridge;
- copy honesto de campaña;
- gestión única;
- apertura de Cotizador con contexto;
- KPI por moneda;
- Academia;
- conservación de protegidos.

El smoke visual/navegador todavía está pendiente. No se declara cerrado por evidencia visual.

## 6. Pendiente de decisión operativa

Para terminar la renovación se necesita definir el momento exacto de creación de la nueva póliza:

### Alternativa A — solo al emitir

```txt
Cotización/Comparativo
→ cliente acepta
→ gestión Pendiente de emisión
→ aseguradora emite y entrega número real
→ Orbit crea nueva póliza + recibos
→ vincula renuevaDe/renovadaPor
```

Ventaja: nunca existe una póliza sin número real.

### Alternativa B — entidad pre-emisión separada

```txt
Cotización/Comparativo
→ cliente acepta
→ crear Solicitud de emisión / Propuesta aceptada
→ esperar número real
→ convertir en póliza
```

Ventaja: permite controlar documentos, inspección y emisión sin usar la entidad Póliza prematuramente.

No se recomienda crear una Póliza con número provisional.

## 7. Pendientes posteriores

1. Adoptar A o B.
2. Crear DTO persistente de renovación entre Cotizador/Comparativo/Ops.
3. Definir cierre de recibos pendientes de la póliza origen.
4. Definir si existe periodo de gracia/traslape.
5. Vincular nueva póliza y anterior.
6. Definir renovación con cambio de aseguradora.
7. Definir no renovación, recuperación y cancelación.
8. Conectar canales reales solo cuando estén verificados.
9. Smoke visual responsive con datos A&S sanitizados.

## 8. Estado

```txt
KPI_RENOVACIONES: CORREGIDO_EN_RUNTIME
PRIMAS_ARTIFICIALES: RETIRADAS_DEL_FLUJO_NUEVO
CAMPANA_HONESTA: IMPLEMENTADA
GESTION_UNICA: IMPLEMENTADA
CONTEXTO_COTIZADOR: IMPLEMENTADO
EMISION_RENOVADA: PENDIENTE_DECISION_OPERATIVA
SMOKE_VISUAL: PENDIENTE
DATOS_REALES_ESCRITOS: NO
DEPLOY: NO
MERGE: NO
```
