# Contrato backend — Generación de propuestas de conciliación desde dryRunReport

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** herramienta segura metadata-only agregada.

---

## 1. Objetivo

Convertir un `dryRunReport` validado en propuestas listas para la bandeja `conciliaciones`, sin escribir en Firestore, sin tocar `Orbit.store` y sin aplicar pagos.

Este bloque une:

```txt
manifest validado -> dryRunReport validado -> score -> propuestas conciliaciones
```

Herramientas agregadas:

```txt
tools/orbit360-generar-propuestas-conciliacion-ays.mjs
tools/orbit360-test-generar-propuestas-conciliacion-ays.mjs
```

---

## 2. Alcance seguro

El generador:

- lee un `dryRunReport` metadata-only;
- valida fuente autorizada para conciliación;
- valida país/moneda;
- rechaza payload/filas reales;
- rechaza `write_enabled=true`;
- genera propuestas con ID estable;
- conserva trazabilidad archivo/hoja/fila/hash;
- conserva score, decisión y acción propuesta;
- calcula estado de bandeja y estado de revisión;
- no escribe Firestore;
- no escribe `Orbit.store`;
- no modifica `cobros`, `polizas`, `comisiones`, `finmovs`, `cartera` ni producción.

---

## 3. Fuentes permitidas

Solo genera propuestas desde:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

Bloquea otras fuentes, incluyendo:

```txt
financiero_historico
clientes
polizas
documentos_soporte
configuracion_catalogo
```

---

## 4. Entrada esperada

```txt
dryRunReport:
  tenant_id
  source_type
  manifest_id
  dryrun_id
  country
  currency
  source_ref
  candidates[]
```

Cada candidato debe poder aportar:

```txt
source_ref.file
source_ref.sheet
source_ref.row_ref / fila / row_hash
country/currency
score
score_decision
proposed_action
links opcionales
```

---

## 5. Salida generada

Cada propuesta queda con estructura:

```txt
id
proposal_id
tenant_id
source_type
manifest_id
dryrun_id
source_ref.file
source_ref.sheet
source_ref.row_ref
country
currency
score
score_decision
proposed_action
queue_state
review_state
links
origin_candidate_state
validation
createdAt
updatedAt
```

---

## 6. Reglas de estado

```txt
MATCH_EXACTO        -> PROPUESTA / PENDIENTE
MATCH_PROBABLE      -> EN_REVISION / PENDIENTE
REQUIERE_VALIDACION -> EN_REVISION / REQUIERE_VALIDACION
BLOQUEADO           -> BLOQUEADA / BLOQUEADA
```

Ninguna propuesta sale como `APLICADA`.

---

## 7. Reglas de acción

```txt
MATCH_EXACTO        -> PROPONER_APLICACION_CON_CONFIRMACION
MATCH_PROBABLE      -> PROPONER_REVISION
REQUIERE_VALIDACION -> ENVIAR_A_BANDEJA_VALIDACION
BLOQUEADO           -> NO_APLICAR
```

Si el dry-run trae acción válida, se respeta salvo en `BLOQUEADO`, que siempre queda `NO_APLICAR`.

---

## 8. Bloqueos

El generador bloquea:

```txt
write_enabled=true
rows/rawRows/normalizedRows/previewRows/sampleRows
payload/rawPayload/rawData/cellValues
secret/token/apiKey/webhook
país/moneda incoherente
fuente no autorizada
manifest faltante
tenant faltante
sin candidatos
```

---

## 9. Pruebas sintéticas

`tools/orbit360-test-generar-propuestas-conciliacion-ays.mjs` cubre:

1. generación de 3 propuestas desde planilla de comisiones;
2. bloqueo de fuente `financiero_historico`;
3. bloqueo por `write_enabled=true`;
4. bloqueo por `rawRows`;
5. bloqueo por país/moneda incoherente.

En prueba local aislada: **5 casos, 0 fallos**.

---

## 10. Uso esperado

```txt
node tools/orbit360-generar-propuestas-conciliacion-ays.mjs --dryrun ruta/dryrun.local.json
node tools/orbit360-test-generar-propuestas-conciliacion-ays.mjs
```

Salida:

```txt
_orbit360_reports/CONCILIACIONES-PROPUESTAS-AYS-*.json
_orbit360_reports/CONCILIACIONES-PROPUESTAS-AYS-*.txt
```

---

## 11. Relación con Firestore LAB

Este bloque todavía no persiste en Firestore. Prepara el payload seguro que luego podrá guardarse en colección `conciliaciones` mediante `Orbit.store` o adapter LAB, conservando tenant isolation.

Siguiente paso:

```txt
propuestas conciliaciones -> persistencia LAB controlada -> revisión -> aplicación controlada posterior
```

---

## 12. Impacto para Claude/UI

Claude debe reflejar que la bandeja recibe propuestas separadas. No debe mostrar como pago aplicado una propuesta generada por dry-run.

Debe distinguir:

```txt
Propuesta
En revisión
Requiere validación
Bloqueada
Validada
Rechazada
Aplicada solo después de aprobación real
```
