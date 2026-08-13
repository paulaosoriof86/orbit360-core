# Contrato backend — Perfilador de columnas por fuente A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** tooling agregado. Sin datos reales, sin lectura de filas, sin writes.

---

## 1. Objetivo

Conectar el manifest validado con el futuro `dryRunReport`, sin leer filas reales ni aplicar cambios operativos.

Flujo:

```txt
manifest validado -> perfil columnas -> mapeo candidato -> readiness dryRunReport
```

Este bloque existe para que el parser real no improvise nombres de columnas ni mezcle fuentes.

---

## 2. Herramientas agregadas

```txt
tools/orbit360-perfilar-columnas-fuente-ays.mjs
tools/orbit360-test-perfilar-columnas-fuente-ays.mjs
```

Uso:

```bash
node tools/orbit360-perfilar-columnas-fuente-ays.mjs --manifest ruta/manifest.local.json
node tools/orbit360-test-perfilar-columnas-fuente-ays.mjs
```

---

## 3. Entrada esperada

Manifest de metadata con:

```txt
tenant_id
source_type
archivo / hash
país
moneda
schema.fields / fields / columns
```

No debe contener filas reales. El perfilador solo mira nombres de columnas declarados.

---

## 4. Fuentes con perfil

```txt
clientes
aseguradoras
polizas
vehiculos
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
```

---

## 5. Salida

Genera reporte JSON/TXT con:

- fuente;
- destino esperado;
- columnas declaradas;
- campos obligatorios encontrados;
- campos opcionales encontrados;
- campos obligatorios faltantes;
- matches probables;
- columnas no mapeadas;
- errores;
- advertencias.

---

## 6. Decisiones posibles

```txt
PERFIL_LISTO
PERFIL_LISTO_CON_ADVERTENCIAS
PERFIL_BLOQUEADO
```

---

## 7. Reglas principales

- Banco, planillas y cobros realizados se perfilan hacia conciliación.
- Financiero histórico se perfila hacia histórico financiero, no cartera ni producción.
- Documentos soporte se perfilan como propuesta/evidencia, no como escritura directa de entidades.
- Pólizas requieren prima neta, país y moneda antes de cualquier recibo/cartera.
- Si faltan columnas obligatorias, el perfil se bloquea.
- Si hay coincidencias probables, el perfil requiere advertencia.
- Columnas no mapeadas se reportan, no se descartan silenciosamente.

---

## 8. Límites

No hace:

- lectura de filas reales;
- escritura en `Orbit.store`;
- escritura Firestore;
- creación de clientes, pólizas o cobros;
- aplicación de pagos;
- generación de cartera;
- generación de producción;
- deploy;
- merge.

---

## 9. Relación con el plan de trabajo

Este bloque estaba pendiente como `ABIERTO-BE-104-15 — Perfilador de columnas por fuente`.

Queda como paso intermedio necesario antes de conectar parser real:

```txt
manifest validado -> perfil columnas -> dryRunReport -> score -> propuestas conciliaciones
```

---

## 10. Siguiente bloque recomendado

Crear constructor de `dryRunReport` sin payload real a partir de:

```txt
manifest validado + perfil columnas + fuente separada
```

Debe seguir bloqueando writes y datos reales.