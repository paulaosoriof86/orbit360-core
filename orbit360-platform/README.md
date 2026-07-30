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
9. `docs/FUENTES-RECTORAS-VIGENTES-ORBIT360-AYS-20260730.md`.
10. PR #5 + HEAD vivo + evidencia reciente del gate/módulo.

## Estado vivo

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama activa: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
main / merge / Functions: no autorizados

M1–M4: CERRADOS
M5 5.0.44: CERRADO + revisión visual aprobada
M6 6.1.14: ROLLED_BACK_SAFE · VALIDATOR_STALE / LEGAL_GATE_DEFERRED_RENDER_RACE
M6 6.1.15: PASS estático · blocking-gate readiness reusable
M6 FINAL CLOSURE 6.2.0: PREPARADO / INERTE · paquete completo PASS estático
request final closure: AUSENTE

Producción funcional: NO LIVE
Firestore: deny-all
Hosting: rollback neutro
Storage: diferido fail-closed
Datos: intactos
Pólizas: todavía no iniciadas
```

### Evidencia del macro-paquete final

```txt
Static package run: 30555149234
Artifact: 8764440108
Digest: sha256:40005b2a221ba5f4c385add2ea07470e02497b9d9ef2bb56fa5fdd4baf79e89d
FINAL_LIFECYCLE: PASS
FINAL_ENGINE: PASS
FINAL_WORKFLOW: PASS
SMOKE_USES_HELPER: PASS
SYNTHETIC_DELAY_TEST: PASS (520 ms · accepted 1 · remaining 0)
ACCELERATION_GOVERNANCE: PASS
TRANSVERSAL_ARCHITECTURE: PASS
NO_NEW_RECOVERY_REQUEST: PASS
Recovery productivo: SKIPPED
Secret/Firestore/browser/deploy/production: false/false/false/false/false
```

## Baseline canónico preservado

```txt
clientes: 414
aseguradoras: 26
asesores fuente: 7
membership: 1
config: 1
GT/CO clientes: 398/16
moneda faltante: 0
```

M6 ha validado repetidamente integridad before/after, cero escrituras de datos en los recoveries read-only y rollback seguro ante fallo contractual.

## Directiva vinculante de aceleración

La prioridad es cerrar Fase A y alcanzar producción funcional lo antes posible sin regresiones.

Ruta crítica:

`cerrar M6 → Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → Siniestros/Documentos → resto del plan`.

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

Fuente: `docs/ARQUITECTURA-REUTILIZABLE-INGESTA-MODULOS-POST-M6-20260730.md`.

Se reutiliza en Pólizas, Vehículos, Cobros, Siniestros y módulos posteriores:

- Auth/membership/scopes;
- multirol y rol activo;
- `Orbit.store` + write guard;
- manifiesto canónico de colecciones;
- aliases lógico → físico;
- readiness de todas las colecciones;
- blocking-gate readiness diferido;
- Hosting readiness acotado;
- smoke multirol/multivista;
- diagnóstico sanitizado;
- integridad before/after + digests;
- cero escrituras cuando el bloque sea read-only;
- rollback fail-closed;
- clasificación de causa raíz + `STOP_RETRY`;
- request inmutable y gate único.

Los módulos posteriores solo deben añadir su contrato de fuente/dominio/reglas de negocio específicas.

## M6 Final Closure 6.2.0

Se abandonó la secuencia de micro-recoveries como unidad de avance. El siguiente riesgo productivo está agrupado en un único macro-cierre `6.2.0` que exige simultáneamente:

- validator browser `20260730.7`;
- blocking-gate readiness reusable;
- prueba sintética del gate legal diferido a 520 ms;
- 414 clientes / 26 aseguradoras;
- alias `country → pais`;
- snapshots completos;
- write guard;
- Dirección desktop / Operativo tablet / Asesor móvil;
- semantic insurer click + viewport hit-test;
- Firestore Rules read-only;
- Hosting + readiness acotado;
- integridad before/after;
- cero network writes;
- rollback automático;
- Storage diferido fail-closed;
- reuso transversal obligatorio.

El macro-paquete está preparado, pero sigue inerte: `tools/orbit360-m6-final-closure-request-v20260730.json` NO existe.

## Rebranding futuro GRAVICENTRA

Estado: registrado / diferido / no bloqueante.

El punto recomendado es el último punto técnicamente seguro antes del lanzamiento público definitivo, una vez cerrada la funcionalidad crítica y sin gate de datos/migración abierto.

En ese momento se debe anunciar:

`PUNTO SEGURO DE REBRANDING GRAVICENTRA ALCANZADO`

Antes de cambiar nada se hará inventario read-only de referencias visibles a Orbit 360 y se clasificará cada una entre cambio visual, identificador técnico a conservar, documento histórico, revisión legal, asset o metadata pública.

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

## Siguiente acción

No queda trabajo estático pendiente antes del macro-cierre M6 6.2.0. La próxima transición de riesgo es una sola ejecución productiva del `M6 Final Closure 6.2.0`; únicamente después de PASS se cierra M6 y se entra inmediatamente a Pólizas reutilizando la infraestructura transversal, sin otro acondicionamiento general.
