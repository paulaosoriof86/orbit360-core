# Cierre formal M1 — Cliente 360, Aseguradoras e importadores E2E

Fecha: 2026-07-20  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Tenant LAB: `alianzas-soluciones`  
Producción/main/merge: no autorizados

## Decisión de cierre

```txt
BLOQUE 1 / M1: CERRADO
GATE: importers-e2e-acceptance-lab-v20260720
RESULTADO: GO_IMPORTERS_E2E
RUN: 29783567910
HEAD: f79bcc1ddeb53dbde784c7165132ae7e33d743ae
EVIDENCIA: ok:true
```

## Evidencia vinculante

Los dos jobs del workflow finalizaron con `success`:

1. `Importadores · preflight vinculante sin secretos`.
2. `Importadores · proveedor vigente, rollback, UI legal, store y auditoría`.

Artefacto sanitizado:

```txt
orbit360-importers-e2e-v4-29783567910
artifactId: 8477581608
digest: sha256:f2ac23413eee5af6adaf756869847c72af32df672065e885b6d58a7c246344d1
```

La evidencia final `importers-e2e-acceptance-sanitized.json` declara:

```txt
stage: completed
ok: true
containsPII: false
containsSecrets: false
```

## Predicados aprobados

```txt
browserAuthReady: true
activeRoleResolved: true
legalGateSatisfied: true
sourceParsed: true
dryRunProduced: true
targetIdsResolved: true
providerInvoked: true
providerStatus: 200
remoteConfirmation: true
storeWriteObserved: true
opaqueReferenceObserved: true
readAfterWriteOk: true
auditSuccessObserved: true
auditFailureObserved: true
plaintextSecretsInOperationalStore: false
rollbackOk: true
```

La evidencia de sesión final confirma adicionalmente:

```txt
tenantResolved: true
legalAcceptanceRecorded: true
legalOverlayOpen: false
ready: true
```

## Rollback y limpieza

### Residuo del run anterior

El residuo sintético de `29782834288` se retiró antes de crear un nuevo fixture:

```txt
vaultRecordDeleted: true
transientVersionDestroyed: true
cleanupVersionCreated: true
otherRecordsPreserved: true
```

### Run final

El rollback del run `29783567910` también finalizó correctamente:

```txt
vaultRecordDeleted: true
transientVersionDestroyed: true
cleanupVersionCreated: true
otherRecordsPreserved: true
```

La limpieza operativa confirmó:

```txt
insurerDeleted: true
backendAuditDeleted: 2
operationalAuditDeleted: 1
countsRestored: true
```

## Conteos preservados

```txt
clientes: 414
aseguradoras: 26
asesores: 7
portales baseline: 77
```

Los tres primeros conteos fueron verificados directamente después del cleanup. Los 77 portales del baseline permanecieron intactos: el gate trabajó únicamente sobre una aseguradora sintética aislada, cuyo documento y portal anidado fueron eliminados, sin reimportar ni modificar las 26 aseguradoras reales.

## Proveedor seguro

Las cuatro Functions quedaron confirmadas en estado autoritativo remoto:

```txt
DEPLOYMENT_CONFIRMED_CURRENT
PROVIDER_AUTHORIZATION_LAYER_READY
```

Para cada Function se verificó:

- estado `ACTIVE`;
- runtime Node.js 22;
- entry point correcto;
- cuenta ejecutora correcta;
- última revisión creada = última revisión lista;
- 100% del tráfico sobre la revisión vigente;
- IAM callable disponible.

No se realizó redeploy en el run final.

## Causas raíz cerradas durante M1

1. Overlay legal sobre el primer clic.
2. Dependencia XLSX ausente.
3. Membresía multirol incompleta.
4. Normalización de roles truncada por callback.
5. Validador obsoleto.
6. Checkout mutable entre jobs.
7. Autovalidador autorreferencial.
8. Dependencias de `functions/` no instaladas.
9. Falso negativo del exit code posterior al deploy.
10. Observabilidad insuficiente de revisiones remotas.
11. Dependencia de Secret Manager ausente en el rollback.
12. Residuo sintético de bóveda sin retirar.

Cada causa quedó documentada y no debe reabrirse sin evidencia nueva de regresión.

## Aclaración sobre el bloque visible del PR

El bloque automático de una ejecución anterior mostró `Tenant resuelto: false` porque consultaba un alias inexistente en el nivel superior de `predicates`. La evidencia autoritativa del navegador lo registra en `diagnostic.sessionReadinessFinal.predicates.tenantResolved: true`. Es un defecto de presentación del resumen del PR, no un fallo de sesión, producto ni gate.

## Carriles

### Carril A — Frontend, UX y Academia

- Cliente 360 y Aseguradoras preservados.
- Acuerdo legal real y estados honestos verificados.
- No se modificaron módulos funcionales durante el cierre del rollback.

### Carril B — Backend y seguridad

- Proveedor seguro vigente.
- Referencias opacas; cero valores protegidos en store operativo.
- Auditorías de éxito y rechazo.
- Rollback de Firestore y Secret Manager aprobado.

### Carril C — Datos A&S

- Sin reimportación de Clientes o Aseguradoras.
- Sin fuentes reales GT/CO en el gate.
- Conteos restaurados.
- Cero escritura residual sintética.

## Impacto Claude / prototipo

```txt
REPLICABLE_CLAUDE_ACUMULADO
BACKEND_PROTEGIDO_NO_CLAUDE
```

Patrones reutilizables para Claude:

- readiness antes del primer clic;
- acuerdo legal real, sin bypass;
- estados honestos del importador;
- referencia opaca en UI;
- no declarar integración activa sin confirmación real.

No se comparten proveedor, IAM, bóveda, secretos, cuentas ejecutoras ni scripts protegidos.

## Impacto Academia

Actualizar la ruta Dirección / Superadmin / IT con:

- diferencia entre defecto funcional y fallo de pipeline;
- SHA inmutable;
- deploy solicitado vs revisión realmente lista;
- importación segura de credenciales;
- referencia opaca;
- auditoría de éxito y rechazo;
- rollback operativo y rollback de bóveda como capas separadas.

## Estado y siguiente acción exacta

```txt
M1: CERRADO
PÓLIZAS/COBROS: todavía no iniciar
SIGUIENTE BLOQUE: BLOQUE 2 — BOOTSTRAP PRODUCTIVO READ-ONLY
```

Primera acción del Bloque 2:

1. verificar contrato productivo y proyecto autorizado;
2. preparar bootstrap productivo explícito sin escrituras;
3. resolver tenant desde membership;
4. instalar el store productivo read-only;
5. demostrar fail-closed, aislamiento tenant y cero fallback demo/LAB;
6. no desplegar producción hasta autorización explícita.
