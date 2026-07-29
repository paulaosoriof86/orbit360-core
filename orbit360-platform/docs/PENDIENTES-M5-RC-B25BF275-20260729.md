# Pendiente único M5 — RC b25bf275

Fecha: 2026-07-29 UTC / 2026-07-28 Guatemala

## Estado cerrado

- M1–M4: cerrados.
- M5 5.0.1–5.0.4: cerrados.
- Runtime smoke 5.0.5: stop-line cerrado, autorización consumida, cero escrituras.
- Remediación estática 5.0.6: cerrada.
- Nueva RC: `b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091`.
- Activos críticos: 42/42.
- LAB actual: 22/25.

## Pendiente único autorizado actualmente

Ninguno. Hosting, runtime, navegador y revisión visual están bloqueados.

## Próxima autorización requerida

Una sola entrega Hosting LAB de la RC exacta `b25bf275…`.

Alcance permitido después de autorización explícita:

- canal `orbit360-ays-lab`;
- frontend Hosting solamente;
- una ejecución;
- paridad pública posterior obligatoria 25/25.

Alcance prohibido:

- Firestore y datos;
- Functions y Rules;
- producción;
- `main` y merge;
- runtime smoke y navegador;
- Pólizas y cualquier otra fuente real.

## Diferencias que debe cerrar Hosting

1. `ays-lab-preview.html` — hash remoto anterior.
2. `data/academia-v1230-operational-directory-v20260722.js` — hash remoto anterior.
3. `core/academia-static-content-write-policy-v20260729.js` — no publicado, HTTP 404.

## Gate de salida

Aceptar únicamente evidencia sanitizada con:

```txt
RC = b25bf2750548651a719526bc4dadf7662def2255876c4c2e5e32bdf90f93a091
critical assets = 42/42
remote assets = 25/25
mismatches = 0
hosting deploy executions = 1
Firestore writes = 0
runtime/browser = false/false
Functions/Rules/production/main/merge = false
```

Solo después podrá solicitarse una nueva autorización independiente para runtime smoke LAB. Pólizas continúa bloqueado hasta que su bloque solicite y reciba la fuente real vigente específica.
