# Contrato backend — dryRunReport importador A&S

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** contrato técnico + validador metadata-only.

---

## 1. Objetivo

Definir y validar la salida obligatoria de `dryRunReport` antes de cualquier escritura real del importador.

El dry-run debe permitir que Paula revise qué pasaría con una importación sin que Orbit 360 cree, modifique, aplique pagos ni actualice cartera automáticamente.

Herramientas agregadas:

```txt
tools/orbit360-validar-dryrun-report-ays.mjs
tools/orbit360-test-validar-dryrun-report-ays.mjs
```

---

## 2. Restricciones

El validador:

- no escribe `Orbit.store`;
- no escribe Firestore;
- no hace deploy;
- no permite `write_enabled=true`;
- no permite filas reales embebidas;
- valida metadata, resumen, candidatos y decisiones.

Claves prohibidas dentro del reporte:

```txt
rows
rawRows
normalizedRows
previewRows
sampleRows
records
payload
rawPayload
rawData
cellValues
```

---

## 3. Campos mínimos del reporte

```txt
tenant_id / tenantId
source_type / sourceType / tipo_fuente
manifest_id / manifest_ref
source_ref / sourceRef
country / pais
currency / moneda
summary
candidates / candidatos / candidatos_conciliacion, si aplica
```

---

## 4. Resumen obligatorio

`summary` debe incluir conteos consistentes:

```txt
rows_total
rows_ready
rows_requires_validation
rows_blocked
rows_omitted
rows_probable_duplicate
```

La suma de los estados debe ser igual a `rows_total`.

Estados permitidos por fila/candidato:

```txt
LISTO
REQUIERE_VALIDACION
BLOQUEADO
OMITIDO
DUPLICADO_PROBABLE
```

---

## 5. Fuentes de conciliación

Si `source_type` es una fuente de conciliación, el reporte debe incluir candidatos metadata-only:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

Cada candidato debe incluir:

```txt
state
source_ref.file
source_ref.sheet
source_ref.row_ref / fila / row_hash
pais/moneda
score
score_decision
proposed_action
```

---

## 6. Decisiones score permitidas

```txt
MATCH_EXACTO
MATCH_PROBABLE
REQUIERE_VALIDACION
BLOQUEADO
```

Acciones permitidas:

```txt
PROPONER_APLICACION_CON_CONFIRMACION
PROPONER_REVISION
ENVIAR_A_BANDEJA_VALIDACION
NO_APLICAR
```

Reglas:

- `BLOQUEADO` solo puede proponer `NO_APLICAR`.
- `MATCH_EXACTO` debe proponer aplicación con confirmación, no aplicación directa.
- `REQUIERE_VALIDACION` debe ir a bandeja de validación.
- Ningún candidato aplica pagos por sí mismo.

---

## 7. País/moneda

Regla vigente:

```txt
GT => GTQ
CO => COP
```

Si la combinación es incoherente, el reporte queda bloqueado.

En vistas globales multi-país, el frontend debe separar por país o declarar explícitamente cualquier normalización; no sumar monedas en crudo.

---

## 8. Relación con migración real

Este contrato es el puente entre:

```txt
readStructure
buildManifest
validateManifest
previewRows
normalizeRows
validateRows
dryRunReport
writeToStore
```

`writeToStore` sigue deshabilitado hasta fase LAB real aprobada.

El dry-run debe producir evidencia suficiente para revisión humana, especialmente cuando la fuente sea:

- planilla de comisiones;
- planilla de aseguradora;
- estado bancario;
- cobros realizados.

---

## 9. Casos sintéticos cubiertos

`tools/orbit360-test-validar-dryrun-report-ays.mjs` cubre:

1. dry-run de conciliación válido;
2. bloqueo por conteo inconsistente;
3. bloqueo por país/moneda incoherente;
4. bloqueo por payload/filas reales;
5. advertencia por acción propuesta incoherente en `MATCH_EXACTO`;
6. dry-run de clientes sin candidatos de conciliación.

---

## 10. Uso esperado

```txt
node tools/orbit360-validar-dryrun-report-ays.mjs --report ruta/reporte.local.json
node tools/orbit360-test-validar-dryrun-report-ays.mjs
```

Los reportes se escriben en:

```txt
_orbit360_reports
```

---

## 11. Pendiente siguiente

Conectar este validador al parser/importador real para que cada fuente genere:

```txt
manifest validado + dryRunReport validado + bandeja de conciliación trazable
```

sin escritura automática.
