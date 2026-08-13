# Contrato backend — Plan de persistencia LAB para `conciliaciones`

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** herramienta segura plan-only agregada.

---

## 1. Objetivo

Preparar un plan de persistencia LAB para propuestas `conciliaciones`, sin escribir todavía en Firestore, sin tocar `Orbit.store`, sin modificar `cobros` y sin aplicar pagos.

Este bloque cubre:

```txt
propuestas conciliaciones -> plan de upsert tenant-safe -> validación -> futura ejecución LAB aprobada
```

Herramientas agregadas:

```txt
tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs
tools/orbit360-test-preparar-persistencia-conciliaciones-lab-ays.mjs
```

---

## 2. Alcance seguro

El preparador:

- lee un lote de propuestas metadata-only;
- valida tenant único;
- valida fuente autorizada;
- valida país/moneda;
- valida score, decisión y acción propuesta;
- valida estado de bandeja y estado de revisión;
- rechaza payload/filas reales;
- rechaza secretos/tokens/webhooks/API keys;
- elimina banderas de escritura o aplicación del documento normalizado;
- produce operaciones `upsert_conciliacion_propuesta`;
- produce `audit_event` de preparación;
- no escribe Firestore;
- no escribe `Orbit.store`;
- no modifica `cobros`, `polizas`, `comisiones`, `finmovs`, `cartera`, Portal ni producción.

---

## 3. Entrada esperada

El archivo puede ser:

```txt
{ proposals: [...] }
```

O un array directo de propuestas.

Cada propuesta debe incluir:

```txt
id / proposal_id
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
links opcionales
```

---

## 4. Salida generada

El plan contiene operaciones:

```txt
op: upsert_conciliacion_propuesta
collection: conciliaciones
tenant_id
document_id
path_hint: tenantId/{tenantId}/conciliaciones/{proposalId}
allowed_store_api: Orbit.store.insert/update only after LAB approval
document
audit_event
```

La ruta final depende del adapter LAB/real, pero la regla obligatoria es tenant isolation.

---

## 5. Estados persistibles

Para el plan LAB se permiten:

```txt
PROPUESTA
EN_REVISION
VALIDADA
RECHAZADA
BLOQUEADA
ANULADA
```

`APLICADA` no se prepara en este plan. La aplicación es un flujo posterior con autorización, auditLog y actualización controlada.

---

## 6. Bloqueos

El plan bloquea o marca operación no persistible si detecta:

```txt
payload/filas reales
secret/token/apiKey/webhook/password/credential
write_enabled=true
apply_payment=true / aplicar_pago=true
APLICADA como estado inicial
fuente no autorizada
país/moneda incoherente
score inválido
score_decision inválido
proposed_action inválida
queue_state no persistible
review_state inválido
id duplicado
tenant mezclado
```

---

## 7. Fuente autorizada

Solo se aceptan propuestas provenientes de:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

---

## 8. País/moneda

Regla vigente:

```txt
GT => GTQ
CO => COP
```

Si la combinación es incoherente, la operación queda bloqueada.

---

## 9. Pruebas sintéticas

`tools/orbit360-test-preparar-persistencia-conciliaciones-lab-ays.mjs` cubre:

1. plan válido con 2 operaciones;
2. propuesta `APLICADA` queda bloqueada internamente;
3. lote con `rawRows` bloquea todo;
4. tenant distinto a `--tenant` bloquea todo;
5. ID duplicado bloquea la operación duplicada;
6. fuente `financiero_historico` queda bloqueada internamente.

Resultado local aislado:

```txt
Casos: 6
FAIL: 0
RESULTADO: OK
```

---

## 10. Uso esperado

```txt
node tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs --proposals ruta/propuestas.local.json --tenant alianzas-soluciones
node tools/orbit360-test-preparar-persistencia-conciliaciones-lab-ays.mjs
```

Salida:

```txt
_orbit360_reports/PLAN-PERSISTENCIA-CONCILIACIONES-AYS-*.json
_orbit360_reports/PLAN-PERSISTENCIA-CONCILIACIONES-AYS-*.txt
```

---

## 11. Siguiente paso

Construir el ejecutor LAB aprobado:

```txt
plan validado -> Orbit.store insert/update en conciliaciones -> auditLog -> sin tocar cobros
```

Este ejecutor debe permanecer deshabilitado hasta aprobación explícita y smoke local.
