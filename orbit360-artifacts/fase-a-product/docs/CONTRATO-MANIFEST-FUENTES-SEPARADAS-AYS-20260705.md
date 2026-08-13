# Contrato backend — Manifest por fuentes separadas A&S

**Fecha:** 2026-07-05  
**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Estado:** validador de manifest alineado a `conciliaciones` como bandeja operativa.

---

## 1. Objetivo

Asegurar que cada archivo importado entre como una fuente separada y trazable antes de llegar a parser, dry-run, score o propuestas.

El manifest es una ficha técnica del archivo. No contiene filas reales ni payload operativo.

Flujo protegido:

```txt
archivo fuente -> manifest validado -> dryRunReport -> score -> propuestas conciliaciones -> plan persistencia
```

---

## 2. Herramientas

```txt
tools/orbit360-validar-manifest-fuente-ays.mjs
tools/orbit360-test-validar-manifest-fuente-ays.mjs
```

---

## 3. Fuentes autorizadas

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

## 4. Reglas de destino

```txt
clientes                 -> clientes
aseguradoras             -> aseguradoras
polizas                  -> polizas / recibos_propuestos
vehiculos                -> vehiculos
cobros_realizados        -> conciliaciones
planilla_aseguradora     -> conciliaciones
planilla_comisiones      -> conciliaciones
estado_cuenta_bancario   -> conciliaciones
financiero_historico     -> finmovs
siniestros               -> siniestros
documentos_soporte       -> documentos_soporte / parches_pendientes
configuracion_catalogo   -> configuracion / catalogos
```

Regla crítica: banco, planillas y cobros realizados **no escriben cobros directamente**. Deben pasar por `conciliaciones`.

---

## 5. Reglas de separación

- No inferir clientes/pólizas desde movimientos financieros.
- No escribir cartera desde financiero histórico.
- No escribir cobros desde estado bancario sin conciliación.
- No crear/modificar clientes o pólizas desde documentos sin confirmación y diff.
- No mezclar monedas en crudo.
- GT debe usar GTQ; CO debe usar COP.
- Si falta país/moneda, usar validación requerida, no escritura.
- La fuente solo declara destino permitido, no ejecuta escritura.

---

## 6. Manifest mínimo

Debe declarar:

```txt
tenant_id
source_type
referencia de archivo
país
moneda
campos/columnas
colecciones destino
```

Recomendado:

```txt
file_hash
periodo
hojas
confianza
requires_validation
```

---

## 7. Bloqueos

El validador bloquea si:

- falta tipo de fuente;
- fuente no autorizada;
- tenant distinto al tenant A&S;
- falta archivo fuente;
- falta país/moneda sin marcar validación requerida;
- país/moneda son incoherentes;
- faltan campos mínimos por fuente;
- destino no permitido por fuente;
- el manifest incluye filas reales o payload de datos;
- el manifest intenta activar escritura o aplicación operativa.

---

## 8. Decisiones

```txt
LISTO_DRYRUN
REQUIERE_REVISION
BLOQUEADO
```

---

## 9. Lo que NO hace

No hace:

- lectura de filas reales;
- escritura Firestore;
- escritura `Orbit.store`;
- creación de clientes/pólizas;
- actualización de cobros/comisiones;
- aplicación de pagos;
- generación de cartera;
- generación de producción;
- deploy;
- merge.

---

## 10. Uso

```bash
node tools/orbit360-validar-manifest-fuente-ays.mjs --manifest ruta/manifest.local.json
node tools/orbit360-test-validar-manifest-fuente-ays.mjs
```

---

## 11. Siguiente bloque recomendado

Construir perfilador de columnas por fuente:

```txt
manifest validado -> perfil columnas -> mapeo candidato -> dryRunReport sin payload real
```

Ese bloque debe seguir sin datos reales y sin writes.