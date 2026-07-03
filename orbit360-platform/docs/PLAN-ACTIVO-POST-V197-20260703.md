# Plan activo post v1.97 · Orbit 360

**Fecha:** 2026-07-03  
**Rama de trabajo:** `ays/backend-tenant-lab-v99-20260703`  
**Base de prototipo:** Claude v1.97  
**Estado:** plan activo para retomar sin reiniciar metodologia.

---

## 1. Decision de control

La vuelta de Auth LAB queda cerrada como bloqueo operativo temporal. No debe seguir consumiendo el plan del dia.

- Demo v1.97: utilizable para revision funcional.
- LAB Firestore: queda como P0 backend pendiente de smoke automatizado real.
- No se continua pidiendo bloques largos a Paula.
- No se entregan ZIPs one-click bloqueables.
- No se usa `git clean`.
- No se asume Python.

---

## 2. Objetivo inmediato

Retomar el plan original:

1. Usar v1.97 como base actual del prototipo.
2. Continuar backend sin romper empalme.
3. Avanzar Modulo Marketing / Integraciones / datos vivos.
4. Documentar pendientes reales de Claude sin arrastrar cerrados.
5. Preparar proxima entrega a Claude solo cuando Paula la solicite.

---

## 3. Frente A · Prototipo Claude

**Estado v1.97:** auditado.

Cerrado por Claude:

- factura comision a aseguradora como CxC,
- `finmov` solo al cobro,
- IA centralizada,
- seed/chrome ficticio,
- comision asesor unificada,
- fechas vivas.

Abierto para Claude:

- Renovaciones multiaseguradora y solicitud de propuestas.
- Integraciones reales Outlook/Gmail/Green API/Sheets/Make.
- Academia con recursos grandes y cursos por rol.
- Marketing con ficha diaria profunda.
- Reportes y Orbit IA.
- Localizacion/glosario por tenant.
- Responsive global.

Fuente viva:

- `docs/AUDITORIA-PROTOTIPO-CLAUDE-V197-20260703.md`
- `docs/PENDIENTES-CLAUDE-POST-V197-20260703.md`

---

## 4. Frente B · Backend ChatGPT/Codex

Avances ya aplicados:

- empalme v1.97 sobre backend LAB,
- Firestore LAB v1.74 con `writeQueue/writeErrors`,
- `auth.js` dual demo + Firebase LAB corregido,
- documentacion de errores reincidentes,
- protocolo de automatizacion local.

Pendiente backend real:

1. Smoke LAB automatizado sin carga manual.
2. Estado de escrituras fallidas en UI/diagnostico backend.
3. Preparar `facturas`/CxC como coleccion backend real.
4. Preparar Make webhooks por evento.
5. Preparar Integraciones Outlook/Gmail/Green API/Sheets por Config.
6. Preparar importacion real de A&S por etapas.

---

## 5. Frente C · Marketing operativo

El modulo Marketing no debe quedarse solo como calendario simple. Prioridad actual:

### C1. Documentar alcance funcional requerido para Claude

Ficha por dia debe incluir:

- fecha,
- objetivo,
- campana,
- publico/segmento,
- ramo/producto,
- pais,
- canal/red,
- pieza/contenido,
- copy,
- responsable,
- estado,
- aprobacion,
- programacion,
- URL/pieza/Drive,
- stats por canal,
- leads generados,
- accion siguiente.

### C2. Backend/Integracion

Preparar estructura de datos viva:

- `contenidos`,
- `campanas`,
- `piezas`,
- `metricasMarketing`,
- `automatizaciones`,
- `integraciones`.

No hardcodear A&S; todo por tenant.

### C3. Integraciones

Prioridad:

1. Make como puente.
2. Google Sheets para calendario/contenidos.
3. Metricool para programacion/stats.
4. Mailchimp para campanas.
5. WhatsApp/Green API via Make.
6. Outlook/Gmail para envio o seguimiento.

---

## 6. Frente D · Uso comercial / datos A&S

Orden de migracion cuando se retome datos reales:

1. aseguradoras GT/CO,
2. clientes,
3. polizas,
4. vehiculos,
5. recibos/cobros,
6. estados de cuenta,
7. planillas de comisiones,
8. historico financiero,
9. siniestros,
10. calendario contenidos.

Reglas protegidas:

- poliza vigente/por renovar genera recibos/cartera,
- cancelada/vencida no genera cartera actual,
- factura a aseguradora = CxC,
- `finmov` solo con movimiento real de dinero,
- comisiones/metas/produccion sobre prima neta recaudada,
- pais/moneda no se mezclan.

---

## 7. Proxima accion inmediata

La siguiente accion de ChatGPT/Codex debe ser una de estas, sin pedir mas bloques largos:

1. Profundizar Marketing desde GitHub: auditoria de `modules/marketing.js`, esquema de datos y documento de especificacion para Claude/backend.
2. Preparar backend de integraciones por eventos Make desde documentacion, sin secretos.
3. Preparar plan de migracion de datos A&S por archivos cargados, sin importar aun datos reales.
4. Crear checklist de smoke visual v1.97 para que Paula valide en demo normal sin Firestore LAB.

---

## 8. Estado

**ACTIVO.**

Este documento es la referencia para retomar el hilo en esta o una nueva conversacion sin cambiar nuevamente el plan.
