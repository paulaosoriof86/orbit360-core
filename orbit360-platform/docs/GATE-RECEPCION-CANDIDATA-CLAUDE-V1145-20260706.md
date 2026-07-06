# Gate de recepción candidata Claude v1.145

**Fecha:** 2026-07-06  
**Proyecto:** Orbit 360 A&S  
**Propósito:** decidir si una futura candidata Claude v1.145 se acepta, se devuelve o se empalma selectivamente.

---

## 1. Resultado esperado

La candidata v1.145 solo puede pasar si cumple todos estos bloques:

```txt
0 errores JS
backend protegido intacto
index híbrido conservado o no tocado
copy de pagos/cobros limpio
Academia sincronizada en plus y seed
Importador corregido
Cliente360/Cobros/Finanzas corregidos
sin texto técnico visible en UI cliente
bitácora y archivos tocados incluidos
```

---

## 2. Gate A — Backend protegido

Debe conservar intactos:

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

Si alguno cambia, resultado: DEVOLVER.

---

## 3. Gate B — Index híbrido

El index debe conservar:

```txt
core/backend-lab-loader.js
data/store-firestore-lab.local.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

Si no los conserva, no empalmar index completo.

---

## 4. Gate C — Copy prohibido

Buscar en módulos activos:

```txt
Pago aplicado
Aplicado a póliza
Todo aplicado
cobros aplicados
recaudo aplicado
Aplicar pago
Aplicar pagos
Pagos no aplicados
pago sin aplicar
listas p/ backend
```

Si aparece visible en UI, resultado: DEVOLVER.

---

## 5. Gate D — Importador

Debe decir revisión/validación/conciliación, no aplicación directa.

Debe respetar:

```txt
banco no crea cobro aplicado
estado cliente no marca pago realizado
planilla comisión no crea cartera/cobro aplicado
financiero histórico no crea cartera/cobros/producción
documentos soporte solo proponen
```

---

## 6. Gate E — Academia

Revisar `data/academia-plus.js` y `data/seed.js`.

Debe cubrir:

```txt
estados honestos
junio/julio 2026
manifest/catálogo de fuentes
fuentes separadas
banco no es cobro aplicado
financiero histórico no crea cartera
documentos soporte solo proponen
moneda por país
REQUIERE_VALIDACION
```

Si solo cambia plus pero no seed y seed conserva cursos contradictorios, resultado: DEVOLVER.

---

## 7. Gate F — UI técnica

No debe aparecer en UI cliente/operativa:

```txt
backend
Firebase
Firestore
LAB
mock
demo
localStorage
credenciales
token
API key
```

Si aparece en documentación técnica interna, puede quedar; si aparece al usuario, devolver.

---

## 8. Gate G — Entrega Claude

La entrega debe incluir:

```txt
bitácora v1.145
lista de archivos tocados
confirmación 0 errores JS
confirmación backend protegido intacto
confirmación index híbrido conservado o no tocado
resumen Academia
pendientes honestos
```

---

## 9. Decisión

- PASA: puede auditarse para empalme controlado.
- PASA PARCIAL: empalme selectivo manual, nunca index completo.
- DEVOLVER: pedir nueva candidata Claude.

---

## Estado

Gate creado. Usar al recibir v1.145.