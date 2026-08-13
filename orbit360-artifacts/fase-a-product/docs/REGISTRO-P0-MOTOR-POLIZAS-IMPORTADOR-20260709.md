# REGISTRO P0 — MOTOR DE REGLAS PARA IMPORTADOR DE POLIZAS

Fecha: 2026-07-09
Carril: B/C
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: implementacion aditiva inicial; pendiente wire con `core/importa.js`.

## Que se implemento

Se agrego modulo puro/aditivo:

```txt
orbit360-platform/core/importa-polizas-p0.js
```

Se agrego smoke con datos ficticios:

```txt
tools/orbit360-test-importa-polizas-p0.mjs
```

## Por que se hizo asi

Para avanzar sin pedir mas PowerShell y sin tocar el importador operativo directamente antes de tener una capa aislada y testeable.

Esta decision evita reproceso y reduce riesgo:

- no toca backend protegido;
- no modifica store;
- no toca reglas Firebase;
- no usa datos reales;
- no cambia UI;
- no rompe `core/importa.js`;
- deja listo el motor para integrarlo en el importador.

## Reglas cubiertas

- llave compuesta de poliza;
- normalizacion de fechas;
- pais y moneda por fuente/aseguradora/pais;
- prima neta, gastos, IVA y total separados;
- estado fuente original separado;
- estado operativo Orbit;
- renovada con vigencia activa como `vigente_renovada`;
- vigente activa como `vigente_operativa`;
- vencida historica como `historica_vencida`;
- cancelada como `cancelada_terminal`;
- forma de pago requerida;
- recibos esperados separados de cobros confirmados.

## Siguiente paso

Integrar este motor con `core/importa.js` para que el importador de polizas use:

```txt
Orbit.importaPolizasP0.normalizePolicy(...)
Orbit.importaPolizasP0.shouldGenerateExpectedReceipts(...)
Orbit.importaPolizasP0.expectedReceiptSeed(...)
```

Criterio: hacerlo de forma aditiva, sin tocar backend protegido y validando con smoke ficticio.
