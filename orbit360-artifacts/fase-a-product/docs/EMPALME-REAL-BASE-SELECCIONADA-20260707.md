# Base seleccionada para empalme real — 2026-07-07

Base compatible y más reciente en fuentes: `Prototype Development Request - 2026-07-06T182633.902.zip`.

Corrección metodológica: la candidata `Prototype Development Request - 2026-07-05T062855.313.zip` es anterior y no debe usarse como base de empalme completo si está disponible la del 2026-07-06.

No usar como base completa: `Prototype Development Request (89).zip`, porque internamente carga v1217 y no trae piezas ya vigentes como `modules/conciliaciones.js` y `data/academia-plus.js`.

Verificación local del ZIP 2026-07-06:

```txt
archivos: 98
index: versión interna máxima v1330
incluye modules/conciliaciones.js: sí
incluye data/academia-plus.js: sí
```

Criterio: empalme aditivo sobre rama activa, preservando backend protegido y hotfix runtime v1.150.
