# Nota para Claude — conservar hotfix v1.150 aplicado por ChatGPT/Codex — 2026-07-07

Claude debe conservar en la siguiente candidata los cambios aplicados directamente por ChatGPT/Codex en `modules/portal-v1142-copyfix.js`.

## Corrección de fuente que debe incorporarse

En `core/importa.js`, el texto:

```txt
Todo cuadra — nada por crear.
```

no debe volver a aparecer. Debe quedar como:

```txt
Sin diferencias detectadas.
```

## Correcciones de copy que no deben regresar

No regresar variantes visibles de:

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

## Academia

Mantener ruta profunda/honesta sobre:

```txt
fuentes separadas
manifest/catálogo de fuentes
junio/julio 2026
reportado ≠ conciliado ≠ confirmado
banco no confirma cobro
estado de cuenta cliente no es pago realizado
financiero histórico no crea cartera/cobros/producción
documentos soporte solo proponen datos
país/moneda faltante = REQUIERE_VALIDACION
GT=GTQ, CO=COP
```

## Index/backend

No tocar `index.html`. Si se requiere cache-bust, dejarlo en bitácora para ChatGPT/Codex.

No tocar backend protegido:

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

## Estado

Este documento existe para evitar que futuras candidatas de Claude reviertan correcciones aplicadas por ChatGPT/Codex.