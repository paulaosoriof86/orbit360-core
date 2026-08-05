# ESTADO ACTIVO — MICROBLOQUE 2.4

Fecha local: 2026-08-04 23:41 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `PASS_REQUEST_V4_PROVENANCE_COMPOSITION`  
Estado: `AUTHORIZED_SOURCE_ONLY_ONCE`

## Objetivo único

Validar exclusivamente en modo source-only:

1. request de continuidad v4 vinculado al parent HEAD;
2. presencia y ancestry del baseline congelado;
3. producto sin cambios frente al baseline;
4. request runtime v3 consumido e inmutable;
5. workflow runtime existente apuntando al path v4 ausente;
6. checkout completo `fetch-depth: 0`;
7. guard `git cat-file -e "$ORBIT360_SOURCE_BASELINE^{commit}"`;
8. outer router e inner engine en una sola composición;
9. cero capacidades y cero ejecución operativa.

## Paths

```text
request source-only:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4-source-only.json

request runtime futuro ausente:
.github/orbit360-requests/block12-go-lab-candidate-visible-v4.json

request runtime consumido e inmutable:
.github/orbit360-requests/block12-go-lab-candidate-visible-v3.json
```

## Frontera

```text
runtime: no
secretos: no
Firebase: no
Firestore: no
Functions: no
Hosting: no
navegador: no
deploy: no
Rules: no
reimportación: no
producción/main/merge: no
repetición funcional 18/18: no
```

## STOP_RETRY

La validación tiene una sola ejecución source-only. Ante fallo, no se modifica el request disparador ni se reejecuta el mismo run; se cierra con clasificación, causa raíz, owner y solución.
