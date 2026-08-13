# Contrato backend — Adaptador de candidatos metadata-only para dryRunReport A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** tooling agregado. Sin datos reales, sin lectura de filas, sin writes.

---

## 1. Objetivo

Tomar un sobre `dryRunReport` construido previamente y añadir candidatos metadata-only compatibles con:

```txt
tools/orbit360-validar-dryrun-report-ays.mjs
```

Este bloque es el puente entre:

```txt
constructor dryRunReport sin filas
```

y:

```txt
validador dryRunReport -> score -> propuestas conciliaciones
```

---

## 2. Herramientas agregadas

```txt
tools/orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs
tools/orbit360-test-adaptar-candidatos-dryrun-metadata-ays.mjs
```

Uso:

```bash
node tools/orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs --dryrun ruta/dryrun.local.json --candidates ruta/candidates.local.json
node tools/orbit360-test-adaptar-candidatos-dryrun-metadata-ays.mjs
```

---

## 3. Entrada

Requiere:

- dryRun envelope metadata-only;
- candidates metadata-only;
- tenant A&S;
- source_type de la fuente;
- source_ref por candidato;
- país y moneda;
- estado de fila;
- para fuentes de conciliación: score, decisión y acción propuesta.

---

## 4. Salida

Genera un `dryRunReport` metadata-only con:

- summary recalculado por estado;
- candidates normalizados;
- readiness para validador dryRun;
- readiness para score;
- errores;
- advertencias;
- restricciones.

---

## 5. Decisiones posibles

```txt
DRYRUN_CANDIDATES_LISTO
DRYRUN_CANDIDATES_LISTO_CON_ADVERTENCIAS
DRYRUN_CANDIDATES_BLOQUEADO
```

---

## 6. Reglas principales

- No aceptar candidatos sin referencia de fuente.
- No aceptar candidatos sin país/moneda.
- No aceptar país/moneda incoherente.
- No aceptar score faltante o inválido para fuentes de conciliación.
- No aceptar decisión o acción inválida para fuentes de conciliación.
- Un candidato bloqueado no puede proponer acción aplicativa.
- Match exacto debe proponer aplicación con confirmación; si no, queda con advertencia.
- No se permiten filas reales ni payload operativo.

---

## 7. Límites

No hace:

- lectura de filas reales;
- escritura en `Orbit.store`;
- escritura Firestore;
- creación/modificación de clientes, pólizas, cobros o comisiones;
- aplicación de pagos;
- generación de cartera;
- generación de producción;
- deploy;
- merge.

---

## 8. Relación con validación y score

Este adaptador produce output compatible con:

```txt
tools/orbit360-validar-dryrun-report-ays.mjs
```

Cuando el output pase ese validador, podrá entrar al bloque de score/propuestas ya existente:

```txt
validar dryRunReport -> calcular score -> generar propuestas conciliaciones -> plan persistencia
```

---

## 9. Siguiente bloque recomendado

Crear un orquestador de pipeline metadata-only:

```txt
manifest -> perfil -> dryRun envelope -> candidates metadata-only -> validar dryRun -> score -> propuestas conciliaciones
```

Debe seguir sin datos reales y sin writes.