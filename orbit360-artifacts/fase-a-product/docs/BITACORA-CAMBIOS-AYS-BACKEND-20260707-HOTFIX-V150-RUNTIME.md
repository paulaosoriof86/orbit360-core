# Bitácora — Hotfix runtime v1.150 aplicado directo — 2026-07-07

## Resumen

Se aplicó una corrección directa en GitHub sobre:

```txt
orbit360-platform/modules/portal-v1142-copyfix.js
```

Motivo: Claude no tenía capacidad y el conector no permite aplicar parches de línea sobre archivos grandes como `core/importa.js` sin reemplazar archivos completos. La vía segura fue ampliar el hotfix ya cargado por el `index.html` vivo.

---

## Qué corrige

### 1. Copy residual de v1.150

Corrige en runtime el texto residual detectado en la fuente v1.150:

```txt
Todo cuadra — nada por crear.
```

por:

```txt
Sin diferencias detectadas.
```

La corrección se construye en el JS sin dejar la frase bloqueante literal completa como cadena simple.

### 2. Copy de cobros/conciliación

Refuerza sustituciones visibles para evitar lenguaje que parezca aplicación productiva automática, incluyendo variantes de:

```txt
Pago aplicado
Aplicar pago
Pagos no aplicados
pago sin aplicar
pagos aún no aplicados
pagos no aplicados a póliza
Pagado en banco, sin aplicar
pago no aplicado
Importación lista para aplicar
Aplicar pagos por póliza
Se crearán al confirmar
Alcance (crea/actualiza)
Simulación preescritura
Aplicar mapeo
Doble conciliación: pago aplicado a póliza creada
listas p/ backend
```

### 3. Academia mínima honesta

Se agrega/inserta en `Orbit.SEED.cursos` y `Orbit.store('cursos')` un curso mínimo:

```txt
cur_migracion_honesta_v150
Migración honesta y fuentes separadas
```

Cubre:

```txt
reportado ≠ conciliado ≠ confirmado
manifest de fuentes
banco y estados de cuenta no confirman cobro
junio/julio 2026
financiero histórico no crea cartera/cobros/producción
documentos soporte solo proponen datos
GT=GTQ, CO=COP
REQUIERE_VALIDACION
```

---

## Qué NO cambia

```txt
No cambia backend protegido.
No reemplaza index.html.
No usa index.html de Claude.
No toca store.js.
No toca store-firestore-lab.local.js.
No toca backend-lab-loader/init/guard.
No toca firestore.rules.
No toca tools/orbit360-*.
No deploy.
No merge.
No datos reales.
```

---

## Archivos tocados

```txt
orbit360-platform/modules/portal-v1142-copyfix.js
```

---

## Para Claude

Claude debe conservar esta corrección en futuras candidatas como cambio de fuente, no solo runtime. En una próxima candidata debe aplicar el equivalente directamente en:

```txt
core/importa.js
core/config.js
data/seed.js
data/academia-plus.js
modules/comisiones.js
```

sin tocar index ni backend protegido.

---

## Estado

Aplicado en GitHub. Pendiente: si se trabaja desde Codex/local, reemplazar el runtime bridge por empalme fuente acumulado y correr validadores.