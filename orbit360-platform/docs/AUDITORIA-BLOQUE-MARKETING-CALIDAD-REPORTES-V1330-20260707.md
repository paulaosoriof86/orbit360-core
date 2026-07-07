# Auditoría bloque Marketing/Calidad/Reportes post-v1330 — 2026-07-07

## Estado

```txt
Repo: paulaosoriof86/orbit360-core
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
Merge: no
Deploy: no
Main: no tocado
```

## Archivos revisados

```txt
orbit360-platform/modules/marketing.js
orbit360-platform/modules/calidad.js
orbit360-platform/modules/reportes.js
```

## Resultado ejecutivo

No se detectó P0 de backend protegido.

Los tres módulos son útiles para SaaS comercializable y deben compartirse con Claude como patrones reutilizables, pero hay P1/P2 de honestidad operativa y moneda:

```txt
P1 — Calidad abre WhatsApp directo y campaña dice “demo”. Debe alinearse con estados preparados/pendientes.
P1 — Reportes programa correo como si la integración enviara, pero solo guarda programación local.
P1 — Reportes agrupa y suma importes parseados con moneda actual; puede mezclar monedas.
P1 — Reportes Siniestros usa moneda actual para reclamado/aprobado, no moneda real del cliente/reclamo.
P2 — Marketing fallback de IA dice “Borrador generado con IA” aunque fue fallback sin IA.
P2 — Marketing “Programado/Publicado” debe distinguir intención/registro local frente a publicación real por proveedor.
```

---

## Marketing — validaciones positivas

Archivo:

```txt
orbit360-platform/modules/marketing.js
```

Validado:

- Calendario mensual real sobre `Orbit.store('contenidos')`.
- Importación de calendario usa `Orbit.importa.open('calendario-marketing')`.
- Registra eventos de integración mediante `Orbit.integraciones.emit`.
- `integrationMsg()` diferencia pendiente de configuración y pendiente de backend.
- Crear pieza y programar usan proveedores preferidos (`canva`, `metricool`) como evento, no llamada directa.
- Historial de eventos se lista por contenido.

Pendientes:

### P2 — fallback sin IA marcado como IA

En `generarMes()`, si no hay IA, se usa fallback, pero el texto guardado dice:

```txt
Borrador generado con IA — revisa el tono antes de programar.
```

Debe cambiar a estado honesto:

```txt
Borrador sugerido automáticamente — revisa el tono antes de programar.
```

o diferenciar:

```txt
Borrador generado con IA
Borrador generado por plantilla local
```

### P2 — estado de publicación

El módulo permite estados `Idea`, `Programado`, `Publicado`, `Medido`.

Regla reusable para Claude/backend:

```txt
Programado local ≠ programado confirmado por Metricool.
Publicado manual/local ≠ publicación confirmada por proveedor.
```

Debe existir campo futuro:

```txt
integracionEstado: pendiente_configuracion | pendiente_backend | registrado | confirmado | fallido
```

---

## Calidad de datos — validaciones y pendientes

Archivo:

```txt
orbit360-platform/modules/calidad.js
```

Validado:

- Prioriza clientes con póliza `Vigente` o `Por renovar`.
- Detecta faltantes en teléfono, dirección, correo, fecha nacimiento y sexo.
- Permite completar datos inline usando `Orbit.store.update`.
- Mantiene foco correcto: clientes con póliza vigente primero.

Pendientes:

### P1 — WhatsApp directo sin trazabilidad

La acción WA abre `wa.me` directo. Debe alinearse con `Orbit.notify`:

```txt
Chat abierto en WhatsApp Web; confirma el envío en WhatsApp.
```

Además debe registrar actividad si corresponde.

### P1 — Campaña dice demo

`campana()` muestra:

```txt
Campaña de actualización (demo)
```

La UI cliente no debe mostrar `demo`. Debe ser:

```txt
Campaña preparada para revisión
```

Y aclarar:

```txt
El envío real depende del canal/proveedor conectado.
```

---

## Reportes — validaciones y pendientes

Archivo:

```txt
orbit360-platform/modules/reportes.js
```

Validado:

- Reportes se construyen desde datos vivos.
- Incluye producción, cartera, comisiones, renovaciones, siniestros y cancelaciones.
- Exporta CSV/Excel/PDF localmente.
- Tiene análisis ejecutivo con IA/fallback.

Pendientes:

### P1 — Programar reporte afirma integración de correo

Texto actual:

```txt
Se envía por la integración de correo configurada.
```

Pero el código solo inserta `reportes_prog` y muestra toast de programado.

Corrección recomendada:

```txt
Queda programado en Orbit. El envío real requiere correo/backend conectado.
```

Toast:

```txt
Reporte programado en Orbit · envío pendiente de proveedor conectado
```

### P1 — agrupaciones pueden sumar monedas crudas

La agrupación detecta columnas numéricas parseando strings monetarios y suma con `Orbit.q.monedaPais()`.

Riesgo:

```txt
GTQ + COP pueden sumarse crudo si el reporte incluye varios países.
```

Corrección recomendada:

- No sumar columnas monetarias si `Orbit.pais === 'TODOS'`, o
- agrupar por moneda primero, o
- separar por país/moneda, o
- mostrar advertencia `Resumen monetario deshabilitado para múltiples monedas`.

### P1 — Reporte de siniestros usa moneda actual

En reporte `siniestros`, reclamado/aprobado se muestra con `Orbit.q.monedaPais()`, no con moneda real del cliente/reclamo.

Corrección recomendada:

```js
const cli = S().get('clientes', r.clienteId) || {};
U.money(r.montoReclamado, cli.moneda || Orbit.q.monedaPais())
U.money(r.montoAprobado || 0, cli.moneda || Orbit.q.monedaPais())
```

---

## Impacto Claude / prototipo reutilizable

- Patrón reusable detectado:

```txt
Marketing: evento registrado no equivale a pieza creada/publicada por proveedor.
Calidad: campaña preparada no equivale a enviada.
Reportes: programación local no equivale a envío real.
Reportes: no sumar monedas mezcladas.
```

- Debe compartirse con Claude: Sí.
- Módulos impactados:

```txt
marketing
calidad
reportes
notificaciones
correo
automatizaciones
academia
configuracion
```

- Texto/estado UI requerido:

```txt
Evento registrado para integración
Pendiente de proveedor conectado
Campaña preparada
Programado en Orbit
Publicación confirmada por proveedor
Resumen monetario no disponible con múltiples monedas
Borrador por plantilla local
Borrador generado con IA
```

- Academia impactada:

```txt
Diferenciar automatización registrada vs ejecución real.
Diferenciar publicación programada local vs publicada por proveedor.
Diferenciar campaña preparada vs enviada.
Leer reportes por país/moneda.
Usar IA como apoyo y revisar tono antes de publicar.
```

## Hotfix recomendado posterior

Paquete sugerido:

```txt
fix(ays): honestidad marketing calidad reportes v1330
```

Cambios:

1. Marketing: cambiar fallback `Borrador generado con IA` si no hubo IA.
2. Marketing: reforzar estados de integración en programar/publicar.
3. Calidad: WA con trazabilidad o `Orbit.notify`.
4. Calidad: quitar `demo` de campaña y decir preparada/pendiente de proveedor.
5. Reportes: programación local no afirma envío real.
6. Reportes: proteger sumas monetarias multi-moneda.
7. Reportes: siniestros usa moneda del cliente/reclamo.

## Estado

```txt
Bloque auditado.
Sin P0.
Con P1/P2 de honestidad operativa y moneda para hotfix posterior.
```
