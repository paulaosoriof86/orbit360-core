# LEEME — Reanudación y autoridad V2

## Para cualquier conversación nueva
No reconstruyas el estado desde el chat anterior.

1. Lee este paquete evergreen y las reglas prevalentes del recovery.
2. Consulta físicamente en GitHub `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json` sobre `recovery/fase-a-clean-20260831`.
3. Consulta `CAPABILITY_LINEAGE_LOCK.json` y verifica que siga `FROZEN` y ligado al cierre I1.
4. Verifica HEAD y ejecuta el control-plane/mechanism guard antes de cualquier acción de gate.
5. Ejecuta únicamente el gate que `CONTROL_PLANE.json` autoriza.
6. Conserva evidencia PASS no invalidada causalmente.
7. Si hay product source drift, no retargetees I3/I4A: abre I2 mediante `nextCandidate` exacta y vuelve a I2→I3.
8. No toques producción antes de I5 ni agosto antes de `PRODUCTION_ACCEPTED=true`.

## Nunca usar como estado vigente
- conversaciones de ChatGPT;
- PR bodies;
- `main`;
- `RECOVERY_STATE.json` deprecado;
- `ACTIVE_RELEASE_LOCK.json` deprecado;
- estados PENDING/PASS escritos en documentos históricos;
- un HEAD reciente como sustituto de una candidata certificada;
- un workflow histórico retirado.

## Cómo responder “dónde vamos”
Lee `CONTROL_PLANE.json` y reporta:
- gate/transition actual;
- último gate formal PASS;
- release identity certificada;
- producción/datos/writes;
- porcentaje según `PLAN_TRABAJO_CONGELADO_V2.md`;
- siguiente acción exacta.

No infieras esos datos de memoria.

## Cómo responder “cuál es la última versión aprobada”
Lee `CAPABILITY_LINEAGE_LOCK.json` y la evidencia I1 que referencia. No vuelvas a buscar versiones históricas salvo `LINEAGE_EXCEPTION` físicamente demostrada.

## Regla de cierre
Un run verde por sí solo no equivale a cierre. El Control Plane debe registrar el cierre y el guard central debe pasar después de esa transición.
