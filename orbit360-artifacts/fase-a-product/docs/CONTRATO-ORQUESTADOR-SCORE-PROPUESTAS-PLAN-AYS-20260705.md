# Contrato backend — Orquestador score/propuestas plan-only A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Estado:** herramienta segura plan-only agregada.

---

## 1. Objetivo

Cerrar el tramo posterior al orquestador metadata-only, encadenando de forma segura:

```txt
manifest + candidates metadata-only
-> pipeline metadata-only validado
-> score gate
-> propuestas de conciliación
-> plan de persistencia LAB
```

Este bloque no ejecuta persistencia real, no escribe en `Orbit.store`, no toca Firestore, no marca cobros pagados, no genera cartera, no genera producción y no hace deploy.

---

## 2. Archivos agregados

```txt
tools/orbit360-orquestar-score-propuestas-plan-ays.mjs
tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs
```

---

## 3. Herramientas que encadena

El orquestador usa herramientas ya existentes y auditadas:

```txt
tools/orbit360-orquestar-pipeline-metadata-ays.mjs
tools/orbit360-generar-propuestas-conciliacion-ays.mjs
tools/orbit360-preparar-persistencia-conciliaciones-lab-ays.mjs
```

Agrega un paso interno `score_gate` que valida que el `dryRunReport` final tenga score, decisión y acción propuesta coherentes antes de generar propuestas.

---

## 4. Entrada esperada

```txt
node tools/orbit360-orquestar-score-propuestas-plan-ays.mjs \
  --manifest ruta/manifest.local.json \
  --candidates ruta/candidates.local.json \
  --tenant alianzas-soluciones
```

Entradas obligatorias:

- `--manifest`: manifest de fuente separada validable.
- `--candidates`: candidatos metadata-only, sin filas reales.
- `--tenant`: opcional, por defecto `alianzas-soluciones`.

---

## 5. Fuentes permitidas

El tramo score/propuestas/plan solo acepta fuentes de conciliación:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

No acepta:

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

## 6. Score gate

El paso `score_gate` valida por candidato:

- `score` numérico entre 0 y 100;
- `score_decision` en `MATCH_EXACTO`, `MATCH_PROBABLE`, `REQUIERE_VALIDACION`, `BLOQUEADO`;
- `proposed_action` en acciones permitidas;
- país/moneda coherente: GT→GTQ, CO→COP;
- `BLOQUEADO` siempre debe proponer `NO_APLICAR`;
- `MATCH_EXACTO` debe exigir confirmación antes de aplicar.

Si detecta payload, filas reales, secretos, tokens, webhook, API key o credenciales, bloquea el tramo.

---

## 7. Salidas

Genera reportes en `_orbit360_reports`:

```txt
SCORE-GATE-PROPUESTAS-PLAN-AYS-*.json/.txt
ORQUESTADOR-SCORE-PROPUESTAS-PLAN-AYS-*.json/.txt
```

También conserva las salidas de los pasos encadenados:

```txt
PIPELINE-METADATA-AYS-*.json
CONCILIACIONES-PROPUESTAS-AYS-*.json
PLAN-PERSISTENCIA-CONCILIACIONES-AYS-*.json
```

---

## 8. Decisiones posibles

```txt
ORQUESTADOR_PLAN_LISTO
ORQUESTADOR_PLAN_LISTO_CON_ADVERTENCIAS
ORQUESTADOR_PLAN_BLOQUEADO
```

`ORQUESTADOR_PLAN_LISTO` significa que existe un plan seguro de persistencia posterior, no que ya se pueda escribir en Firestore ni aplicar pagos.

---

## 9. Restricciones fijas

- No datos reales.
- No filas reales.
- No payload crudo.
- No writes.
- No Firestore.
- No `Orbit.store`.
- No aplicación de pagos.
- No mutación de `cobros`, `polizas`, `comisiones`, `finmovs`, cartera ni producción.
- No deploy.
- No merge.

---

## 10. Pruebas sintéticas

`tools/orbit360-test-orquestar-score-propuestas-plan-ays.mjs` cubre:

1. caso listo con match exacto y probable;
2. caso con advertencia por match exacto sin acción de confirmación correcta;
3. bloqueo por país/moneda incoherente;
4. bloqueo por `rawRows` / payload prohibido.

Las pruebas son sintéticas y no contienen datos reales.

---

## 11. Relación con plan vivo

Este bloque cierra el pendiente `ABIERTO-BE-104-15 — Orquestador score/propuestas plan-only` como tooling/documentación en rama.

Queda pendiente ejecutar localmente los tests y conectar el siguiente bloque seguro:

```txt
validación de plan de persistencia / adapter Firestore LAB real / smoke visual-local
```

El futuro ejecutor de persistencia o aplicación controlada sigue bloqueado hasta autorización explícita.