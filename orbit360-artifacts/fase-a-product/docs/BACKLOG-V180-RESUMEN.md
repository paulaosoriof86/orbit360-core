# Backlog Orbit 360 v1.80

Fecha: 2026-07-02
ZIP: Prototype Development Request - 2026-07-02T142044.699.zip

## Mejoras confirmadas

- Finanzas profundo: dashboard, metas, semaforos, sugeridor y tablas.
- Portal a Siniestros crea reclamo canonico y enlace con Ops, Historial y Cliente 360.
- Siniestros actualiza Ops e Historial al cambiar estado.
- Recaudo comercial por pagos aplicados queda identificado como avance, pero no debe registrarse como movimiento financiero real.
- Badges tecnicos ocultos por defecto.
- Encoding limpio en archivos.
- Referencias ajenas funcionales limpias.
- Nuevo core notify para avisos al cliente.
- Importador con dry-run.
- Marketing, Renovaciones, Insights, Polizas, Cotizador y Comparativo tienen avances.

## Correccion negocio/backend

Pago aplicado por cliente no es ingreso de la empresa. Debe afectar cartera, recaudo, metas de recaudo, produccion recaudada, estimado de comision y liquidacion esperada de aseguradora. Solo factura cobrada, liquidacion recibida, pago real a asesor/proveedor o gasto/ingreso bancario debe ir a finmovs.

Documento de decision: `docs/DECISION-RECAUDO-VS-FINMOVS-20260702.md`.

## Pendientes abiertos

- modules/configuracion.js conserva localStorage directo para logo.
- Persisten fechas historicas en core/ciclo.js, cliente360.js, portal.js y siniestros.js.
- Falta validacion visual local del flujo Portal a Siniestros.
- Falta empalme backend-safe v1.80 preservando Firestore LAB.
- Falta contrato backend para notify, metas, reclamos, actividades y separacion recaudo vs finmovs.
- Fallaron dos scripts PowerShell de empalme por sintaxis; no se deben reutilizar. Cambiar metodologia a empalme GitHub/directo y bloques locales minimos.

## Proxima fase

Fase 8.5: empalmar v1.80 con backend LAB protegido antes de retomar Auth/Fase 9, corrigiendo la separacion entre recaudo comercial y movimientos financieros reales.
