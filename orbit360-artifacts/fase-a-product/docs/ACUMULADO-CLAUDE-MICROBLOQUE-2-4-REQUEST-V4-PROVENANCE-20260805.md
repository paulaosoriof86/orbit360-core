# ACUMULADO CLAUDE — MICROBLOQUE 2.4 REQUEST V4 Y PROVENANCE

Fecha: 2026-08-05  
RC de evidencia: `RC-AYS-LAB-CANONICA-01`

## REPLICABLE_CLAUDE_INMEDIATO

### Checkout completo para baseline congelado

Patrón reusable:

```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ github.sha }}
    fetch-depth: 0
    persist-credentials: false
```

Antes de comparar:

```bash
git cat-file -e "$SOURCE_BASELINE^{commit}"
git merge-base --is-ancestor "$SOURCE_BASELINE" HEAD^
git diff --quiet "$SOURCE_BASELINE"..HEAD^ -- <paths protegidos>
```

### Separación de requests

Usar tres estados físicamente separados:

```text
request runtime consumido e inmutable
request source-only consumido e inmutable
request runtime futuro ausente hasta autorización
```

El consumo se escribe en ledger/evidencia, nunca modificando el path disparador.

### Composición integrada del gate

Validar en la misma ejecución source-only:

```text
request → provenance → outer router → lifecycle → inner engine
```

No declarar PASS basándose únicamente en sintaxis o inspección estática individual.

### Frontera source-only

Todas las capacidades operativas deben permanecer explícitamente en `false`:

```text
secretAccessAuthorized
firebaseAuthorized
firestoreAuthorized
functionsAuthorized
hostingAuthorized
browserAuthorized
deployAuthorized
rulesAuthorized
productionAuthorized
```

## REPLICABLE_CLAUDE_ACUMULADO

- Evidencia construida desde outputs observados, no contadores literales.
- Un commit disparador debe contener un solo request.
- El request debe vincularse al parent HEAD exacto.
- El runtime workflow debe permanecer inerte mientras el request futuro no exista.
- `STOP_RETRY` debe impedir reruns y mutaciones del request consumido.

## ACADEMIA_ACTUALIZAR

Incorporar una lección sobre:

- diferencia entre `FUNCTIONAL_DEFECT` y `PIPELINE_MECHANISM_FAILURE`;
- checkout superficial frente a baseline congelado;
- provenance antes de secretos;
- requests source-only y runtime;
- outer router e inner engine como unidad;
- estados honestos cuando una etapa no llegó a ejecutarse.

Fuente formativa:

```text
orbit360-platform/docs/ACADEMIA-ACTUALIZACION-MICROBLOQUE-2-4-REQUEST-V4-PROVENANCE-20260805.md
```

## BACKEND_PROTEGIDO_NO_CLAUDE

No enviar ni sobrescribir:

- adaptadores Firestore LAB/productivos;
- `data/store.js`;
- `core/backend-lab-*`;
- bloques protegidos de `core/auth.js`;
- `core/importa.js`;
- `firestore.rules`;
- contratos y tools protegidos completos.

Claude puede recibir el patrón arquitectónico, no el backend concreto.

## SECRETO_DATO_REAL

No incluir:

- service accounts;
- credenciales;
- secretos de Actions;
- payloads de clientes;
- documentos de aseguradoras o pólizas;
- IDs privados no necesarios para el patrón.

## TEMPORAL_RETIRO

No convertir en contrato reusable:

- SHAs específicos;
- IDs de runs, jobs y artifacts;
- nombres de archivos fechados cuando solo documentan evidencia puntual;
- paths de requests ya consumidos;
- fechas de expiración de artifacts.

## Evidencia del patrón

```text
continuidad/provenance: 33/33 PASS
inner preflight: 32/32 PASS
runtime: no
secretos: no
deploy: no
```
