# Auditoría cierre parcial núcleo CRM post-hotfix v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Objetivo del bloque

Cerrar revisión parcial del núcleo CRM/operación después del hotfix aplicado por ChatGPT en:

```txt
portal
siniestros
automatizaciones
plantillas
```

Y auditar módulos conectados:

```txt
historial
cancelaciones
correo
cliente360
polizas
```

---

## Verificación post-hotfix

### Búsquedas de control

Se verificó en GitHub que ya no aparecen las cadenas problemáticas:

```txt
2026-06-26
2026-06-24
campaña enviada
notificado al equipo
Notificación enviada
se envía por WhatsApp/correo
```

Resultado:

```txt
sin coincidencias en búsqueda GitHub
```

### Estado del hotfix

Aplicado en GitHub por ChatGPT con cierre documental:

```txt
orbit360-platform/docs/HOTFIX-PORTAL-SINIESTROS-AUTOMATIZACIONES-PLANTILLAS-V1330-20260707.md
```

Pendiente:

```txt
node --check local
validador backend LAB local
smoke visual
```

porque el conector GitHub no ejecuta Node.

---

## Historial / Actividades

Archivo:

```txt
orbit360-platform/modules/historial.js
```

Validaciones positivas:

- Usa `Orbit.store('actividades')`.
- Es una vista global de trazabilidad.
- Permite filtros por texto, tipo y asesor.
- Muestra detalle de actividad y permite saltar al expediente Cliente 360.
- No escribe datos operativos ni toca backend protegido.

Pendiente P2:

```txt
TIPOS no contempla explícitamente algunos tipos nuevos: recuperacion, siniestro, whatsapp preparado/correo preparado.
```

Impacto:

- La actividad se muestra, pero la etiqueta puede caer al valor crudo.
- No es P0 ni P1 porque no rompe flujo.

Mejora recomendada:

```js
const TIPOS = {
  llamada: 'Llamada',
  whatsapp: 'WhatsApp',
  email: 'Correo',
  correo: 'Correo',
  reunion: 'Reunión',
  nota: 'Nota',
  sistema: 'Sistema',
  recuperacion: 'Recuperación',
  siniestro: 'Siniestro'
};
```

Impacto Claude/Academia:

```txt
Historial debe enseñar diferencia entre actividad, comunicación preparada, gestión, pago aplicado y evento automático.
```

---

## Cancelaciones / Recuperación

Archivo:

```txt
orbit360-platform/modules/cancelaciones.js
```

Validaciones positivas:

- Cancelaciones se tratan como histórico.
- Valor perdido se normaliza con `q.norm(...)` usando moneda del cliente.
- La recuperación comercial crea negocio en Leads, no cartera ni cobro.
- Si se marca recuperada, crea gestión operativa de reemisión en Ops.
- No reactiva póliza ni genera recibos/cartera automáticamente.

Pendientes P1/P2:

### P1 — toast dice visible en Ops aunque recuperación no recuperada va a Leads

El código documenta correctamente:

```txt
recuperación comercial → NEGOCIO en Leads (no Ops)
```

pero el toast dice:

```txt
visible en la ficha y en Ops
```

cuando realmente queda como negocio en Leads.

Corrección recomendada:

```txt
Acción de recuperación guardada · visible en ficha y Leads
```

### P2 — fecha viva con `new Date()`

Usa:

```js
new Date().toISOString().slice(0, 10)
```

No es fecha quemada, pero para consistencia del prototipo debería usar:

```js
Orbit.ui.today()
```

### P2 — `primaEst` usa `p.prima`

En recuperación comercial usa:

```js
primaEst: p ? (p.prima || 0) : 0
```

Como estimación comercial es aceptable, pero debe quedar claro que no es producción ni comisión. Para producción/metas debe seguir `primaNeta recaudada`.

---

## Correo

Archivos:

```txt
orbit360-platform/core/correo.js
orbit360-platform/modules/correo.js
```

Validaciones positivas:

- La UI muestra `sin cuenta conectada` cuando no hay proveedor.
- `core/correo.js` ya no usa remitente demo productivo.
- La capa central `Orbit.correo` mantiene un solo punto de integración futura.
- Correo puede vincularse a cliente, póliza, gestión, reclamo o aseguradora.

Pendiente P1:

### Redactar correo todavía usa botón “Enviar”

Aunque `core/correo.js` ya registra `Correo preparado`, el módulo `correo.js` sigue usando etiqueta de botón:

```txt
Enviar
```

y carpeta:

```txt
enviados
```

Impacto:

- Puede parecer envío real aunque solo se registre preparación local si no hay proveedor conectado.

Corrección recomendada:

- Si `cfg.conectado === false`:

```txt
Botón: Preparar correo
Carpeta/estado: Preparados
Toast: Correo preparado · envío real pendiente de cuenta conectada
```

- Si `cfg.conectado === true` pero no hay confirmación proveedor:

```txt
Correo registrado para envío · confirmar estado con proveedor
```

### Conectar correo puede marcar conectado solo con cuenta digitada

`conectar()` permite escribir cuenta y llama `C().conectar(...)`.

