# Plan de trabajo actualizado — Backend Orbit 360 / A&S

**Fecha:** 2026-07-03  
**Objetivo:** terminar backend A&S con metodología ágil sin reiniciar por cada prototipo nuevo.  
**Regla base:** frontend/prototipo = Claude; backend/contratos/datos/Firestore/Auth/integraciones = ChatGPT/Codex.

## 1. Objetivo inmediato

Pasar de auditoría/documentación a ejecución controlada:

1. congelar contrato backend;
2. cargar/migrar base A&S en entorno LAB o dataset anonimizado;
3. validar flujo Cliente 360 → Pólizas → Cobros → Comisiones → Finanzas;
4. dejar reglas para incorporar prototipos nuevos sin perder backend.

## 2. Carriles de trabajo

### Carril 1 — Claude / Prototipo frontend

Claude debe encargarse de:

- UX, módulos, pantallas y comportamiento visual;
- correcciones de `localStorage` en módulos;
- PWA inteligente;
- consolidación de changelog y docs del ZIP;
- corrección de copy y contradicciones en documentos;
- uso de motor único de comisiones en Finanzas;
- importadores con preview/remap/iterar desde UI;
- mantener datos ficticios en prototipo.

### Carril 2 — ChatGPT/Codex / Backend

ChatGPT/Codex debe encargarse de:

- contrato `Orbit.store`;
- Firestore LAB;
- tenant isolation;
- Auth;
- reglas de seguridad;
- migración de datos A&S al backend o dataset anonimizado;
- integraciones reales;
- IA backend;
- documentación de todo en GitHub.

### Carril 3 — Lógica A&S

Se documenta separada porque no todo aplica al core:

- comisiones GT/CO;
- IVA GT/CO;
- facturas y períodos;
- USD/tasa/diferencia;
- estados de cuenta SIGA/aseguradoras;
- liquidaciones asesores;
- conciliación Jan-May / Jun-Jul;
- directorios reales de aseguradoras;
- reglas de cliente/póliza/recibo.

### Carril 4 — Core multi-tenant

Aplica a cualquier intermediario:

- tenant configurable;
- no hardcode cliente;
- moneda aislada por país;
- recaudo comercial separado de caja/banco;
- módulos desacoplados de almacenamiento;
- importador inteligente configurable;
- integraciones por tenant;
- roles/módulos por usuario.

## 3. Método para incorporar nuevos prototipos Claude

Cada ZIP nuevo entra así:

1. Extraer en sandbox.
2. Identificar versión real por bitácora, no solo por changelog.
3. Comparar contra última auditoría viva.
4. Registrar:
   - resuelto;
   - parcialmente resuelto;
   - no resuelto;
   - nuevo pendiente;
   - regresión;
   - mejora local que Claude debe absorber.
5. No tocar backend.
6. No empalmar completo hasta pasar compuerta.
7. Si se empalma, conservar:
   - `data/store.js` backend;
   - tenant/config backend;
   - reglas Firestore;
   - Auth;
   - `.env`/config local no versionada;
   - documentación de backend.

## 4. Compuerta de empalme

Un prototipo puede empalmarse al backend solo si cumple:

- no rompe la API `Orbit.store`;
- no introduce acceso directo a `localStorage` en módulos;
- no mezcla monedas;
- no convierte recaudo comercial en `finmov`;
- no borra docs backend;
- no hardcodea A&S;
- actualiza changelog/bitácoras;
- smoke básico de módulos críticos.

## 5. Fases y entregables

### Fase 0 — Control y documentación

**Duración:** inmediato / medio día.  
**Entregables:**

- auditoría corregida registrada;
- estado real de avance;
- plan actualizado;
- bitácoras creadas/actualizadas;
- backlog separado por carril.

### Fase 1 — Contrato backend definitivo

**Duración estimada:** 0.5–1 día.  
**Entregables:**

- `docs/CONTRATO-DATOS-BACKEND-ORBIT360.md`;
- colecciones y campos mínimos;
- path tenant;
- reglas `_emit`/onSnapshot;
- reglas recaudo/finmov;
- reglas comisiones;
- reglas de importación.

### Fase 2 — Firestore LAB estable

**Duración estimada:** 1–1.5 días.  
**Entregables:**

- adapter `Orbit.store` para Firestore LAB;
- tenant `alianzas-soluciones`;
- seed ficticio mínimo;
- smoke lectura/escritura;
- validación módulos críticos;
- reporte.

### Fase 3 — Migración base A&S controlada

**Duración estimada:** 1–2 días primer corte.  
**Entregables:**

- importación directorio aseguradoras;
- base clientes;
- pólizas;
- vehículos;
- recibos/cobros;
- reporte deduplicación;
- registros por revisar.

### Fase 4 — Recaudo, comisiones y finanzas A&S

**Duración estimada:** 2–3 días.  
**Entregables:**

- planillas/estados de cuenta;
- CxC aseguradora;
- CxP asesor;
- facturas con IVA;
- USD/tasa/diferencia;
- liquidación asesor con historial;
- no duplicidad de ingresos.

### Fase 5 — Auth/roles/seguridad LAB

**Duración estimada:** 1–2 días.  
**Entregables:**

- Firebase Auth o auth compatible;
- usuarios por correo;
- roles/módulos visibles;
- reglas por tenant;
- smoke permisos.

### Fase 6 — Integraciones reales

**Duración estimada:** 2–4 días según prioridad.  
**Entregables:**

- Make webhook;
- correo;
- WhatsApp;
- Drive/Storage;
- IA backend;
- pruebas por evento.

## 6. Priorización para terminar rápido

### Imprescindible para primer LAB útil

1. contrato datos;
2. Firestore store;
3. tenant isolation;
4. clientes/pólizas/cobros;
5. regla recaudo/finmov;
6. comisiones base;
7. smoke.

### Puede esperar después del primer LAB

- PWA inteligente avanzada;
- Metricool/Canva/Gamma/HeyGen;
- portal externo completo;
- IA avanzada en todos los módulos;
- integraciones no críticas.

## 7. Riesgos y mitigación

| Riesgo | Mitigación |
|---|---|
| Cada ZIP reinicia trabajo | mini-release + diff + compuerta |
| Pérdida de backend por empalme | conservar `data/store.js` backend y tenant |
| Duplicar ingresos | regla recaudo/finmov protegida |
| Datos reales en prototipo | datos reales solo backend/tenant o dataset anonimizado |
| Changelog desactualizado | bitácora viva + errata documental |
| Cambios locales no llegan a Claude | backlog vivo Claude obligatorio |

## 8. Estimación de terminación

Si se mantiene este método sin reinicios:

- **MVP LAB con datos base:** 3–5 días hábiles intensivos.
- **A&S funcional con comisiones/finanzas/Auth LAB:** 7–10 días hábiles.
- **Producción comercializable segura:** 2–3 semanas.

Si se siguen incorporando prototipos sin compuerta, el plazo se vuelve indefinido. La compuerta evita eso.

## 9. Próxima acción concreta

Crear `docs/CONTRATO-DATOS-BACKEND-ORBIT360.md` y empezar por colecciones esenciales:

- tenants;
- usuarios/asesores;
- clientes;
- pólizas;
- recibos/cobros;
- aseguradoras;
- vehículos;
- actividades;
- comisiones;
- finmovs;
- facturas;
- liquidaciones;
- documentos.

Luego ejecutar smoke de backend LAB antes de tocar Auth final.
