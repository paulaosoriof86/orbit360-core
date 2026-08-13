# Contrato — Manifest de fuentes reales A&S

**Fecha:** 2026-07-06  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** contrato plan-only; no abre archivos reales y no escribe datos.

---

## 1. Objetivo

Definir el manifest declarativo obligatorio para registrar fuentes reales antes de cualquier lectura/importación/migración.

El manifest sirve para saber qué archivo existe, qué fuente representa, qué país/moneda/periodo declara y qué trazabilidad mínima tendrá, sin procesar filas reales ni guardar payload en el repo.

---

## 2. Principio maestro

Antes de leer datos reales se debe registrar cada fuente como entrada separada.

No se permite:

```txt
inferir clientes desde movimientos financieros
inferir pólizas desde banco
escribir cartera desde financiero histórico
crear cobros desde estado bancario
mezclar fuentes en una sola tabla sin trazabilidad
sumar monedas en crudo
guardar filas reales en repo
subir payload sensible
```

---

## 3. Fuentes permitidas

```txt
clientes
aseguradoras
polizas
vehiculos
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
estado_cuenta_cliente
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
calendario_contenidos
manual_identidad
```

Cualquier fuente no listada queda como `REQUIERE_CLASIFICACION`.

---

## 4. Campos mínimos del manifest

Cada entrada debe tener:

```txt
manifest_id
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

Campos opcionales:

```txt
sheet_names_declared
header_row_declared
expected_columns_declared
source_priority
related_sources
```

---

## 5. Reglas país/moneda

- Guatemala: `GT` / `GTQ`.
- Colombia: `CO` / `COP`.
- Multi-país debe declararse como `MULTI` y no permite suma cruda.
- Si falta país o moneda: `REQUIERE_VALIDACION`.
- Moneda inferida por país puede sugerirse, pero no autoriza escritura.

---

## 6. Efectos permitidos por fuente

### clientes

Puede proponer creación/actualización de cliente solo si la fuente es explícita de clientes y hay diff revisable.

### aseguradoras

Puede alimentar catálogo/configuración de aseguradoras, contactos y accesos no sensibles.

### polizas

Puede proponer pólizas, recibos y cartera solo si estado, país, moneda y vigencia son confiables.

### cobros_realizados

Puede proponer cobros realizados, pero no mezclar con financiero histórico ni banco sin conciliación.

### planilla_comisiones

Puede proponer prima neta recaudada, comisiones y pagos aplicados por aseguradora, pero no crear cartera ni cobro aplicado sin conciliación.

### estado_cuenta_bancario

Puede proponer match bancario, pero no crear cobro aplicado.

### estado_cuenta_cliente

Puede proponer pendientes/diferencias, no pagos realizados.

### financiero_historico

Puede alimentar análisis histórico financiero, no cartera, no producción, no cobros.

### documentos_soporte

Solo propone datos/evidencias, nunca escribe entidades sin diff y confirmación.

---

## 7. Trazabilidad mínima obligatoria

```txt
file_name
source_type
sheet_name si aplica
row_number si aplica en fase posterior
block_id si aplica
period_start
period_end
declared_country
declared_currency
source_ref
created_at
review_status
```

El manifest no debe guardar filas reales ni muestras de datos sensibles.

---

## 8. Fuentes conocidas en esta sesión

Fuentes cargadas o disponibles como referencia, sin procesar payload:

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
AyS — Calendario Maestro Contenidos 2026 — Flujo híbrido.xlsx
Manual de Identidad Básica – Versión 1 – Vigente.docx
```

Estas fuentes aún deben registrarse en manifest antes de lectura real.

---

## 9. Estados del manifest

```txt
REGISTRADA
REQUIERE_VALIDACION
LISTA_PARA_LECTURA_CONTROLADA
BLOQUEADA
DESCARTADA
```

`LISTA_PARA_LECTURA_CONTROLADA` no significa autorizada para escritura.

---

## 10. Bloqueos

Bloquear si:

```txt
falta source_type
falta país/moneda confiable
source_type no coincide con efecto permitido
se declara write inmediato
se incluyen filas reales/payload
se pretende crear cobros desde banco
se pretende crear cartera desde financiero histórico
se mezclan GTQ y COP
se hardcodean datos reales
```

---

## 11. Impacto en Academia

Academia debe explicar:

- diferencia entre fuente, manifest, lectura controlada, propuesta, diff y escritura final;
- por qué no se mezclan fuentes;
- por qué banco no es cobro aplicado;
- por qué financiero histórico no es cartera;
- por qué documentos soporte solo proponen.

---

## 12. Estado

Contrato agregado. No se abrieron archivos reales, no se procesaron filas, no se escribieron datos, no se hizo deploy y no se hizo merge.