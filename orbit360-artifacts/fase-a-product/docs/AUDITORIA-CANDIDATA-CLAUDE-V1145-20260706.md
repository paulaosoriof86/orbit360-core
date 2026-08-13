# Auditoría candidata Claude v1.145 — 2026-07-06

**Archivo auditado:** `Prototype Development Request - 2026-07-06T111541.993.zip`  
**SHA256:** `2b73f7755743ecf770a9c7b419e53a351cc67df68275b56e94dc8b320d323879`  
**Comparada contra:** v1.144, v1.142 y gate v1.145.  
**Estado:** no empalmar completa. Requiere corrección final o empalme selectivo con correcciones manuales.

---

## 1. Resultado general

La v1.145 mejora frente a v1.144, pero no pasa el gate completo.

Verificaciones realizadas:

- 55 archivos JS revisados con `node --check`: 0 errores.
- Archivos modificados frente a v1.144: 9.
- Archivos modificados frente a v1.142: 11.
- Se confirmaron mejoras en Cobros, Finanzas, Importador, Configuración, Automatizaciones y Academia plus.
- La afirmación `0 textos prohibidos` no se sostiene porque quedan residuos visibles/activos.

---

## 2. Archivos tocados frente a v1.144

```txt
index.html
core/config.js
core/importa.js
data/academia-plus.js
docs/BITACORA-CAMBIOS.md
modules/automatizaciones.js
modules/cliente360.js
modules/cobros.js
modules/finanzas.js
```

---

## 3. Bloqueadores detectados

### B1 — Index del ZIP no conserva backend LAB/hotfix Portal

El `index.html` del ZIP solo contiene `data/store.js` y `core/auth.js` de base. No conserva:

```txt
core/backend-lab-loader.js
core/backend-lab-init.js
data/store-firestore-lab.local.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

Por tanto: no empalmar `index.html` completo. El index vivo de la rama sí conserva esos scripts.

### B2 — Cliente360 conserva copy prohibido visible

`modules/cliente360.js` conserva:

```txt
Todo aplicado
Aplicar pago
```

Ubicaciones detectadas:

```txt
modules/cliente360.js:299
modules/cliente360.js:495
```

Debe corregirse a:

```txt
Sin cobros pendientes
Confirmar cobro
Registrar cobro confirmado
```

### B3 — Academia base `data/seed.js` sigue desactualizada

`data/seed.js` conserva frases antiguas:

```txt
aplicar un pago baja la cartera
Cobros gestiona la cartera y aplica pagos
```

Ubicaciones detectadas:

```txt
data/seed.js:807
data/seed.js:816
```

Esto significa que Academia no va completamente al día. Claude actualizó `academia-plus`, pero no limpió `seed`.

### B4 — Importador aún conserva lenguaje interno y residuos de aplicación

`core/importa.js` mejoró copy visible, pero conserva variables/razones internas y descripciones con residuos:

```txt
noAplicados
Pago en estado de cuenta, sin aplicar
pagos aún no aplicados
pagos no aplicados a póliza
```

Ubicaciones clave:

```txt
core/importa.js:609
core/importa.js:639
core/importa.js:640
```

Debe quedar con lenguaje consistente:

```txt
pendiente de validación
pendiente de relación con recibo/póliza
propuesta de conciliación
```

### B5 — Configuración conserva scope viejo

`core/config.js` cambió la descripción principal, pero conserva en `scope`:

```txt
Doble conciliación: pago aplicado a póliza creada
```

Ubicación:

```txt
core/config.js:373
```

Debe cambiarse a:

```txt
Doble conciliación: cobro confirmado/conciliado con póliza
```

### B6 — Academia plus todavía usa término prohibido en negación

`data/academia-plus.js` conserva `pago aplicado` dentro de explicación negativa. Aunque no promete aplicación, el gate pedía limpiar o evitar el término para QA.

Ubicación:

```txt
data/academia-plus.js:79
```

Debe reescribirse sin repetir el término prohibido:

```txt
Reportar soporte no confirma el cobro.
```

### B7 — Comentarios/copy técnico visible potencial

`modules/conciliaciones.js` conserva comentario inicial:

```txt
La aplicación real de pagos queda para backend (ChatGPT/Codex).
```

Si es comentario no visible, no bloquea por UI, pero conviene limpiarlo para evitar que se filtre o se marque en QA textual.

---

## 4. Mejoras confirmadas

- `modules/cobros.js` ya no contiene los textos exactos `Pago aplicado`, `Aplicado a póliza`, `Aplicar pago`, `Pagar` como copy visible principal.
- `modules/finanzas.js` ya no presenta `Aplicado a póliza` ni `pago sin aplicar` en el módulo auditado.
- `modules/automatizaciones.js` cambió el toast a `clave detectada · pendiente de activación técnica`.
- `core/config.js` cambió descripción principal a `cobro confirmado/conciliado↔póliza`.
- `data/academia-plus.js` contiene lección nueva de migración honesta.

---

## 5. Recomendación

No pedir otro paquete grande completo si Claude tiene poca capacidad. Pedir una corrección final mínima v1.146 con solo estos puntos:

1. `modules/cliente360.js`: eliminar `Todo aplicado` y botón `Aplicar pago`.
2. `data/seed.js`: corregir dos frases antiguas de Academia base.
3. `core/importa.js`: limpiar residuos `sin aplicar/no aplicados` en razones/descripciones.
4. `core/config.js`: corregir scope viejo de Finanzas.
5. `data/academia-plus.js`: reescribir `pago aplicado` en negación.
6. `index.html`: no tocar o conservar scripts LAB/hotfix.

Si Claude no tiene capacidad, ChatGPT/Codex puede hacer empalme selectivo con estas correcciones manuales.

---

## 6. Estado

No empalmar full. Puede pasar a corrección final mínima o empalme selectivo controlado.