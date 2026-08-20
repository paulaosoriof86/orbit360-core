# CHECKPOINT — F2 Request11 consumido · VALIDATOR_STALE confirmado · rootfix reusable bajo controles source-only

Fecha canónica: 2026-08-20 UTC.

## Autoridad y frontera
- Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`.
- PR #5: draft/open; sin merge, main, deploy, publicación ni producción.
- F1: `CLOSED_PASS`.
- F2 SOURCE: `CLOSED_PASS`.
- Candidata exacta y congelada: artifact `9387820198`, source `fc46bd85783d8b4d524cbeb0fee54ee9a2c774af`, 194 archivos.
- ZIP SHA256: `58fcbe6e8d7d3a425509c87f229b1cb12dd35a99133d46c757544cc75c55aacc`.
- Manifest SHA256: `b18422fdf82830d28e82f657f83b4fd5c10ea134a4735263fa2587a2ddd808cb`.

## Request11 — ejecución real y terminal
- Request commit: `1809552cc6dceacae1527be34299ef17b32bff98`.
- Run: `32330791880`.
- Job: `96310876042`.
- Attempt: `1`.
- Conclusión GitHub: `failure`.
- Dispatch: único y confirmado (`uniquenessCount=1`).
- Request11 replay/rerun: **prohibido**.

### Etapa exacta del fallo
Falló el paso 4 `Verify immutable F2 request and source boundary`.

Pasos posteriores quedaron `skipped`: registro runtime lifecycle, gate canónico, artifact, dependencias runtime, provider, identidad, snapshot before, servidor loopback, browser, snapshot after y comparación.

Por tanto en Request11:
- browser ejecutado: no;
- runtime producto ejecutado: no;
- secrets accedidos: no;
- Firestore leído: no;
- Firestore/Auth/membership/data/operational writes: 0;
- deploy/publicación/producción: 0.

## Causa raíz confirmada
El log del run produjo exactamente:

`VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_MISSING`

La auditoría del runner demuestra que el binding cross-tenant real sí existe y es semánticamente correcto:
1. importa `PROBE_DOCUMENT_PATH` y `validateProbeDocumentPath`;
2. valida `validateProbeDocumentPath(PROBE_DOCUMENT_PATH)`;
3. pasa `PROBE_DOCUMENT_PATH` como argumento real a `page.evaluate(async deniedPath => ...)`;
4. construye `ctx.modules.store.doc(ctx.db, deniedPath)`;
5. conserva `crossTenantDeniedObserved=crossTenantDenied`;
6. exige `SECURITY_FAILURE:F2_CROSS_TENANT_READ_NOT_DENIED` si la lectura no es denegada.

El self-test anterior buscaba el literal contiguo `},PROBE_DOCUMENT_PATH);need(crossTenantDenied`, pero entre ambas expresiones existe ahora la asignación de observabilidad `crossTenantDeniedObserved=crossTenantDenied`. El comportamiento de seguridad no desapareció; el validador literal quedó obsoleto.

**Clasificación canónica:**

`VALIDATOR_STALE:F2_FULL_RUNTIME_PROBE_PATH_BINDING_LITERAL_ADJACENCY_STALE`

No existe evidencia que justifique modificar Pólizas, Cliente 360, el producto, la candidata o los datos.

## Defecto secundario de pipeline
Tras el fallo pre-gate, el paso de evidencia terminal intentó usar `ORBIT360_REQUEST_FILE` antes de que hubiera sido exportada por el paso abortado y produjo `unbound variable`. Esto no causó el fallo primario, pero impidió que el workflow produjera artifact terminal útil.

Clasificación secundaria: `PIPELINE_MECHANISM_FAILURE — EARLY_FAILURE_EVIDENCE_DEPENDS_ON_LATE_ENV_EXPORT`.

## Rootfix implementado
- Self-test semántico/dinámico: commit `e6d3704e21bdc63b812832e6d012fd9d33b7f9bb`.
  - reemplaza adyacencia literal por validación semántica del probe;
  - conserva validación explícita de observación y denial assertion;
  - deja ordinal de request dinámico.
- Gate de autorización persistida reusable: commit `8d41a17bfc325b9f2f35293a551963ba63445808`.
  - elimina hardcode Request11;
  - valida ordinal dinámico >=11;
  - valida path dinámico de autorización, SHA256, candidata, scope y base de autorización;
  - mantiene writes/deploy/publicación/producción bloqueados.
- Request11 sellado `CONSUMED_FAIL_VALIDATOR_STALE`, cero ejecuciones restantes: commit `22ee6779d5f5e40eabdf23c74d0fadd8b42f1e14`.
- Autorización Request11 sellada consumida/no replayable: commit `ef8ab1c460965e283efd7925746cab2788e5b7be`.
- Validador preventivo source-only `preflight + coherence + synthetic`: commit `48528819cfe67d9d93e201c3fd77af673d48c826`.

## Control preventivo antes de cualquier sucesor runtime
No crear ni ejecutar Request12 real hasta que la evidencia source-only demuestre simultáneamente:
- `preflight=true`;
- `coherence=true`;
- `synthetic=true`.

El synthetic Request12 existe solo en el working tree efímero del runner, no es un request ejecutable en GitHub y no accede a browser, secrets, Firebase/Firestore ni datos.

## Regla de no regresión
- No reejecutar Request11.
- No pedir nuevamente autorización para Request11.
- No tocar Pólizas ni producto por este incidente.
- No asumir PASS de rootfix sin evidencia persistida.
- Si un sucesor real se autoriza, deberá usar registro persistido propio + digest propio y el gate dinámico reusable.

## Carriles
- A — producto/UX: `FROZEN_CANDIDATE_9387820198_UNTOUCHED`.
- B — backend/security/gates: `REQUEST11_CONSUMED_VALIDATOR_STALE_ROOTFIX_SOURCEONLY_CONTROLS_PENDING_TERMINAL_EVIDENCE`.
- C — datos A&S: `UNTOUCHED_ZERO_CHANGES`.

## Siguiente acción exacta
Leer la evidencia `f2-request11-validator-stale-rootfix-sourceonly-v20260820.json`. Solo si `preflight + coherence + synthetic = PASS`, abrir la frontera de un sucesor runtime de ejecución única; no antes.
