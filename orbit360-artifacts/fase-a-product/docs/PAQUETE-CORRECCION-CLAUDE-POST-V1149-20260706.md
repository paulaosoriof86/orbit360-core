# Paquete corrección mínima Claude — Post v1.149 — 2026-07-06

Claude, v1.149 está casi aprobada, pero en el ZIP real todavía queda una coincidencia visible en `core/importa.js`.

No toques `index.html`. No toques backend protegido ni tools.

---

## Corrección única pendiente

En `core/importa.js`, cambiar:

```txt
Todo cuadra — nada por crear.
```

por:

```txt
Sin diferencias detectadas.
```

---

## Mantener lo ya corregido

No revertir:

```txt
core/config.js: Doble conciliación: cobro confirmado/conciliado con póliza
core/importa.js: quedan listos para revisión/aprobación
core/importa.js: Las propuestas quedan disponibles para revisión
core/importa.js: Revisión previa
core/importa.js: Alcance permitido / efecto propuesto
core/importa.js: Se propondrán para revisión
core/importa.js: Confirmar mapeo
```

---

## QA obligatorio

Confirmar 0 coincidencias visibles en fuente para:

```txt
Todo cuadra — nada por crear
Doble conciliación: pago aplicado a póliza creada
Simulación preescritura
Simulación pre-escritura
Alcance (crea/actualiza)
Se crearán al confirmar
Importación lista para aplicar
Aplicar pagos por póliza
```

Confirmar también:

```txt
0 errores JS
index.html no tocado
backend protegido intacto
tools intactos
sin datos reales
```

---

## Entrega esperada

ZIP v1.150 con solo:

```txt
core/importa.js
docs/BITACORA-CAMBIOS.md
```

Si tocas otro archivo, explicar por qué.