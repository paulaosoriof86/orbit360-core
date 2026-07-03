# Smoke post carga A&S LAB v1.104

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** smoke solo lectura creado e integrado al flujo de autorización.

## Archivos

```txt
tools/orbit360-smoke-post-carga-ays-lab-v104.mjs
tools/orbit360-smoke-post-carga-ays-lab-v104.ps1
```

## Objetivo

Validar, después de una escritura real en Firestore LAB, que los datos quedaron legibles por tenant y que no rompen reglas básicas de relaciones/cartera.

## Qué valida

- Lectura de colecciones del tenant `alianzas-soluciones`.
- Conteos de clientes, aseguradoras, pólizas, cobros, comisiones, facturas, finmovs, reclamos y vehículos.
- Pólizas con cliente/aseguradora válida en la muestra.
- Cobros con póliza/cliente válido en la muestra.
- Cobros pendientes no ligados a pólizas canceladas o vencidas.
- Moneda esperada por país en la muestra.

## Ejecución individual

```txt
tools/orbit360-smoke-post-carga-ays-lab-v104.ps1 -ProjectId <PROJECT_ID_LAB>
```

Requiere `GOOGLE_APPLICATION_CREDENTIALS` local.

## Integración

`tools/orbit360-autorizar-carga-ays-lab-v104.ps1` ejecuta este smoke automáticamente después de una escritura LAB exitosa.

Si falla, el flujo reporta error y no debe avanzarse a la siguiente fase sin revisar o aplicar rollback.

## Restricciones

- Solo lectura.
- No deploy.
- No producción.
- No escritura Firestore.
- No datos reales en repo.
- No credenciales en repo.
