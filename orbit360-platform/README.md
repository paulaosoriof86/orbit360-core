# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

> Nota de marca vigente: existe una decisión estratégica provisional para cambiar la marca visible futura a **GRAVICENTRA**, pero es NO bloqueante. Hasta el bloque formal de rebranding se conserva `Orbit 360` como nombre técnico/operativo y no se cambian backend, contratos, colecciones, tenant IDs, Firebase, rutas, repositorio ni identificadores técnicos.

## Fuentes rectoras — corte 2026-07-30

Leer antes de actuar:

1. Documento Maestro Consolidado 20260704.
2. Addendum Academia Profunda 20260704.
3. Addendum Patrones Reutilizables Claude/Backend 20260707.
4. Addendum Continuidad Clientes/Multirol/Importadores 20260709.
5. Plan Maestro de Ejecución Productiva 20260716.
6. Addendum Control de Causa Raíz, Validadores y Gates 20260717.
7. `docs/ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`.
8. `docs/NOTA-RECTORA-REBRANDING-GRAVICENTRA-NO-BLOQUEANTE-20260730.md`.
9. `docs/ARQUITECTURA-REUTILIZABLE-INGESTA-MODULOS-POST-M6-20260730.md`.
10. `docs/CIERRE-M6-FINAL-630-PASS-20260730.md`.
11. `docs/REGLA-FUENTES-OPERATIVAS-VIGENTES-BAJO-DEMANDA-20260730.md`.
12. PR #5 + HEAD vivo + evidencia reciente del módulo.

Precedencia: reglas maestras/addenda → PR/HEAD vivo → Plan Maestro → evidencia modular reciente. No reabrir trabajo cerrado por documentación anterior desactualizada.

## Estado vivo

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
main / merge / Functions: no autorizados

M1–M4: CERRADOS
M5 5.0.44: CERRADO + revisión visual aprobada
M6 6.3.0: CERRADO · M6_FINAL_CLOSURE_PASS
Pólizas: PREPARACIÓN ESTÁTICA/READ-ONLY ACTIVA

Substrate productivo M6 read-only: LIVE
Firestore data writes del cierre M6: 0
Operational writes del cierre M6: 0
Storage: inexistente / diferido fail-closed
Pólizas reales: NO MIGRADAS / NO ACTIVADAS PRODUCTIVAMENTE
Fuente real vigente de pólizas: PENDIENTE DE PAULA CUANDO EL DRY-RUN LA REQUIERA
```

Evidencia M6 final:

```txt
Run: 30562624279
Artifact: 8767559350
Digest: sha256:9a555a3b47d2605397d11d9e81996720afdd655cd7408b55994f5f531a17ba2f
productionLive: true (substrate productivo read-only M6)
rollbackExecuted: false
414 clientes
26 aseguradoras
7 asesores fuente
Dirección desktop: PASS
Operativo tablet: PASS
Asesor móvil: PASS
countsStable: true
digestsStable: true
networkWriteCandidates: 0
Firestore data writes: 0
operational writes: 0
```

## Directiva de aceleración

Ruta crítica:

`Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → Siniestros/Documentos → resto del plan`.

Reglas:

- autorización por bloque macro de riesgo, no micro-pasos;
- diagnóstico, documentación y validación estática/sintética continúan sin autorización adicional;
- un fallo productivo no genera automáticamente otro recovery;
- repetición de etapa/familia de fallo activa `STOP_RETRY`;
- producción no se usa para desarrollar validators;
- no se prepara otro recovery hasta tener causa raíz demostrada + fix reusable + prueba estática/sintética;
- un request productivo es inmutable y de una sola ejecución;
- 0% manual salvo imposibilidad técnica real.

## Infraestructura transversal que NO se reconstruye por módulo

Se reutiliza en Pólizas, Vehículos, Cobros, Siniestros y módulos posteriores:

- Auth/membership/scopes;
- multirol y rol activo;
- `Orbit.store` + write guard;
- manifiesto canónico de colecciones;
- aliases lógico → físico;
- readiness de todas las colecciones activas;
- blocking-gate readiness diferido;
- Hosting readiness acotado;
- smoke multirol/multivista;
- diagnóstico sanitizado;
- integridad before/after + digests;
- cero escrituras cuando el bloque sea read-only;
- rollback fail-closed;
- clasificación de causa raíz + `STOP_RETRY`;
- request inmutable y gate único.

Los módulos posteriores solo añaden contrato de fuente, esquema/aliases, normalización y reglas de negocio específicas.

## Bloque activo — Pólizas

Owner operativo existente: `core/policy-receipts-engine.js`, cargado por `index.html` junto con los refinamientos/bridges ya existentes.

La preparación estática puede continuar sin datos reales con:

1. contrato canónico de póliza;
2. identidad canónica tenant/país/aseguradora/número/cliente;
3. permisos y scopes;
4. prima separada en neta, gastos, IVA/impuestos y total;
5. generación determinística de recibos únicamente para `Vigente` / `Por renovar`;
6. histórico sin cartera para otros estados;
7. deduplicación/idempotencia;
8. reglas de actualización/endoso cuando existen pagos;
9. pruebas sintéticas/ficticias;
10. diseño del dry-run/diff reutilizando el harness M6.

### Regla bloqueante de vigencia de fuente

Los archivos antiguos de producción/movimientos y cualquier análisis derivado son referencia histórica/de diseño, no fuente oficial vigente para migrar pólizas.

Antes del primer dry-run con filas reales se debe pedir a Paula el **corte actualizado de pólizas**. La misma regla se aplica, cuando llegue cada etapa, a vehículos, cobros, planillas, financiero histórico, siniestros y documentos operativos pendientes.

No se permite:

- inferir pólizas oficiales desde `finmovs` o desde producción antigua;
- crear cartera/cobros reales con fuentes viejas;
- asumir que un archivo disponible sigue vigente;
- reimportar Clientes/Aseguradoras para resolver Pólizas.

## Reglas de negocio permanentes

- GT → GTQ; CO → COP.
- Falta país/moneda confiable → `REQUIERE_VALIDACION`.
- Solo `Vigente` / `Por renovar` genera recibos/cartera.
- Cancelada/Vencida/Anulada/Rechazada permanece histórico.
- Prima = neta + gastos + IVA/impuestos + total, sin colapsar campos.
- Producción, metas y comisiones sobre prima neta recaudada.
- Cobros/recaudos no son `finmovs`.
- Estados bancarios solo concilian; no crean cobros por inferencia.
- Documentos soporte proponen con diff/confirmación; no escriben silenciosamente.

## Rebranding futuro GRAVICENTRA

Estado: registrado / diferido / no bloqueante.

El cambio visible se ejecutará únicamente en el último punto técnicamente seguro antes del lanzamiento público definitivo, sin mezclarlo con gates de datos/backend/migración abiertos. En ese punto se anunciará:

`PUNTO SEGURO DE REBRANDING GRAVICENTRA ALCANZADO`.

## Arquitectura

```txt
orbit360-platform/
├── index.html
├── styles/
├── data/
├── core/
├── modules/
├── docs/
└── tools/
```

Los módulos consumen `Orbit.store`; el backend se adapta al store y no al revés. A&S continúa configurado como tenant, sin fork ni hardcode de datos/credenciales en módulos genéricos.
