# Contrato backend — Constructor de dryRunReport sin payload real A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** tooling agregado. Sin datos reales, sin lectura de filas, sin writes.

---

## 1. Objetivo

Construir un sobre seguro de `dryRunReport` usando:

```txt
manifest validado + perfil de columnas + fuente separada
```

Este bloque no intenta procesar filas reales ni generar resultados operativos. Su función es preparar la estructura que luego usará el parser real.

---

## 2. Herramientas agregadas

```txt
tools/orbit360-construir-dryrun-report-fuente-ays.mjs
tools/orbit360-test-construir-dryrun-report-fuente-ays.mjs
```

Uso:

```bash
node tools/orbit360-construir-dryrun-report-fuente-ays.mjs --manifest ruta/manifest.local.json --profile ruta/perfil.local.json
node tools/orbit360-test-construir-dryrun-report-fuente-ays.mjs
```

---

## 3. Entrada

Requiere:

- manifest metadata-only;
- perfil de columnas metadata-only;
- tenant A&S;
- source_type autorizado;
- país/moneda si vienen disponibles;
- destino coherente con la fuente.

---

## 4. Salida

Genera reporte JSON/TXT con:

- versión;
- tenant;
- decisión;
- tipo de fuente;
- colección destino esperada;
- referencia al manifest;
- referencia de fuente;
- país/moneda;
- summary de conteos agregados;
- perfil de columnas;
- readiness;
- errores;
- advertencias;
- restricciones.

---

## 5. Decisiones posibles

```txt
DRYRUN_READY
DRYRUN_READY_CON_ADVERTENCIAS
DRYRUN_BLOQUEADO
```

---

## 6. Decisión clave del bloque

Para fuentes de conciliación:

```txt
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
cobros_realizados
```

la herramienta no inventa candidatos por fila. Solo crea readiness y advierte que el parser real deberá aportar metadata por fila.

Esto evita simular pagos, filas, cobros o conciliaciones inexistentes.

---

## 7. Reglas principales

- No pasar a score si falta metadata de candidatos.
- No generar `conciliaciones` desde este constructor.
- No marcar cobros pagados.
- No crear cartera ni producción.
- No derivar clientes/pólizas desde financiero histórico.
- No permitir destino inconsistente con la fuente.
- No avanzar si el perfil está bloqueado.
- No descartar columnas no mapeadas sin advertencia.

---

## 8. Límites

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

## 9. Relación con herramientas existentes

Este constructor queda antes de:

```txt
tools/orbit360-validar-dryrun-report-ays.mjs
```

La validación final del `dryRunReport` con candidatos metadata-only debe realizarse cuando el parser real aporte candidatos estructurados.

---

## 10. Siguiente bloque recomendado

Construir el adaptador `perfil + parser metadata` para producir candidatos metadata-only compatibles con:

```txt
tools/orbit360-validar-dryrun-report-ays.mjs
```

sin datos reales y sin writes.