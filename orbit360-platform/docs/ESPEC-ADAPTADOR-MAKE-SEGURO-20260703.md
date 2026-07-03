# Especificación Adaptador Make Seguro · Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Base:** Claude v1.97  
**Estado:** diseño backend seguro, no activado.

---

## 1. Objetivo

Definir cómo Orbit 360 debe conectar eventos internos con Make sin que los módulos llamen proveedores externos directamente y sin exponer credenciales en frontend o GitHub.

Este diseño aplica inicialmente a Marketing, pero debe ser reutilizable por Cobros, Renovaciones, Pólizas, Siniestros, Finanzas, Academia y Portal.

---

## 2. Regla central

El flujo correcto es:

```text
Módulo funcional
→ Orbit.integraciones.emit(...)
→ eventosIntegracion
→ capa backend segura por tenant
→ Make
→ proveedor final
→ respuesta/estado
→ eventosIntegracion actualizado
```

Los módulos solo emiten eventos. La capa backend decide si el evento se envía, a qué proveedor y bajo qué configuración del tenant.

---

## 3. Seguridad obligatoria

Prohibido:

- guardar credenciales reales en frontend;
- guardar credenciales reales en GitHub;
- llamar Make directamente desde módulos;
- activar envíos reales en demo;
- mezclar tenants;
- disparar eventos sobre datos reales sin autorización.

Permitido en demo/LAB:

- registrar eventos;
- marcar `pendiente_configuracion`;
- mostrar diagnóstico;
- preparar estructura multi-tenant;
- trabajar solo con datos ficticios.

---

## 4. Colecciones base

El adaptador debe apoyarse en:

- `integraciones`: proveedores activos por tenant.
- `automatizaciones`: reglas por evento.
- `eventosIntegracion`: trazabilidad de cada disparo.

Estados mínimos:

- `pendiente_configuracion`
- `pendiente`
- `enviado`
- `confirmado`
- `error`

---

## 5. Eventos Marketing prioritarios

- `marketing_generar_pieza`: preparar pieza en Canva/Drive mediante Make.
- `marketing_programar_publicacion`: programar publicación en Metricool mediante Make.
- `marketing_sync_sheets`: sincronizar calendario desde Google Sheets o importador.
- `marketing_metricas_actualizadas`: recibir métricas y alimentar KPIs.

---

## 6. Eventos reutilizables fuera de Marketing

El mismo patrón debe servir para:

- `poliza_emitida`
- `cobro_vence`
- `cobro_vencido`
- `pago_aplicado`
- `renovacion_prox`
- `siniestro_creado`
- `lead_propuesta`
- `factura_emitida`
- `factura_cobrada`
- `curso_asignado`
- `certificacion_obtenida`

---

## 7. Fases

### Fase 1 · Ya hecho

- `Orbit.integraciones.emit(...)`
- `eventosIntegracion`
- diagnóstico core
- panel reutilizable
- Marketing emite eventos seguros
- seed demo para integraciones, campañas, piezas y métricas

### Fase 2 · Próxima ChatGPT/Codex

- definir contrato backend seguro;
- preparar simulación de envío con datos ficticios;
- actualizar estado de eventos;
- mantener todo desactivado por defecto.

### Fase 3 · Activación controlada

Solo con autorización expresa:

- configurar escenario Make LAB;
- enviar evento ficticio;
- registrar respuesta;
- documentar resultado;
- después evaluar datos reales.

---

## 8. Pendiente para Claude

Claude debe reflejar en UI:

- estado de integración por contenido/evento;
- botón para abrir panel diagnóstico;
- mensajes claros cuando falte configuración;
- diseño Orbit 360 sin notas técnicas visibles;
- configuración por tenant;
- no pedir credenciales reales en pantallas finales sin backend seguro.

---

## 9. Estado

**ABIERTO / DISEÑO BACKEND SEGURO.**

No hay envíos reales. La siguiente acción es preparar un contrato backend/mock LAB sin credenciales reales.
