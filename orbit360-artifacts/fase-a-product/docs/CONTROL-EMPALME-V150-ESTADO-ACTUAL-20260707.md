# Control de empalme v1.150 — Estado actual — 2026-07-07

## Estado ejecutivo

El empalme v1.150 no se hizo como ZIP completo. Se aplicó una corrección directa segura mediante el hotfix runtime ya cargado por el `index.html` vivo.

Este enfoque permite corregir la UI y Academia mínima sin reemplazar archivos fuente grandes ni tocar backend protegido.

---

## Qué quedó aplicado directo

Archivo modificado en GitHub:

```txt
orbit360-platform/modules/portal-v1142-copyfix.js
```

Commits relacionados:

```txt
26b3bf77473e9dac17e1fd82f8f422807657d1be — hotfix runtime v1.150
1aa58dc902ce9ae696c253dca9af3434cd8b8f73 — bitácora hotfix runtime
b00b11147b45f352b8b6b03a57a007851bf54d8b — nota para Claude conservar hotfix
0bedfa0406f972f56e02ff6f215a986dc353af69 — matriz viva de Academia
```

---

## Qué corrige el hotfix runtime

```txt
Todo cuadra — nada por crear. → Sin diferencias detectadas.
Pago aplicado / Aplicar pago / Pagos no aplicados → lenguaje de cobro confirmado, revisión y conciliación.
Importación lista para aplicar → Importación lista para revisión/aprobación.
Aplicar pagos por póliza → Revisar propuestas de conciliación.
Se crearán al confirmar → Se propondrán para revisión.
Doble conciliación: pago aplicado a póliza creada → Doble conciliación: cobro confirmado/conciliado con póliza.
listas p/ backend → listas para revisión técnica.
```

---

## Qué agrega en Academia

Curso runtime:

```txt
cur_migracion_honesta_v150
Migración honesta y fuentes separadas
```

Temas:

```txt
reportado ≠ conciliado ≠ confirmado
manifest de fuentes
banco no confirma cobro
estado de cuenta de cliente no es pago realizado
junio/julio 2026
financiero histórico no crea cartera/cobros/producción
documentos soporte solo proponen datos
país/moneda faltante = REQUIERE_VALIDACION
GT=GTQ, CO=COP
```

---

## Qué queda pendiente para empalme fuente definitivo

El runtime bridge es correcto para mantener operación y UI honesta, pero debe pasar a fuente formal cuando sea posible:

```txt
core/importa.js
core/config.js
data/seed.js
data/academia-plus.js
modules/comisiones.js
```

Motivo: si en el futuro se reemplaza `portal-v1142-copyfix.js`, las correcciones de runtime podrían perderse si Claude no las incorporó a fuente.

---

## Backend protegido no tocado

No se modificó:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-loader.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-*.mjs
tools/orbit360-*.ps1
```

---

## Index

No se usó `index.html` del ZIP Claude.

El hotfix funciona porque `modules/portal-v1142-copyfix.js` ya está integrado/cargado por el index vivo de la rama.

Pendiente de validación visual/local:

```txt
Abrir plataforma.
Entrar a Importador, Portal, Cobros, Conciliaciones y Academia.
Confirmar que copy visible aparece honesto.
Confirmar curso `Migración honesta y fuentes separadas`.
```

---

## Decisión de continuidad

Hasta nuevo aviso:

```txt
Mantener documento acumulado vivo en GitHub.
No entregar descargables salvo solicitud de Paula.
Documentar cada corrección directa para que Claude la conserve.
Seguir backend crítico sin desplazar Academia.
```

---

## Siguiente bloque recomendado

Continuar con backend Phase A:

```txt
persistencia real de conciliaciones
auditLog
Storage/adjuntos reales
aplicación controlada de pagos/cobros confirmados
validadores de fuentes separadas
```

Manteniendo Academia sincronizada en `PENDIENTES-ACADEMIA-ACUMULADO-VIVO-20260707.md`.