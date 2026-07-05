# Contrato backend — Bandeja `conciliaciones` A&S

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** contrato técnico + validador metadata-only.

---

## 1. Objetivo

Definir la estructura segura para una bandeja backend de conciliaciones antes de modificar `cobros`, `comisiones`, `polizas`, `cartera`, `Portal Cliente`, `Cliente360` o `finanzas`.

La bandeja permite revisar propuestas generadas por:

```txt
manifest validado -> dryRunReport validado -> score de conciliación -> propuesta trazable
```

sin aplicar pagos automáticamente.

Herramientas agregadas:

```txt
tools/orbit360-validar-conciliacion-propuesta-ays.mjs
tools/orbit360-test-validar-conciliacion-propuesta-ays.mjs
```

---

## 2. Fuentes autorizadas

Solo pueden generar propuestas de conciliación:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

No pueden generar propuestas directas:

```txt
clientes
aseguradoras
polizas
vehiculos
financiero_historico
documentos_soporte
configuracion_catalogo
```

---

## 3. Colección sugerida

Colección backend/LAB sugerida:

```txt
conciliaciones
```

Ruta multi-tenant equivalente según backend activo:

```txt
tenantId/{tenantId}/conciliaciones/{proposalId}
```

o la ruta documental futura:

```txt
tenants/{tenantId}/data/conciliaciones/{proposalId}
```

La ruta final depende del adapter LAB/real vigente. La regla esencial es tenant isolation.

---

## 4. Campos mínimos

```txt
id / proposal_id
tenantId / tenant_id
source_type
manifest_id / manifest_ref
dryrun_id / dryrun_ref
source_ref.file
source_ref.sheet
source_ref.row_ref / fila / row_hash
pais
moneda
score
score_decision
proposed_action
queue_state
review_state
links.poliza_id
links.cobro_id
links.comision_id
createdAt
updatedAt
```

`links` puede ser parcial. Si no hay póliza/cobro/comisión vinculada, la propuesta queda en revisión manual.

---

## 5. Estados de bandeja

```txt
PROPUESTA
EN_REVISION
VALIDADA
RECHAZADA
APLICADA
BLOQUEADA
ANULADA
```

Reglas:

- Una propuesta recién generada no puede venir como `APLICADA`.
- `APLICADA` solo se alcanza después de flujo aprobado posterior.
- `BLOQUEADA` no puede proponer acción aplicativa.
- `ANULADA` conserva auditoría, no borra trazabilidad.

---

## 6. Estados de revisión

```txt
PENDIENTE
REQUIERE_VALIDACION
VALIDADA
RECHAZADA
BLOQUEADA
```

Uso esperado:

- `PENDIENTE`: propuesta lista para revisión.
- `REQUIERE_VALIDACION`: falta evidencia o hay inconsistencia parcial.
- `VALIDADA`: un usuario/proceso aprobado confirmó la propuesta.
- `RECHAZADA`: no corresponde aplicar.
- `BLOQUEADA`: riesgo o contradicción fuerte.

---

## 7. Decisiones score y acciones

Decisiones permitidas:

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

- `MATCH_EXACTO` propone aplicación con confirmación.
- `MATCH_PROBABLE` propone revisión.
- `REQUIERE_VALIDACION` entra a bandeja de validación.
- `BLOQUEADO` solo permite `NO_APLICAR`.

---

## 8. Prohibiciones

Una propuesta de conciliación no puede traer:

```txt
write_enabled=true
apply_payment=true
aplicar_pago=true
rows/rawRows/normalizedRows/previewRows/sampleRows
payload/rawPayload/rawData/cellValues
secret/token/apiKey/webhook
```

Tampoco puede modificar directamente:

```txt
cobros
polizas
clientes
comisiones
finmovs
cartera
produccion
```

---

## 9. País/moneda

Regla vigente:

```txt
GT => GTQ
CO => COP
```

Si la combinación es incoherente, se bloquea la propuesta.

No sumar monedas en crudo. En vista global, separar por país/moneda o declarar normalización.

---

## 10. Flujo esperado

```txt
1. Parser lee fuente.
2. Manifest valida estructura.
3. dryRunReport valida conteos y candidatos.
4. Score clasifica coincidencia.
5. Se crea propuesta en conciliaciones.
6. Usuario/proceso revisa.
7. Solo después de validación se ejecuta aplicación controlada.
8. La aplicación deja auditLog y actualiza cobro/comisión si corresponde.
```

La fase 7-8 queda pendiente. Este bloque solo define y valida propuestas.

---

## 11. Impacto en UI/Claude

Claude debe mostrar:

```txt
Exacto
Probable
Requiere validación
Bloqueado
```

Y estados:

```txt
Propuesta
En revisión
Validada
Rechazada
Aplicada
Bloqueada
Anulada
```

No debe mostrar como pagado/aplicado un registro que solo está propuesto o reportado.

---

## 12. Uso esperado

```txt
node tools/orbit360-validar-conciliacion-propuesta-ays.mjs --proposal ruta/propuesta.local.json
node tools/orbit360-test-validar-conciliacion-propuesta-ays.mjs
```

Los reportes se escriben en:

```txt
_orbit360_reports
```

---

## 13. Pendiente siguiente

Diseñar el flujo de aplicación controlada:

```txt
propuesta VALIDADA -> aplicar cobro/comisión -> auditLog -> notificación -> actualización de Portal/Cliente360/Cobros
```

sin saltarse revisión ni trazabilidad.
