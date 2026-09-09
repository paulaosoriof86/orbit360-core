# LEEME — Reanudación y autoridad V3

## En cualquier conversación nueva

No reconstruyas el estado desde el chat anterior.

1. Lee `00_DOCUMENTO_MAESTRO_EVERGREEN_V3`.
2. Lee `01_ADDENDUM_GOBIERNO_SINCRONIZACION_Y_NOTIFICACION_V3`.
3. Lee `02_MATRIZ_CRITERIOS_FASE_A_EVERGREEN_V3`.
4. Lee `03_MANIFIESTO_CAPACIDADES_FASE_A_EVERGREEN_V3`.
5. Consulta físicamente en GitHub `CONTROL_PLANE.json`.
6. Consulta `CAPABILITY_LINEAGE_LOCK.json`.
7. Consulta `CAPABILITY_STATUS_LEDGER.json`.
8. Verifica HEAD y ejecuta el guard central.
9. Ejecuta únicamente el gate autorizado por Control Plane.
10. Conserva evidencia PASS no invalidada causalmente.

## Nunca usar como estado vigente

- conversaciones de ChatGPT;
- PR bodies;
- `main`;
- `RECOVERY_STATE.json`;
- `ACTIVE_RELEASE_LOCK.json`;
- estados escritos en documentos históricos;
- secciones históricas 5–6 de `PLAN_TRABAJO_CONGELADO_V2.md`;
- un HEAD reciente como sustituto de release certificada;
- un workflow retirado;
- las Fuentes del Proyecto ChatGPT.

## Para responder “dónde vamos”

Lee `CONTROL_PLANE.json` y reporta:

- gate/transition actual;
- último gate formal PASS;
- release identity;
- producción/datos/writes;
- porcentaje calculado con el método congelado;
- siguiente acción.

Después usa `CAPABILITY_STATUS_LEDGER.json` para el detalle por capability.

## Para responder “cuál es la última versión aprobada”

Lee `CAPABILITY_LINEAGE_LOCK.json` y la evidencia I1 que referencia.

No vuelvas a investigar versiones históricas salvo `LINEAGE_EXCEPTION`.

## Para saber si las Fuentes del Proyecto deben cambiar

Lee:

`CONTROL_PLANE.projectSources.staticSourceUpdateRequired`

- `false`: no reemplazar fuentes por cambios operativos.
- `true`: notificar a Paula y generar paquete evergreen de versión superior antes de pedirle cambios.

## Gate de cierre

Un run verde por sí solo no cierra un gate. Deben coincidir evidencia, release identity, invariants, actualización del Control Plane y guard posterior.
