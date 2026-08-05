# CIERRE — BLOQUE 3.0 · OPS/LEADS DURABLE

Fecha local: 2026-08-05 06:49 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Gate: `OPS_LEADS_BACKEND_LAB_COMPLETE`  
Estado: `PASS_REUSED_FUNCTIONAL_RUNTIME_AND_CURRENT_DEPLOY`

## Decisión

El bloque se cierra sin otra ejecución. La evidencia funcional existente sigue siendo válida y el despliegue vigente contiene exactamente los mismos owners de Ops/Leads.

## Evidencia reutilizada

```text
run funcional: 30962756387
resultado: 18/18 PASS
Ops/Leads: PASS
scope propio del asesor: PASS
notificaciones: PASS
rollback exacto: sí
tenant real sin cambios: sí
```

El despliegue actual comprobó:

```text
run: 31005103975
Functions allowlisted: 4/4
Hosting preview: retenido
integridad: PASS
snapshots before/after: idénticos
Firestore writes: 0
Auth writes: 0
```

## Provenance

Se comparó:

```text
base funcional: 76377a4a95d9a834ac114e0654660a03c5f5046c
deployed source HEAD: 24b341483b6853269a125c60796f7b33edbfbb61
```

No cambió ningún owner de Ops/Leads entre ambos cortes. Los cambios fueron de control plane, evidencia y captura visual; por tanto, repetir los 18 escenarios no aporta evidencia nueva y está prohibido.

## Arquitectura durable verificada

Backend:

- `functions/ops-leads-domain.js`: transacciones, idempotencia, eventos, outbox, notificación Portal, roles y scopes;
- `functions/ops-advisor-inbox.js`: inbox por tenant y alcance propios/equipo/todos/ninguno;
- `functions/bootstrap.js`: exporta ambos servicios;
- Functions LAB activas:
  - `orbit360OpsLeadsCommandLabV20260804`;
  - `orbit360GetAdvisorOpsInboxLabV20260804`.

Frontend:

- `core/ops-leads-domain-client.js`: cliente callable genérico;
- `modules/ops-leads-domain-v20260804-bridge.js`: sincroniza cambios del store y proyecta gestiones del asesor;
- `core/backend-lab-init.js`: carga ambos dinámicamente, activa el feature flag y resuelve nombres de Functions;
- `core/ciclo.js`, `modules/ops.js` y `modules/leads.js`: owners visuales y de interacción.

No existe hardcode de personas, correos, roles individuales ni datos A&S en el dominio genérico.

## Revisión visual

La URL continúa disponible:

```text
https://ays-orbit-360-lab--orbit360-operational-block12-w8ibrr6w.web.app
```

Paula puede aceptar `Acuerdos legales` una vez y revisar. Esta aprobación visual permanece pendiente, pero no bloquea la continuidad técnica.

## Carriles

### A — Frontend / UX / Academia

- Ops y Leads conservan una entidad compartida y proyecciones por etapa.
- Asesor ve su operación y gestiones dentro de su scope.
- Revisión visual humana pendiente, no bloqueante.

### B — Backend / seguridad

- Dominio durable, transaccional e idempotente activo en LAB.
- Membership, rol activo y scopes aplicados.
- Outbox y trazabilidad disponibles.

### C — Datos reales

- No se escribieron, reimportaron ni alteraron datos A&S en este cierre.

## STOP_RETRY / prohibiciones

```text
nuevo runtime Ops/Leads: no
repetición 18/18: no
redeploy Functions: no
redeploy Hosting: no
nuevo workflow visual: no
usuarios/memberships sintéticos: no
Rules/reimportación/producción/main/merge: no
```

## Impacto Claude / Academia

- Claude: conservar el patrón de una entidad con proyecciones Leads/Ops, scopes honestos y gestiones del asesor; no replicar Functions ni backend protegido.
- Academia: explicar diferencia entre ciclo comercial, gestión operativa, inbox del asesor, outbox y aprobación visual.

## Siguiente acción exacta

```text
BLOQUE 4.0
PASS_COBROS_FULL_REPLAY
READ_ONLY
```

Completar el replay de los 365 pagos reportados reutilizando fuentes privadas vigentes, los 128 casos inferidos, los 2 posteriores al corte, los 235 pendientes de overlay y los 5 cobros ya materializados, sin duplicar, escribir, reimportar ni desplegar.