Riesgo:

- Puede simular OAuth real.

Corrección recomendada:

```txt
Cuenta configurada para conexión
OAuth/backend pendiente
```

No marcar `conectado: true` hasta flujo real OAuth/backend.

---

## Pólizas

Archivo:

```txt
orbit360-platform/modules/polizas.js
```

Validaciones positivas:

- Filtro de estados incluye `Requiere validación`.
- KPI Pólizas vigentes usa solo `Vigente` / `Por renovar`.
- Histórico/sin cartera separa `Cancelada`, `Vencida`, `Anulada`, `Rechazada`.
- Desglose muestra prima neta, gastos, IVA/impuestos, total, recibos y fuente.
- Muestra si genera cartera o es histórico sin cartera.

Pendiente P1/P2 ya conocido:

- KPI `Prima vigente` usa `p.prima` y no `primaNeta`.
- El pie dice `anualizada`, no producción; por eso no es P0.
- Si el KPI se usa comercialmente como producción/meta, debe cambiarse a `primaNeta`.

Recomendación:

```txt
Renombrar a Prima total vigente anualizada
```

o calcular sobre:

```js
p.primaNeta || p.prima
```

con etiqueta `prima neta`.

---

## Cliente 360

Archivo:

```txt
orbit360-platform/modules/cliente360.js
```

Validaciones positivas:

- Ya incluye helper `esRenovable` para `Vigente` / `Por renovar`.
- El estado de cobros distingue:

```txt
Reportado por cliente
En revisión
Validada por confirmar
Pagado por conciliar
Conciliado
Requiere validación
Bloqueado
```

- Correos del cliente leen desde `Orbit.correo.deCliente`.
- Renovaciones y comparativos están integrados al expediente.
- Endosos quedan en historial de póliza y actividad.

Pendientes P1/P2:

### P1 — redactar desde Cliente360 usa `Orbit.correo.enviar` directo

En la pestaña correos, el botón redactar llama directamente a:

```js
Orbit.correo.enviar(...)
```

Aunque la capa ya registra preparado, UX puede parecer envío real si no entra por el drawer de Correo.

Corrección recomendada:

```js
window.__orbitCompose = {...};
location.hash = '#/correo';
```

para abrir el compositor y mantener estado honesto.

### P2 — comparativo de renovación dice “Enviar comparativo al cliente”

El botón genera correo con `Orbit.correo.enviar` y toast `comparativo preparado`, lo cual es mejor, pero el texto del botón debería decir:

```txt
Preparar comparativo para cliente
```

si no hay correo conectado.

### P2 — Endoso importado dice Drive del cliente

El texto indica que el documento quedará en Drive del cliente. Si Drive/Storage no está conectado, debería decir:

```txt
quedará registrado para carga/conexión documental
```

---

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado:

```txt
Historial es trazabilidad, no confirmación de ejecución.
Cancelación es histórico; recuperación es oportunidad/lead, no cartera automática.
Correo preparado no es enviado real.
Conectar cuenta no es OAuth real si no hay backend.
Pólizas activas/históricas deben mantenerse separadas.
Cliente 360 debe usar estados honestos en comunicaciones y endosos.
```

- Debe compartirse con Claude: Sí.
- Módulos impactados:

```txt
historial
cancelaciones
correo
cliente360
polizas
portal
plantillas
automatizaciones
academia
```

- Texto/estado UI requerido:

```txt
Correo preparado
Cuenta pendiente de conexión OAuth/backend
Recuperación comercial enviada a Leads
Reemisión operativa creada en Ops
Histórico sin cartera
Prima total vigente anualizada
Prima neta recaudada
Documento registrado / Storage pendiente
```

- Academia impactada:

```txt
Trazabilidad vs acción confirmada.
Cancelación vs recuperación vs reemisión.
Correo preparado vs enviado por proveedor.
Pólizas activas vs históricas.
Prima neta vs total vigente.
Endosos: registro manual/documental vs documento cargado real.
```

---

## Hotfix recomendado siguiente

Paquete pequeño:

```txt
fix(ays): honestidad correo cliente360 cancelaciones historial v1330
```

Cambios:

1. Historial: ampliar `TIPOS` con `recuperacion`, `siniestro`, `correo`.
2. Cancelaciones: toast `Leads` vs `Ops`; usar `Orbit.ui.today()`.
3. Correo: si no hay cuenta real conectada, botón `Preparar correo`, no `Enviar`.
4. Correo: conectar cuenta debe quedar como `pendiente OAuth/backend`, no conectado real.
5. Cliente360: redactar correo debe abrir compositor, no llamar envío directo.
6. Cliente360: botón comparativo debe decir `Preparar comparativo`.
7. Cliente360: texto endoso importado no debe prometer Drive si no está conectado.
8. Polizas: decidir etiqueta/cálculo de `Prima vigente` para evitar confusión con producción.

## Estado

```txt
Cierre parcial auditado.
Sin P0 de backend protegido.
Con P1 de honestidad operativa en correo/cliente360/cancelaciones.
Pendiente validación local de hotfix anterior.
```
