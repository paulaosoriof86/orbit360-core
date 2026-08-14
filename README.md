# orbit360-core

Repositorio de Orbit 360.

## REANUDACIÓN OBLIGATORIA

Antes de diagnosticar, modificar, ejecutar runtime/browser/deploy o continuar una conversación interrumpida, leer en este orden:

1. `orbit360-platform/docs/orbit360-live-state-v1.json`;
2. HEAD real de `ays/backend-tenant-lab-v99-20260703` y PR #5;
3. último workflow/evidencia indicado por `lastEvidence`;
4. `orbit360-platform/docs/ADDENDUM-MAESTRO-CONTINUIDAD-SINCRONIZACION-ANTIBUCLE-GOLIVE-POSTPROD-20260814.md`;
5. `orbit360-platform/docs/CIERRE-R3-DURABLE-PACKAGE-PASS-20260814.md`;
6. `orbit360-platform/CHANGELOG-R3C-GOLIVE-20260814.md`.

No usar memoria, README histórico, PENDIENTES o una conversación anterior como sustituto del live-state.

## Estado vivo · R3 CERRADO · 2026-08-14

```text
stateVersion: 20260814.r3-durable-package-pass.1
fase: PRE_GOLIVE_R4_AWAIT_EXPLICIT_PUBLISH_AUTHORIZATION
RC: RC-AYS-LAB-CANONICA-01
baseline funcional histórico: 4ede3e785cb2cc889a7c11c2d9e2030c7af20b64
source HEAD del paquete certificado: 4f70f0dd6e870e8c7443a7638a9dc6e954eace1b
control HEAD con browser re-congelado: 0cd626bf5021580832041dec02f1398c99a429ed
run R3 PASS: 31836094541
ZIP: orbit360-fase-a-product-r3-4f70f0dd6e87.zip
SHA256: 4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69
PR #5: draft/open
main/merge: no
HostDime/deploy/producción: no tocados
```

## R3 certificado

La única frontera de aceptación post-causa-raíz autorizada fue el run `31836094541` sobre `4f70f0dd6e870e8c7443a7638a9dc6e954eace1b`.

Resultado:

- gate contractual source PASS antes de secretos;
- build/entrypoint/dynamic closure PASS;
- policy y owner Academia LAB-only ausentes;
- identidad existente y config read-only PASS;
- Product App `started=true`;
- router `started=true`;
- tenant-context `ready=true`, fuente `authenticated-product-membership`;
- backend `product-readonly`, writes no autorizados;
- store `ready-read-only`;
- required 7/7, `requiredMissing=[]`, `requiredFailed=[]`;
- clientes=430;
- aseguradoras=30;
- ruta `inicio`, `hostChildCount=1`;
- `pageErrors=[]`;
- `consoleErrors=[]`;
- `httpFailures=[]`;
- Firestore/Auth/operational writes = 0;
- deploy=0;
- producción intacta.

## Paquete durable

```text
status: FASE_A_PRODUCT_R3_DURABLE_PACKAGE_PASS
manifest: FASE_A_PRODUCT_R3_DURABLE_PACKAGE_CERTIFIED
fileCount: 194
requiredHydrationCertified: true
dynamicRuntimeClosureCertified: true
productTenantContextCertified: true
routerRenderCertified: true
noLabRuntime: true
noPrivateSecretMaterial: true
writeAuthorized: false
deployExecuted: false
productionTouched: false
```

El SHA256 fue verificado nuevamente sobre el ZIP descargado de GitHub Actions y coincide exactamente con la evidencia:

`4fd52a748fa130fd069b2d2684e1944369164aeb0646fe728067dd7b4ce29e69`.

El artifact durable de GitHub Actions es `orbit360-fase-a-product-r3-durable-31836094541`.

## Guardia post-R3

Después del PASS se restauró `ORBIT360_R3_SOURCE_ONLY_ROOTFIX=true` en `0cd626bf5021580832041dec02f1398c99a429ed` para impedir una segunda ejecución browser accidental. El control source-only run `31836358548` terminó SUCCESS y dejó instalación/secrets/identity/browser/ZIP en `skipped`.

## Porcentajes vigentes

```text
readiness funcional: 100%
avance técnico global: 75% (R1+R2+R3 cerrados)
gates finales: 67% (2/3)
R3: PASS + ZIP durable certificado
R4 PASS -> 100% técnico / 100% gates
```

## Siguiente acción exacta

R4 está pendiente de autorización explícita. No iniciar HostDime, deploy ni producción por continuidad automática.

Con autorización R4:

1. tomar exclusivamente el ZIP certificado anterior y verificar SHA256 antes de publicar;
2. resolver/publicar `app.aysseguros.com` sin reabrir hostname como diagnóstico de producto;
3. no reconstruir ni sustituir el paquete durante publicación;
4. ejecutar E2E productivo final después de publicar, incluyendo autenticación, roles/scopes y rutas críticas acordadas;
5. exigir cero fallos bloqueantes y cero escrituras no autorizadas;
6. documentar rollback/backup y evidencia sanitizada;
7. sin main ni merge salvo autorización separada.

## Reglas anti-bucle

- R1/R2/R3 están cerrados; no se reabren sin drift reproducible;
- paquete R3 se identifica por nombre + SHA256, no por “último ZIP”;
- HostDime no puede provocar reconstrucción del producto;
- cualquier fallo R4 se clasifica antes de corregir;
- una sola frontera larga por iteración;
- cada cambio de estado sincroniza live-state + PR #5 + README + checkpoint + bitácora.
