# CHECKPOINT — F2 PRE-REQUEST06 KNOWN ROOTFIXES PASS · 2026-08-19

## Bloque
F2 Productive Acceptance — auditoría preventiva completa antes de Request06.

## Evidencia cerrada
- Postdeploy RULES01 run único `32272580947`, artefacto `9372746151`.
- Probe server-forced: **403 / PERMISSION_DENIED** sobre `tenants/orbit360-f2-cross-tenant-probe/system/config`.
- Integridad before/after: counts y digests idénticos.
- Writes Firestore/Auth/membership/data/operational: **0**.
- Sin redeploy de reglas, Hosting, Functions, rebuild, publicación ni producción.
- Contrato de evidencia: `F2_POSTDEPLOY_EVIDENCE_PRODUCER_CONTRACT_V1`; no se infiere el esquema: compone los tres producers reales (terminal plano + probe + integridad).

## Rootfixes conocidos revalidados en source
1. Autenticación productiva del sucesor: provider browser real con password sign-in presente.
2. Legal gate: quiet window posterior al detach preservado.
3. Roles: SuperAdmin resuelve vista Dirección; AdminTenant no.
4. Topología: Inicio, Cliente 360, Aseguradoras, Ops, Leads, Pólizas y Cobros; Vehículos y Recibos/cartera integrados.
5. Cross-tenant: runner completo comparte `F2_CROSS_TENANT_PROBE_VALID_PATH_V2`; ID reservado eliminado.
6. Lifecycle: request dinámico run-bound, sin acople a ordinal histórico.
7. PWA/Service Worker: build del sucesor congelado consistente y limpieza de caches anteriores presente.
8. Artefacto exacto `9345207863` preservado; workflow runtime sin comandos de deploy.

## Por qué Paula todavía no ve estos fixes
El sucesor certificado permanece **unpublished** y `productionOperationalDeclared=false`. La URL pública todavía no es evidencia del sucesor certificado. Esto no reabre autenticación ni Cliente 360.

## Estado
Carril A: FROZEN_NO_CHANGES. Carril B: `F2_PRE_REQUEST06_KNOWN_ROOTFIXES_SOURCE_AUDIT_PASS_AUTHORIZATION_PENDING`. Carril C: UNTOUCHED_ZERO_CHANGES. Ruta inmediata: **50%**; programa integral: **25%** hasta cerrar F2 runtime.

## Siguiente acción exacta
`F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST06 / EXACT_ARTIFACT_9345207863`. Solo requiere autorización fresca. El workflow volverá a ejecutar el self-test de rootfixes y el gate canónico **antes** de secretos/browser. No puede escribir, redeplegar reglas, publicar ni tocar producción.

## Anti-regresión
No repetir Request01–05, RULES01 ni postdeploy Request01. No volver a diagnosticar autenticación/Cliente360/HostDime como bloqueadores sin evidencia nueva. Si Request06 falla en un código ya corregido, STOP inmediato y diagnóstico de integración del rootfix; no Request07 automático.
