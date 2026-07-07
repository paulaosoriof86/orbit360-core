# Empalme acumulado seguro v1.150 — 2026-07-07

## Estado

Paquete acumulado preparado y auditado para aplicar la línea Claude v1.150 con corrección determinística de `core/importa.js`.

**No se empalmó ZIP completo.**  
**No se usa `index.html` del ZIP.**  
**No se toca backend protegido.**  
**No deploy. No merge. No datos reales.**

---

## Motivo del empalme acumulado

Aunque Claude entregó varias rondas correctivas, la rama viva no tenía todavía todo el bloque acumulado de mejoras UX/copy/Academia. Por eso el empalme debe ser acumulado y selectivo, no solo `core/importa.js`.

---

## Archivos candidatos seguros acumulados

```txt
core/config.js
core/crmkit.js
core/importa.js
data/seed.js
data/academia-plus.js
modules/cliente360.js
modules/cobros.js
modules/conciliaciones.js
modules/finanzas.js
modules/automatizaciones.js
modules/comisiones.js
```

Además debe ajustarse el `index.html` vivo, no el de Claude, para conservar LAB y cargar:

```txt
data/academia-plus.js
core/config.js cache-bust
core/importa.js cache-bust
core/crmkit.js cache-bust
modules/cliente360.js cache-bust
modules/cobros.js cache-bust
modules/conciliaciones.js cache-bust
modules/finanzas.js cache-bust
modules/automatizaciones.js cache-bust
modules/comisiones.js cache-bust
```

---

## Corrección directa que ChatGPT/Codex debe conservar para Claude

En la fuente auditada v1.150, `modules/comisiones.js` ya corregía `Todo cuadra`, pero `core/importa.js` todavía mantenía:

```txt
Todo cuadra — nada por crear.
```

La corrección acumulada preparada por ChatGPT/Codex cambia esa línea a:

```txt
Sin diferencias detectadas.
```

Claude debe conservar esta corrección en cualquier futura candidata.

---

## Backend protegido que no se debe tocar

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

---

## Validación del paquete local saneado

```txt
55 JS revisados con node --check
0 errores JS
0 coincidencias activas para textos bloqueantes principales
```

Textos verificados:

```txt
Todo aplicado
Aplicar pago
Pago aplicado
Aplicado a póliza
Pagos no aplicados
pago sin aplicar
pagos aún no aplicados
pagos no aplicados a póliza
Pagado en banco, sin aplicar
pago no aplicado
Doble conciliación: pago aplicado a póliza creada
listas p/ backend
Importación lista para aplicar
Aplicar pagos por póliza
Se crearán al confirmar
Todo cuadra — nada por crear
```

---

## Nota de herramienta

El conector GitHub disponible en ChatGPT permite reemplazar archivos completos mediante Contents API, pero no aplicar parches de línea ni subir directamente archivos locales como blob desde ruta. Por seguridad, el empalme acumulado se deja empaquetado con script local reproducible y documentación, sin forzar reemplazos grandes no verificables desde el chat.

---

## Próximo paso recomendado

Aplicar paquete acumulado seguro con revisión/validación y luego hacer commit controlado. Si se aplica desde Codex o entorno local, debe ejecutarse:

```txt
node --check orbit360-platform/core/importa.js
node --check orbit360-platform/core/config.js
node --check orbit360-platform/data/academia-plus.js
node --check orbit360-platform/data/seed.js
```

Luego correr validadores acumulados y smoke local antes de cualquier deploy.