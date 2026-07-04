# Registro backend continuidad — conciliación, documentos y adjuntos

Fecha: 2026-07-04
Proyecto: Orbit 360 A&S
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft

## Bloque trabajado

Se continuó backend crítico desde la base viva:

- candidata frontend activa: `Prototype Development Request - 2026-07-04T152321.882.zip`;
- adendum Academia activo;
- PR #5 draft;
- sin merge;
- sin deploy;
- sin Firestore;
- sin datos reales.

## Archivos creados

1. `orbit360-platform/docs/CONTRATO-COLECCION-CONCILIACIONBANCO-LAB-AYS-20260704.md`
2. `orbit360-platform/docs/CONTRATO-DOCUMENTOS-ADJUNTOS-GESTIONES-LAB-AYS-20260704.md`
3. `orbit360-platform/docs/PLAN-BACKEND-PORTAL-PAGOS-ADJUNTOS-COBROS-20260704.md`

## Decisión técnica

Se priorizó el bloque de conciliación/documentos porque:

- el prototipo v1.117 corrigió `estados-banco` hacia `conciliacionBanco`;
- los validadores backend ya reconocen `conciliacionBanco` como destino permitido;
- Paula detectó que Portal registra pago reportado pero no muestra soporte adjunto;
- documentos/adjuntos son prerequisito para migración real, trazabilidad, cobros, portal, notificaciones y Academia.

## Reglas reforzadas

- Estado bancario no escribe `finmovs`.
- Pago reportado por cliente no marca cobro pagado sin validación.
- Todo adjunto debe persistir o referenciarse como `documentos`.
- Toda gestión con archivo debe guardar `documentoIds[]`.
- `conciliacionBanco` es bandeja de revisión, no producción, cartera, comisión ni finanzas históricas.

## Próximo paso

Auditar flujo real en candidata v1.123:

- `modules/portal.js`
- `modules/cobros.js`
- `modules/cliente360.js`
- `modules/notificaciones.js`
- `core/ciclo.js`
- `core/importa.js`
- `data/seed.js`

Resultado esperado:

```txt
PORTAL-PAGOS-ADJUNTOS-DIAGNOSTICO
- Estado actual
- Dónde se pierde el adjunto
- Fix frontend para Claude
- Fix backend para ChatGPT/Codex
- Impacto manuales/Academia
```

## Estado

Documentación backend creada. No se modificó backend protegido ni producción.
