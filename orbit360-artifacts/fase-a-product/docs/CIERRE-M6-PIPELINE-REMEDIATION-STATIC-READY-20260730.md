# CIERRE M6 — REMEDIACIÓN ESTÁTICA DEL PIPELINE LISTA

Fecha: 2026-07-30  
Gate: `block6-go-live-product-v20260730`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Resultado

La causa raíz `PIPELINE_MECHANISM_FAILURE` del chequeo HTTP inmediato posterior a Hosting quedó corregida sin ejecutar producción.

Run estático vinculante:

```text
run: 30517683129
job estático: 90791057029
resultado: PASS
job productivo: 90791078813
resultado productivo: SKIPPED
```

No se accedió a secretos, Firestore, navegador, Rules ni Hosting desde este cierre.

## Corrección permanente

Owner reusable:

`tools/orbit360-hosting-readiness-bounded-v20260730.mjs`

El owner:

- usa polling read-only con cache-busting;
- tolera respuestas transitorias dentro de un presupuesto acotado;
- exige marcador de shell productivo o rollback según modo;
- rechaza loaders LAB, seed y usuarios demo;
- registra si observó 404 transitorios;
- declara timeout solo después de agotar el presupuesto;
- no despliega ni escribe.

## Workflow estable

Se conserva un único owner de workflow M6:

`.github/workflows/orbit360-m6-corrective-go-live-v20260730.yml`

Ya no mezcla en una sola etapa:

```text
Firebase deploy
+ GET inmediato
+ validación de shell
```

Ahora separa:

```text
firebase_deploy
→ hosting_readiness
→ browser smoke
→ data_integrity
→ rollback condicional
```

La misma definición opera en dos modos:

1. cambio del propio workflow → solo preflight estático;
2. request recovery nuevo e inmutable → preflight + bloque productivo.

Esto evita crear otro workflow de un solo uso.

## Estado de seguridad

El estado remoto previo se mantiene fail-closed:

- Hosting: rollback neutro;
- Firestore: deny-all;
- Storage: inexistente / diferido fail-closed;
- datos: intactos;
- Functions: no;
- merge/main: no;
- Pólizas: no.

## Recovery preparado

Contrato canónico listo:

`6.1.4 · M6_PRODUCT_GO_LIVE_RECOVERY_EXECUTION`

Archivos propietarios:

- `tools/orbit360-validator-lifecycle-contract-m6-recovery-v20260730.json`
- `tools/orbit360-validar-gate-contracts-engine-m6-recovery-v20260730.mjs`
- `tools/orbit360-hosting-readiness-bounded-v20260730.mjs`
- `.github/workflows/orbit360-m6-corrective-go-live-v20260730.yml`

El request `tools/orbit360-m6-recovery-request-v20260730.json` **no existe** y no debe crearse sin nueva autorización productiva explícita.

## Próximo checkpoint humano

Una sola autorización para recovery M6 6.1.4. Esa autorización deberá cubrir en bloque:

- Firestore Rules read-only;
- Hosting shell productivo;
- readiness acotado;
- smoke Dirección/Operativo/Asesor;
- snapshots e integridad;
- rollback automático a Firestore deny-all + Hosting neutro si no cierra.

Storage permanece fuera del bloque y no se crea automáticamente.
