# Contrato backend — Transiciones de `conciliaciones`

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** validador metadata-only agregado.

---

## 1. Objetivo

Definir y validar las transiciones permitidas para propuestas de conciliación antes de cualquier persistencia LAB o aplicación real.

Este contrato protege el flujo:

```txt
PROPUESTA -> EN_REVISION -> VALIDADA -> APLICADA
```

sin permitir saltos, aplicación automática, mezcla de moneda, payload real ni acciones sin actor/motivo.

Herramientas agregadas:

```txt
tools/orbit360-validar-transicion-conciliacion-ays.mjs
tools/orbit360-test-validar-transicion-conciliacion-ays.mjs
```

---

## 2. Alcance seguro

El validador:

- lee una transición metadata-only;
- valida tenant;
- valida proposal_id;
- valida estado origen y destino;
- valida país/moneda;
- valida score_decision;
- exige actor y rol;
- exige motivo suficientemente descriptivo;
- bloquea payload/filas reales/secrets;
- genera `audit_event` de transición validada;
- no escribe en `Orbit.store`;
- no escribe en Firestore;
- no aplica pagos;
- no modifica `cobros`, `comisiones`, `polizas`, `finmovs`, Portal ni Cliente360.

---

## 3. Estados permitidos

Estados de bandeja:

```txt
PROPUESTA
EN_REVISION
VALIDADA
RECHAZADA
APLICADA
BLOQUEADA
ANULADA
```

Estados de revisión:

```txt
PENDIENTE
REQUIERE_VALIDACION
VALIDADA
RECHAZADA
BLOQUEADA
```

---

## 4. Transiciones permitidas

```txt
PROPUESTA  -> EN_REVISION | BLOQUEADA | ANULADA
EN_REVISION -> VALIDADA | RECHAZADA | BLOQUEADA | ANULADA
VALIDADA -> APLICADA | RECHAZADA | ANULADA
RECHAZADA -> terminal
BLOQUEADA -> terminal
ANULADA -> terminal
APLICADA -> terminal
```

No se permite:

```txt
PROPUESTA -> APLICADA
PROPUESTA -> VALIDADA
EN_REVISION -> APLICADA
BLOQUEADA -> APLICADA
RECHAZADA -> APLICADA
ANULADA -> APLICADA
APLICADA -> cualquier otro estado
```

---

## 5. Reglas para `APLICADA`

Una propuesta solo puede pasar a `APLICADA` si:

```txt
from_queue_state = VALIDADA
score_decision != BLOQUEADO
existe target cobro_id/comision_id o apply_context.target_id
apply_context.write_enabled = true
apply_context.approved_by existe
actor.id/email/user_id existe
actor.role/rol existe
reason/motivo existe
país/moneda es coherente
```

El validador no aplica el pago. Solo valida si la transición sería aceptable para un futuro ejecutor controlado.

---

## 6. Reglas de país/moneda

```txt
GT => GTQ
CO => COP
```

Cualquier incoherencia bloquea la transición.

---

## 7. Bloqueos obligatorios

La transición queda bloqueada si contiene:

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
secret
token
apiKey
webhook
password
credential
```

También se bloquea si:

- falta tenant;
- falta proposal_id;
- falta actor;
- falta rol;
- falta motivo;
- falta país/moneda;
- el estado origen/destino es inválido;
- la transición no está permitida;
- `score_decision` es inválido;
- una propuesta `BLOQUEADO` intenta ir a otro estado distinto de `BLOQUEADA`.

---

## 8. Pruebas sintéticas

`tools/orbit360-test-validar-transicion-conciliacion-ays.mjs` cubre:

1. `PROPUESTA -> EN_REVISION` válido.
2. `EN_REVISION -> VALIDADA` válido.
3. `VALIDADA -> APLICADA` válido con contexto de aplicación controlada.
4. `PROPUESTA -> APLICADA` bloqueado.
5. `BLOQUEADO -> VALIDADA` bloqueado.
6. Falta de actor bloqueada.
7. País/moneda incoherente bloqueado.
8. Payload/rawRows bloqueado.

Resultado local aislado:

```txt
Casos: 8
FAIL: 0
RESULTADO: OK
```

---

## 9. Uso esperado

```txt
node tools/orbit360-validar-transicion-conciliacion-ays.mjs --transition ruta/transicion.local.json
node tools/orbit360-test-validar-transicion-conciliacion-ays.mjs
```

Salida:

```txt
_orbit360_reports/TRANSICION-CONCILIACION-AYS-*.json
_orbit360_reports/TRANSICION-CONCILIACION-AYS-*.txt
```

---

## 10. Siguiente paso backend

Construir ejecutor LAB deshabilitado por defecto:

```txt
plan persistencia validado -> guardar propuesta en conciliaciones -> auditLog
```

Luego, en una fase posterior:

```txt
propuesta VALIDADA -> validar transición -> aplicar cobro/comisión -> auditLog -> notificaciones
```

Ninguna fase debe aplicar pagos desde el importador sin validación explícita.