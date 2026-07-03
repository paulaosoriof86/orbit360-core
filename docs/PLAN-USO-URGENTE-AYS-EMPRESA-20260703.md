# Plan urgente de uso interno A&S — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Objetivo:** empezar a usar Orbit 360 en A&S lo antes posible sin esperar producción completa.  
**Tipo:** LAB operativo interno controlado, no producción pública.

## 1. Corrección de enfoque

El plazo de 2–3 semanas aplica a producción comercializable segura con hardening, Storage/Drive, integraciones reales, IA backend completa, reglas finales y pruebas completas.

Para empezar a usar en la empresa, el objetivo debe ser más corto:

```txt
LAB A&S operativo interno primero, producción completa después.
```

## 2. Meta urgente

Tener un entorno A&S interno que permita:

- consultar clientes;
- consultar pólizas;
- ver cartera/cobros;
- cargar o importar aseguradoras;
- validar recibos;
- revisar comisiones base;
- usar Cliente 360 como expediente inicial;
- evitar duplicar ingresos;
- registrar pendientes por revisar.

No debe esperar todavía:

- automatizaciones completas;
- IA backend total;
- PWA avanzada;
- integración total con WhatsApp/correo;
- Storage/Drive final;
- producción pública.

## 3. Tiempo ajustado para uso interno

### Corte 1 — LAB interno básico usable

**Objetivo:** 24–48 horas de trabajo efectivo si se trabaja sin volver a reiniciar por prototipos.

Entregables:

- rama A&S/backend activa;
- contrato de datos mínimo;
- dataset inicial controlado o importación parcial;
- aseguradoras cargadas;
- clientes/pólizas/cobros base;
- reporte de registros importados/pendientes;
- regla recaudo vs `finmovs` protegida;
- smoke básico documentado.

### Corte 2 — Operación interna más útil

**Objetivo:** 3–5 días efectivos.

Entregables:

- flujo Cliente 360 → Póliza → Cobro → Comisión;
- importador revisable;
- deduplicación básica;
- cartera filtrada vigente/por renovar;
- liquidación preliminar asesores;
- facturas/planillas en revisión;
- control por país GT/CO.

### Corte 3 — LAB cercano a producción

**Objetivo:** 7–10 días efectivos.

Entregables:

- Auth LAB;
- roles;
- Storage/Drive básico;
- Make/correo/WhatsApp prioritarios;
- IA backend priorizada para importadores;
- reglas de seguridad;
- smoke por módulo crítico.

## 4. Priorización para empezar ya

### Hacer ahora

1. Crear/validar contrato mínimo.
2. Preparar plantilla de importación A&S.
3. Cargar directorio aseguradoras.
4. Cargar clientes base.
5. Cargar pólizas/recibos.
6. Validar cartera vigente.
7. Validar Cliente 360.
8. Documentar registros dudosos.

### No bloquear el primer uso por esto

- PWA avanzada.
- Integraciones de marketing.
- IA avanzada en todos los módulos.
- Comparativos complejos.
- Automatizaciones no críticas.
- Portal cliente externo completo.

## 5. Reglas para no romper backend al incorporar prototipos

- Cada ZIP Claude entra como mini-release.
- No se reemplaza `data/store.js` backend A&S.
- No se reemplazan tenant/config/secrets.
- No se mezclan ramas de prototipo con rama A&S/backend.
- Todo hallazgo de backend que afecte frontend se documenta para Claude.

## 6. Estado

**Estado:** ACTIVO.  
**Rama vigente:** `ays/backend-tenant-continuidad-20260703`.  
**Siguiente acción:** preparar matriz de importación inicial A&S y smoke mínimo.
