# Contrato backend — Orquestador de pipeline metadata-only A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** tooling agregado. Sin datos reales, sin writes.

---

## 1. Objetivo

Encadenar las herramientas metadata-only ya creadas para validar el flujo técnico de importación antes de datos reales.

Flujo orquestado:

```txt
manifest -> perfil -> dryRun envelope -> candidates metadata-only -> validar dryRun
```

Este bloque no hace aplicación operativa ni persistencia. Solo verifica que la metadata pueda atravesar el pipeline técnico en orden.

---

## 2. Herramientas agregadas

```txt
tools/orbit360-orquestar-pipeline-metadata-ays.mjs
tools/orbit360-test-orquestar-pipeline-metadata-ays.mjs
```

Uso:

```bash
node tools/orbit360-orquestar-pipeline-metadata-ays.mjs --manifest ruta/manifest.local.json --candidates ruta/candidates.local.json
node tools/orbit360-test-orquestar-pipeline-metadata-ays.mjs
```

---

## 3. Herramientas encadenadas

El orquestador ejecuta:

```txt
orbit360-perfilar-columnas-fuente-ays.mjs
orbit360-construir-dryrun-report-fuente-ays.mjs
orbit360-adaptar-candidatos-dryrun-metadata-ays.mjs
orbit360-validar-dryrun-report-ays.mjs
```

---

## 4. Salida

Genera reporte JSON/TXT con:

- decisión general;
- manifest utilizado;
- candidates utilizado;
- dryRun final;
- pasos ejecutados;
- paso bloqueado si aplica;
- errores;
- advertencias;
- readiness para continuar a score/propuestas;
- restricciones.

---

## 5. Decisiones posibles

```txt
PIPELINE_LISTO
PIPELINE_LISTO_CON_ADVERTENCIAS
PIPELINE_BLOQUEADO
```

---

## 6. Reglas principales

- Si falla manifest/perfil/dryRun/candidates/validación, el pipeline queda bloqueado.
- Si alguna etapa genera advertencias, el pipeline queda listo con advertencias.
- El pipeline no ejecuta score ni genera propuestas reales todavía.
- El pipeline no escribe en store ni backend.
- El pipeline no aplica pagos, no crea cartera y no genera producción.
- La salida solo habilita readiness para el siguiente bloque.

---

## 7. Límites

No hace:

- lectura de datos reales;
- escritura en `Orbit.store`;
- escritura Firestore;
- creación/modificación de clientes, pólizas, cobros o comisiones;
- aplicación de pagos;
- generación de cartera;
- generación de producción;
- deploy;
- merge.

---

## 8. Relación con el plan

Este bloque cierra el tramo metadata-only previo a score/propuestas:

```txt
manifest -> perfil -> dryRun -> candidates -> validar dryRun
```

El siguiente paso natural es conectar score/propuestas en modo orquestado, manteniendo salida sin persistencia real.

---

## 9. Siguiente bloque recomendado

Orquestador de score/propuestas plan-only:

```txt
dryRun validado -> score -> propuestas conciliaciones -> plan persistencia
```

Sin datos reales, sin writes y sin aplicación controlada.