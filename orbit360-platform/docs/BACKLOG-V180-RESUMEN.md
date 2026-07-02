# Backlog Orbit 360 v1.80

Fecha: 2026-07-02
ZIP: Prototype Development Request - 2026-07-02T142044.699.zip

## Mejoras confirmadas

- Finanzas profundo: dashboard, metas, semaforos, sugeridor y tablas.
- Portal a Siniestros crea reclamo canonico y enlace con Ops, Historial y Cliente 360.
- Siniestros actualiza Ops e Historial al cambiar estado.
- Pagos y conciliacion postean recaudo a finmovs.
- Badges tecnicos ocultos por defecto.
- Encoding limpio en archivos.
- Referencias ajenas funcionales limpias.
- Nuevo core notify para avisos al cliente.
- Importador con dry-run.
- Marketing, Renovaciones, Insights, Polizas, Cotizador y Comparativo tienen avances.

## Pendientes abiertos

- modules/configuracion.js conserva localStorage directo para logo.
- Persisten fechas historicas en core/ciclo.js, cliente360.js, portal.js y siniestros.js.
- Falta validacion visual local del flujo Portal a Siniestros.
- Falta empalme backend-safe v1.80 preservando Firestore LAB.
- Falta contrato backend para notify, metas, finmovs, reclamos y actividades.

## Proxima fase

Fase 8.5: empalmar v1.80 con backend LAB protegido antes de retomar Auth/Fase 9.
