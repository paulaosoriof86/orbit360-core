# Decisión de empalme — candidato Claude 2026-07-04T114805

Fecha: 2026-07-04
Candidato: `Prototype Development Request - 2026-07-04T114805.866.zip`
Estado: **baseline frontend más reciente aceptado con reservas**.

## Decisión

Se acepta la candidata 114805 como referencia/baseline frontend más reciente para continuar el backend, porque corrige la mayor parte de los P0 abiertos de la candidata 072304. Sin embargo, el empalme no debe considerarse cerrado hasta corregir tres residuos del importador.

## Empalme permitido

- `modules/`: aceptable con revisión.
- `core/`: aceptable con revisión, excepto archivos backend protegidos.
- `styles/`: aceptable.
- `docs/`: aceptable, pero no reemplazar documentación viva backend de ChatGPT/Codex.
- `index.html`: revisar cache-busters; no editar central directamente si hay riesgo de mojibake. Usar pipeline local con backup.

## Empalme bloqueado / preservar

No reemplazar:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
firestore.rules
tools/orbit360-* backend / preflight / plan / preview / diff / pipeline / manifest / país-moneda
```

## Fixes mínimos antes de cierre

1. En Excel multihoja, no hacer `detectaMoneda(sn) || monedaDe(paisHoja)`. La moneda por país es sugerencia, no valor autorizado.
2. En clientes, no usar `rec.pais === 'CO' ? 'COP' : 'GTQ'` porque si no hay país queda GTQ.
3. En `SCOPE.documentos`, cambiar `crea: ['clientes']` por `crea: ['parchesPendientes']`.
4. Actualizar validador de marketing/integraciones para aceptar copy `Probar` en vez de exigir `Simular`.

## Criterio operativo

Mientras Claude no entregue otra candidata, documentar nuevos hallazgos en:

```txt
orbit360-platform/docs/PENDIENTES-CLAUDE-POST-114805-ACUMULADO.md
```

Si ChatGPT/Codex corrige directamente algún punto, registrar en bitácora y en nota para Claude.

## Restricciones

No merge. No deploy. No main. No datos reales. No secretos. No reemplazo backend LAB.