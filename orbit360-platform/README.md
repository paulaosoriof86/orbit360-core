# Orbit 360 · Plataforma

Sistema 360 para intermediarios de seguros, comercializable, white-label y multi-tenant. A&S es el primer tenant y se configura mediante `Orbit.tenant`; no existe un fork de código para Alianzas.

> Nota de marca vigente: existe una decisión estratégica provisional para cambiar la marca visible futura a **GRAVICENTRA**, pero es NO bloqueante. Hasta el bloque formal de rebranding se conserva `Orbit 360` como nombre técnico/operativo y no se cambian backend, contratos, colecciones, tenant IDs, Firebase, rutas, repositorio ni identificadores técnicos.

## Corte go-live vigente · 2026-08-15

```txt
Repositorio: paulaosoriof86/orbit360-core
Rama obligatoria: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open
main / merge: NO autorizados
Reimportación / cambios Auth / cambios de datos: NO autorizados
```

### Producción publicada actualmente

R3 permanece publicado e inmutable hasta que exista evidencia posterior al reemplazo:

- `orbit360-fase-a-product-r3-4f70f0dd6e87.zip`
- SHA256 `4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`
- source `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`
- 194 archivos de producto.

Auth/runtime productivo de R3 ya está certificado PASS: login HTTP 200, signedIn, emailVerified, membership active, tenant correcto, roles requeridos, runtime/router/tenant-context activos, store read-only y cero writes. Datos privilegiados productivos también PASS: **430 clientes + 30 aseguradoras**, cero writes.

### Sucesora mínima R4S1 · CERTIFICADA

El defecto funcional de rendimiento de `Orbit.access.filter()` fue corregido en source por `df4c217c34722c03215f88b62f6865ab41c2a9f3`, modificando únicamente `core/access-scope.js`. La regresión preservó semántica y redujo `store.get()` para Dirección/430 de 1720 a 4.

La sucesora mínima ya fue generada y certificada; **no se reconstruye nuevamente**:

- ZIP `orbit360-fase-a-product-r4s1-df4c217c3472.zip`
- SHA256 `49f5a5eee451665fcc420fc9acee88347b95aa832a8f6f524053cc4ccaa0d60d`
- fileCount `194`
- `193` archivos de producto byte-idénticos a R3
- `1` único delta: `core/access-scope.js`
- SHA256 del delta `8976ab8032f210a0f93d79f4ace037ec3b3e8fe8c1ac9e1f5a0eadd8d134fb3f`
- run `31915191809`
- job `95085878427`
- durable artifact `9254713380`
- evidence artifact `9254713130`
- gate canónico: PASS 13/13, failed 0, writes autorizados 0.

Estado: `R4S1_MINIMAL_SUCCESSOR_DURABLE_CERTIFIED`.

### Publicación R4S1 · AUTORIZADA / PENDIENTE

La autorización macro vigente cubre backup/rollback, publicación exclusiva de R4S1 en `app.aysseguros.com` y **una única matriz productiva final read-only** después de verificar la identidad publicada.

La publicación todavía no se ha ejecutado. El ejecutor actual no dispone de un canal autenticado seguro de mutación del filesystem de HostDime: no hay workflow/script versionado para el dominio, `scp`, `rsync` o FTP; no hay clave privada SSH utilizable y la integración GitHub no permite listar Actions secrets/variables. Esto se registra como una limitación del entorno del ejecutor, no como defecto de HostDime ni del producto.

Clasificación del límite de transporte:

`ENVIRONMENT_FAILURE / R4S1_AUTHENTICATED_HOSTDIME_TRANSPORT_UNAVAILABLE_IN_CURRENT_TOOLING`

El browser final permanece congelado hasta que R4S1 esté publicado y verificado estáticamente.

### Secuencia exacta pendiente

1. backup rollback-capable del contenido vivo de `app.aysseguros.com`;
2. publicar **solo** el ZIP R4S1 certificado, sin parchear R3 in-place;
3. verificar manifest sucesor y SHA de `core/access-scope.js`;
4. ejecutar el gate canónico obligatorio;
5. habilitar exactamente una matriz final productiva read-only;
6. validar Auth/runtime + 430 clientes + 30 aseguradoras + Dirección/Operativo/Asesor + scopes + rendimiento fast-path + cero Firestore/Auth/operational writes;
7. refreezar y sincronizar evidencia.

Ante cualquier fallo: STOP, clasificar causa raíz y no reintentar por intuición.

Avance permanece **100% funcional / 75% técnico / 67% gates (2/3)** hasta `POST_GO_LIVE_SMOKE_PASS`.

Checkpoint vigente: `docs/CIERRE-R4S1-SUCESORA-MINIMA-CERTIFICADA-PUBLICACION-PENDIENTE-20260815.md`.

Estado canónico: `docs/orbit360-live-state-v1.json`.

## Fuentes rectoras

Leer antes de actuar:

1. Documento Maestro Consolidado 20260704.
2. Addendum Academia Profunda 20260704.
3. Addendum Patrones Reutilizables Claude/Backend 20260707.
4. Addendum Continuidad Clientes/Multirol/Importadores 20260709.
5. Plan Maestro de Ejecución Productiva 20260716.
6. Addendum Control de Causa Raíz, Validadores y Gates 20260717.
7. `docs/ADDENDUM-MAESTRO-ACELERACION-PRODUCTIVA-REUSO-TRANSVERSAL-Y-CONTROL-AUTORIZACIONES-20260730.md`.
8. `docs/NOTA-RECTORA-REBRANDING-GRAVICENTRA-NO-BLOQUEANTE-20260730.md`.
9. `docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`.
10. `docs/orbit360-live-state-v1.json` + checkpoint vigente + PR #5 + HEAD vivo.

Precedencia: reglas maestras/addenda → PR/HEAD/estado vivo → Plan Maestro → evidencia modular reciente. No reabrir trabajo cerrado por documentación anterior desactualizada.

## Reglas de ejecución permanentes

- autorización por bloque macro de riesgo, no micro-pasos;
- diagnóstico, documentación y validación estática/sintética continúan sin autorización adicional;
- ejecutar primero el gate canónico antes de secretos/browser/deploy;
- un fallo productivo no genera automáticamente otro recovery;
- repetición de etapa/familia de fallo activa `STOP_RETRY`;
- producción no se usa para desarrollar validators;
- no se prepara otro recovery hasta tener causa raíz demostrada + fix reusable + prueba estática/sintética;
- un request productivo es inmutable y de una sola ejecución;
- 0% manual salvo imposibilidad técnica real;
- no modificar Auth/usuarios/memberships/datos por intuición;
- no reimportar Clientes/Aseguradoras para resolver visualización, acceso, cache, proyección o gates;
- no avanzar a otro módulo mientras el gate final de go-live siga abierto.

## Infraestructura transversal que NO se reconstruye por módulo

Se reutiliza en Pólizas, Vehículos, Cobros, Siniestros y módulos posteriores:

- Auth/membership/scopes;
- multirol y rol activo;
- `Orbit.store` + write guard;
- manifiesto canónico de colecciones;
- aliases lógico → físico;
- readiness de colecciones activas;
- smoke multirol/multivista;
- diagnóstico sanitizado;
- integridad before/after + digests;
- cero escrituras cuando el bloque sea read-only;
- rollback fail-closed;
- clasificación de causa raíz + `STOP_RETRY`;
- request inmutable y gate único.

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

El cambio visible se ejecutará únicamente en el último punto técnicamente seguro antes del lanzamiento público definitivo, sin mezclarlo con gates de datos/backend/migración abiertos.

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
