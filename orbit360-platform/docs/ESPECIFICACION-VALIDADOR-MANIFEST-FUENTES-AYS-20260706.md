# Especificación validador manifest fuentes A&S

**Fecha:** 2026-07-06  
**Estado:** especificación documental. El script ejecutable se agregará en bloque posterior.

---

## Objetivo

Validar un manifest declarativo de fuentes antes de cualquier lectura real.

---

## Validaciones mínimas

El manifest debe declarar:

```txt
tenantId = alianzas-soluciones
manifest_type = fuentes_reales_ays
plan_only = true
can_write_now = false
can_read_rows_now = false
allow_payload_in_repo = false
entries no vacío
```

Cada entrada debe declarar:

```txt
source_id
source_type
file_name
file_kind
declared_country
declared_currency
period_start
period_end
owner_module
allowed_effect
blocked_effects
requires_validation
traceability_required
notes
```

---

## Reglas de bloqueo

Bloquear si:

```txt
falta fuente
falta país o moneda confiable
GT no usa GTQ
CO no usa COP
MULTI intenta suma cruda
se declara escritura inmediata
banco intenta crear cobro aplicado
estado cliente intenta marcar pago realizado
financiero histórico intenta crear cartera/cobro/producción
planilla comisiones intenta crear cartera/cobro aplicado
documentos soporte intenta crear entidades directas
se incluyen filas o payload real
```

---

## Estado

Especificación creada porque la herramienta bloqueó la creación del script ejecutable. No se pierde la regla; queda documentada para el siguiente bloque.