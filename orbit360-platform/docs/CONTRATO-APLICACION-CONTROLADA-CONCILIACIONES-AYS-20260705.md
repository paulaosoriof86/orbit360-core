# Contrato backend — Aplicación controlada desde `conciliaciones`

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** planificador plan-only agregado. No writes, no Firestore, no pagos, no mutación de `cobros/comisiones`.

---

## 1. Objetivo

Definir la antesala segura para una futura aplicación real de cobros/comisiones desde una propuesta `conciliaciones`.

Este bloque permite preparar un plan de aplicación controlada, pero no lo ejecuta.

Flujo protegido:

```txt
conciliacion VALIDADA
-> actor autorizado + motivo + frase explícita
-> plan de aplicación controlada
-> validación de transición VALIDADA -> APLICADA
-> futuro ejecutor autorizado
-> auditLog
```

---

## 2. Herramientas agregadas

```txt
tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs
tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs
```

---

## 3. Principio de seguridad

La herramienta es `plan-only`.

No hace:

- writes Firestore;
- writes `Orbit.store`;
- aplicación de pago;
- mutación de `cobros`;
- mutación de `comisiones`;
- cambio de estado de póliza;
- generación de producción;
- notificaciones;
- deploy;
- merge.

---

## 4. Entrada esperada

```bash
node tools/orbit360-preparar-aplicacion-controlada-conciliacion-ays.mjs \
  --proposal ruta/propuesta-validada.json \
  --actor ruta/actor-aprobador.json \
  --out _orbit360_reports/PLAN-APLICACION-CONTROLADA-CONCILIACION-AYS.json
```

La propuesta debe venir de `conciliaciones` y estar en:

```txt
queue_state: VALIDADA
```

El actor debe incluir:

```txt
id/email/uid
role/rol
reason/motivo
approval_phrase: CONFIRMO_PREPARAR_APLICACION_CONTROLADA
```

---

## 5. Reglas mínimas para preparar aplicación

La propuesta debe cumplir:

```txt
tenant_id = alianzas-soluciones
queue_state = VALIDADA
score_decision = MATCH_EXACTO | MATCH_PROBABLE | REQUIERE_VALIDACION
source_type autorizado
source_ref.file presente
source_ref.row_ref/fila presente
país/moneda coherente
monto positivo
target operativo presente
```

Targets permitidos:

```txt
cobros
comisiones
```

La herramienta acepta target por:

```txt
links.cobro_id
links.comision_id
links.target_collection + links.target_id
```

---

## 6. Fuentes autorizadas

```txt
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
planilla_aseguradora
```

La fuente solo aporta trazabilidad y evidencia. No puede aplicar pagos por sí misma.

---

## 7. Bloqueos obligatorios

Bloquea si:

- faltan tenant/proposal/target;
- la propuesta no está `VALIDADA`;
- `score_decision` es `BLOQUEADO` o inválido;
- falta trazabilidad de archivo/fila;
- falta país/moneda o son incoherentes;
- falta monto positivo;
- falta actor/rol/motivo;
- falta frase exacta de aprobación;
- la entrada trae `rows`, `rawRows`, `payload`, `records`;
- la entrada trae `secret`, `token`, `apiKey`, `webhook`, `password`, `credential`;
- la entrada trae banderas `write_enabled`, `apply_payment`, `aplicar_pago` o similares.

---

## 8. Salida

Genera un plan JSON con decisión:

```txt
APLICACION_LISTA
APLICACION_LISTA_CON_ADVERTENCIAS
APLICACION_BLOQUEADA
```

Cuando está lista, genera efectos planificados, no ejecutados:

```txt
transition_conciliacion VALIDADA -> APLICADA
update_target cobros/comisiones pendiente_de_ejecutor_autorizado
auditLog CONCILIACION_APLICACION_CONTROLADA_PREPARADA
```

---

## 9. Relación con transición VALIDADA -> APLICADA

El planificador no reemplaza el validador de transiciones.

Antes de ejecutar cualquier aplicación real, un futuro ejecutor debe pasar por:

```txt
tools/orbit360-validar-transicion-conciliacion-ays.mjs
```

con transición:

```txt
VALIDADA -> APLICADA
```

---

## 10. Pruebas sintéticas

Suite:

```bash
node tools/orbit360-test-preparar-aplicacion-controlada-conciliacion-ays.mjs
```

Casos cubiertos:

1. aplicación lista.
2. propuesta no validada bloqueada.
3. sin target bloqueado.
4. país/moneda incoherente bloqueado.
5. falta frase de aprobación bloqueada.
6. payload/rawRows bloqueado.
7. score bajo genera advertencia, no ejecución.

---

## 11. Siguiente paso recomendado

Antes de construir un ejecutor real, completar:

```txt
UI/Bandeja conciliaciones -> acción preparar_aplicacion_controlada -> plan -> revisión humana -> transición -> ejecutor autorizado
```

La ejecución real debe esperar autorización explícita de Paula y validación con datos reales controlados.