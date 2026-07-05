# Contrato backend — Ejecutor LAB de persistencia `conciliaciones`

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** ejecutor deshabilitado por defecto agregado con modo dry-run y modo LAB local controlado.

---

## 1. Objetivo

Cerrar el siguiente eslabón del flujo seguro de conciliación:

```txt
manifest validado -> dryRunReport validado -> score -> propuestas conciliaciones -> plan persistencia -> ejecutor LAB -> auditLog
```

Este bloque permite tomar un plan validado de persistencia y convertirlo en documentos de:

```txt
conciliaciones
auditLog
```

sin tocar:

```txt
cobros
comisiones
polizas
finmovs
clientes
vehiculos
documentos
recibos
```

---

## 2. Herramientas agregadas

```txt
tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs
tools/orbit360-test-ejecutar-persistencia-conciliaciones-lab-ays.mjs
```

---

## 3. Principio de seguridad

El ejecutor está **deshabilitado por defecto**.

Modo predeterminado:

```txt
--mode dry-run
```

En `dry-run`:

- valida el plan;
- prepara escrituras planeadas;
- genera reporte;
- no escribe mirror local;
- no escribe Firestore;
- no toca `Orbit.store`;
- no modifica `cobros`;
- no aplica pagos.

Para materializar en LAB local se exige:

```txt
--mode local-mirror --execute-lab CONFIRMO_ESCRITURA_LAB_CONCILIACIONES
```

Sin esa frase exacta, el modo `local-mirror` queda bloqueado.

---

## 4. Por qué local-mirror y no Firestore directo desde esta herramienta

Este bloque no sube secretos ni usa credenciales backend. Por eso no escribe directamente en Firestore desde Node.

El modo `local-mirror` materializa un espejo controlado en JSON para validar forma, trazabilidad y seguridad de los documentos antes de conectar un adapter real.

La integración Firestore real debe hacerse en una fase posterior usando:

```txt
Orbit.store insert/update compatible
Firestore LAB con tenant isolation
reglas revisadas
usuario LAB esperado
auditLog
```

---

## 5. Entradas esperadas

El ejecutor recibe un plan generado por:

```txt
tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs
```

El plan debe tener:

```txt
decision: PLAN_LISTO o PLAN_CON_ADVERTENCIAS
tenant_id: alianzas-soluciones
operations[]
operation.op: upsert_conciliacion_propuesta
operation.collection: conciliaciones
operation.document_id
operation.document
operation.audit_event
```

Si el plan viene con `errors`, queda bloqueado.

Si el plan viene como `PLAN_CON_ADVERTENCIAS`, requiere `--allow-warnings` para materialización local.

---

## 6. Bloqueos obligatorios

El ejecutor bloquea:

- plan sin tenant;
- plan con errores previos;
- decisión no ejecutable;
- operación sin `document_id`;
- operación duplicada;
- operación que intente ir a colección distinta de `conciliaciones`;
- operación con `queue_state: APLICADA`;
- operación con `validation.status: BLOQUEADO`;
- mismatch de tenant;
- falta de `audit_event`;
- payload/filas reales;
- secretos, tokens, API keys, webhooks, passwords o credenciales;
- banderas `write_enabled`, `writeEnabled`, `apply_payment`, `aplicar_pago`;
- cualquier intento de mutar colecciones operativas.

Colecciones operativas bloqueadas explícitamente:

```txt
cobros
comisiones
polizas
finmovs
clientes
vehiculos
documentos
recibos
```

---

## 7. Salidas

Genera reportes en:

```txt
_orbit360_reports/EJECUCION-PERSISTENCIA-CONCILIACIONES-LAB-AYS-*.json
_orbit360_reports/EJECUCION-PERSISTENCIA-CONCILIACIONES-LAB-AYS-*.txt
```

En modo local-mirror materializa:

```txt
_orbit360_reports/LAB-MIRROR-CONCILIACIONES-AYS.local.json
```

o la ruta indicada en:

```txt
--lab-store-out ruta/local.json
```

El mirror contiene:

```txt
conciliaciones[]
auditLog[]
meta
```

---

## 8. Uso esperado

Dry-run seguro:

```bash
node tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs --plan _orbit360_reports/PLAN-PERSISTENCIA-CONCILIACIONES-AYS.json --mode dry-run
```

Materialización LAB local:

```bash
node tools/orbit360-ejecutar-persistencia-conciliaciones-lab-ays.mjs \
  --plan _orbit360_reports/PLAN-PERSISTENCIA-CONCILIACIONES-AYS.json \
  --mode local-mirror \
  --execute-lab CONFIRMO_ESCRITURA_LAB_CONCILIACIONES \
  --lab-store-out _orbit360_reports/LAB-MIRROR-CONCILIACIONES-AYS.local.json
```

---

## 9. Pruebas sintéticas

Suite:

```txt
tools/orbit360-test-ejecutar-persistencia-conciliaciones-lab-ays.mjs
```

Casos cubiertos:

1. dry-run válido con 2 conciliaciones.
2. local-mirror sin token explícito bloqueado.
3. local-mirror con token explícito materializa mirror.
4. plan con errores previos bloqueado.
5. operación bloqueada no persistible.
6. propuesta `APLICADA` bloqueada.
7. tenant mismatch bloqueado.
8. payload/rawRows bloqueado.

Resultado local sintético:

```txt
Casos: 8
FAIL: 0
RESULTADO: OK
```

---

## 10. Lo que este bloque NO hace

Este bloque no:

- aplica pagos;
- cambia estado de cobros;
- cambia comisiones;
- modifica pólizas;
- genera producción;
- escribe finmovs;
- sube a Firestore directamente;
- requiere secretos;
- hace deploy;
- hace merge;
- escribe datos reales.

---

## 11. Siguiente bloque recomendado

Conectar el mirror/ejecutor con el adapter Firestore LAB real de forma deshabilitada por defecto:

```txt
plan validado -> ejecutor LAB Firestore -> conciliaciones/auditLog -> onSnapshot -> UI/bandeja
```

Antes de aplicar pagos/comisiones se debe completar:

```txt
VALIDADA -> validar transición -> aplicar cobro/comisión -> auditLog -> notificaciones
```

La aplicación sigue bloqueada hasta una fase posterior.