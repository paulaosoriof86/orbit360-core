# CHECKPOINT — F2 RUNTIME02 · CAUSA RAÍZ DEL GATE CERRADA CON CONTRATO ESTABLE

Fecha: 2026-08-18
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Gate: `f2-productive-acceptance-exact-successor-v20260818`
Artifact bloqueado: `9345207863`

## Dos STOP en la misma etapa: reintentos congelados

Request01/run `32205144735` y Request02/run `32206449703` se detuvieron en el mismo gate canónico antes de artifact, secretos, Firestore y browser. Ambos requests quedaron consumidos y sin replay. No se crea Request03 en este bloque.

## Causa raíz sistémica

El primer rootfix source-only había pasado, pero luego la sincronización documental cambió un estado narrativo válido (`f2AuthorizationStatus`). El engine seguía usando ese literal mutable como condición estructural. Así, una actualización documental correcta podía volver obsoleto el gate sin que cambiara el producto. Clasificación: `VALIDATOR_STALE`; producto afectado: no.

## Rootfix durable

Se creó `F2_STABLE_BOUNDARY_CONTRACT_V2`. La frontera estructural ahora depende de invariantes estables: F2 source-only cerrado, fase F2 aún abierta en el plan congelado, gate/candidato exactos, siguiente acción ligada al mismo gate/version/artifact e índice canónico ligado. Los textos narrativos de autorización/go-live dejan de ser autoritativos.

Run source-only `32206698751`: PASS. El self-test mutó arbitrariamente los estados narrativos y el contrato siguió PASS. Router canónico: `v10.5-f2-stable-boundary-contract`.

## Control preventivo nuevo

Después de cada sincronización documental F2 se debe ejecutar nuevamente el gate canónico source-only **sobre los documentos ya modificados** antes de permitir una nueva autorización runtime. Esto corrige la omisión metodológica que permitió que el primer rootfix quedara invalidado después de su propio PASS.

## Invariantes

- Request01 replay: no.
- Request02 replay: no.
- Candidate artifact descargado en ambos STOP: no.
- Secretos/Firestore/browser/runtime: no.
- Firestore/Auth/membership/data/operational writes: 0.
- Rebuild/deploy/publicación/producción: 0/no.
- Carril A: congelado.
- Carril C: sin cambios.
- Ruta inmediata a producción: 50%.
- Programa integral: 25%.

## Siguiente frontera

Solo después de PASS del post-sync source-only: `F2_PRODUCTIVE_ACCEPTANCE_RUNTIME_BROWSER_READONLY_V1 / REQUEST03 / EXACT_ARTIFACT_9345207863`. Requiere autorización explícita fresca; no reutilizar Request01 ni Request02.

## Claude / Academia

`REPLICABLE_CLAUDE_ACUMULADO`: patrón de separación entre estado estructural estable y estado narrativo por intento; post-docsync source gate. Excluir backend protegido, secretos y datos reales.

`ACADEMIA_ACTUALIZAR`: dos fallos en la misma etapa obligan a detener reintentos; un PASS de validador no es durable si una sincronización posterior puede invalidarlo; los gates deben depender de invariantes contractuales, no de etiquetas narrativas.
