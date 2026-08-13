# REGISTRO P0 — CONFIRMACION REFORZADA DE IMPORTADORES

Fecha: 2026-07-09
Carril: A/B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: UI minima implementada; pendiente validacion visual/CI.

## Que parte del plan se avanzo

P0 — UI/flujo de confirmacion reforzada.

Se agrego una vista minima para que la escritura controlada no quede solo como motor tecnico. El flujo muestra impacto, riesgos, frase exacta, motivo obligatorio y usuario confirmador antes de llamar el contrato `Orbit.importaWriteP0.writeBatch`.

## Archivos agregados/modificados

```txt
orbit360-platform/modules/importar-p0-confirmacion.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importar-p0-confirmacion.mjs
```

## Reglas cubiertas

- Muestra impacto del lote: total de operaciones, crear, actualizar, validar y bloqueadas.
- Muestra operaciones por coleccion.
- Muestra riesgos antes de escribir.
- Exige check de aprobacion.
- Exige frase exacta: `CONFIRMO ESCRITURA CONTROLADA`.
- Exige motivo de escritura para auditoria.
- Exige usuario confirmador.
- Llama escritura solo via `Orbit.importaWriteP0.writeBatch`.
- La escritura sigue bloqueada si el lote no esta aprobado o tiene riesgos.

## Seguridad

- No escribe por si sola.
- No salta el contrato de escritura.
- No crea finmovs directos.
- No marca pagos automaticamente.
- No toca backend protegido.
- No toca `store.js`.
- No toca Firestore rules.
- No usa datos reales.
- No hace deploy.

## Siguiente paso

1. Validar smoke/CI.
2. Si pasa, preparar flujo de dry-run real sanitizado por fuente.
3. Si falla, corregir UI/loader antes de continuar.
