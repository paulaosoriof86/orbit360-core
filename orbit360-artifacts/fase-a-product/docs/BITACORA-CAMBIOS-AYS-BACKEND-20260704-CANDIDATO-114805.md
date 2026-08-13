# Bitácora backend A&S — auditoría y decisión candidato Claude 114805

Fecha: 2026-07-04
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5
Estado: EN PROGRESO / empalme aditivo controlado.

## Solicitud

Paula compartió nueva candidata `Prototype Development Request - 2026-07-04T114805.866.zip` y pidió:

- auditoría profunda;
- identificar qué hizo y qué faltó;
- actualizar pendientes;
- seguir documentando hallazgos y modificaciones propias hasta próximo paquete Claude;
- hacer empalme con esta última versión para continuar backend.

## Auditoría ejecutada

- Extracción e inventario de candidata.
- Validación sintáctica `node --check` sobre `core/`, `modules/`, `data/`.
- Revisión focal de `core/importa.js` contra P0/P1 de reauditoría 072304.
- Revisión de SCOPE/importador, país/moneda, documentos, planillas, fechas fijas, UI técnica y archivos protegidos.
- Validación `tools/orbit360-validate-marketing-integraciones.mjs`.

## Resultado

La candidata 114805 corrige avances importantes y se acepta como baseline frontend más reciente con reservas. Aún no debe marcarse como empalme cerrado porque persisten residuos:

1. moneda de hoja aún se infiere por país (`detectaMoneda(sn) || monedaDe(paisHoja)`);
2. importador de clientes aún puede default a GTQ si falta país;
3. `SCOPE.documentos` sigue declarando `crea: ['clientes']` aunque la lógica real va a `parchesPendientes`;
4. validador marketing/integraciones quedó desactualizado por exigir literal `Simular`;
5. quedan fechas fijas y textos técnicos para revisión.

## Documentación agregada

- `orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-CLAUDE-20260704-114805.md`
- `orbit360-platform/docs/PENDIENTES-CLAUDE-POST-114805-ACUMULADO.md`
- `orbit360-platform/docs/EMPALME-CANDIDATO-CLAUDE-20260704-114805-DECISION.md`

## Herramientas agregadas

- `tools/orbit360-auditar-residuos-candidato-114805-ays.mjs`
- `tools/orbit360-test-auditar-residuos-candidato-114805-ays.mjs`

## Impacto

La rama backend queda alineada con la última candidata como baseline frontend documentado, sin pisar backend LAB protegido. El pipeline suma un auditor residual para no repetir los errores detectados en 114805.

## Restricciones cumplidas

No merge. No deploy. No main. No datos reales. No secretos. No reemplazo de backend LAB. No sobrescritura de `data/store.js` backend. No paquete Claude nuevo hasta que Paula lo pida.