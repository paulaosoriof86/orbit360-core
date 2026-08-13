# AUDITORÍA FORENSE ANTI-BUCLE V28–V37 — CAUSA RAÍZ Y RUTA A PRODUCCIÓN

Fecha: 2026-08-10
Rama: `ays/backend-tenant-lab-v99-20260703`
PR rector: #5 draft/open
Gate rector: `block1-client360-insurers-lab-v20260717`
Contrato vivo observado: `1.0.41`
Alcance: source-only / read-only de repositorio y evidencia existente. Sin secretos, Firebase, Firestore, Auth, Logging entries, IAM writes, Hosting, browser, deploy, producción, main o merge.

## 1. Veredicto ejecutivo

No debe abrirse v38 ni solicitarse otra autorización operativa en este punto.

La secuencia v28–v37 demuestra cinco cadenas causales diferentes que se fueron resolviendo como incidentes sucesivos, cuando debieron converger antes en una sola arquitectura de control:

1. **Bloqueo de negocio/datos:** dos clientes post-cierre siguen sin procedencia demostrable. Este es el bloqueo que impide el universe gate final del Block 1.
2. **Brecha de observabilidad/administración IAM:** la cuenta técnica LAB no tiene capacidades de Logging/IAM suficientes; v37 demostró que existe un único candidato administrativo directo `USER / roles/owner` sin persistir su identidad real.
3. **Deriva del control-plane:** el registry canónico principal permanece en `contractVersion 1.0.25` mientras el entrypoint y los cierres vivos operan en `1.0.41`, apoyados por múltiples registry extensions y perfiles generacionales.
4. **Deriva documental:** README y cuerpo histórico del PR describen rutas ya superadas —por ejemplo ejecutor local Windows/matriz visual— y no reflejan la cadena v28–v37 ni el bloqueo actual.
5. **Fragmentación de ejecución/autorizaciones:** el trabajo IAM se convirtió en una escalera de generaciones v34→v37. Cada runtime posterior añadió evidencia material, pero el mapa de capacidades y la estrategia de resolución no quedaron preparados en un único paquete source-only antes de reabrir riesgo.

La causa raíz estructural coincide con el Plan Maestro: Orbit 360 tiene componentes implementados en varias capas, pero la ruta productiva y su control-plane todavía no están completamente consolidados como una sola arquitectura durable. La proliferación de overlays, perfiles y extensiones es un síntoma de esa integración incompleta.

## 2. Cadena causal A — los 2 clientes son el bloqueo real de Block 1

Hechos cerrados:

- v28: los 16 clientes post-cierre carecían de procedencia documental suficiente en el propio registro.
- v29: los 16 no coincidían con baseline 414 ni seed/demo actual.
- v32: 14/16 quedaron vinculados privacy-preserving con las 26 filas retenidas originales:
  - 8 exactos;
  - 6 probables;
  - 2 `ORIGEN_NO_DEMOSTRABLE`.
- El universe gate no se ejecutó porque la regla exigía adjudicación objetiva 16/16.

Clasificación gobernante:

`DATA_CONTRACT_FAILURE / TWO_POST_CLOSURE_CLIENTS_NOT_PRESENT_IN_BASELINE_DEMO_OR_AUTHORIZED_RETAINED26_AND_NO_EXTERNAL_AUDIT_AVAILABLE`

Conclusión:

El producto no debe seguir modificándose para resolver este punto. La única evidencia materialmente nueva aceptable es procedencia externa/autoritativa o una decisión de datos humana y controlada si esa procedencia no existe.

## 3. Cadena causal B — IAM/Logging no era un defecto de Cliente 360

Secuencia:

- v33: auditoría externa no disponible/permitida.
- v34: cuenta LAB sin `logging.logEntries.list` / `logging.privateLogEntries.list`.
- v35: cuenta LAB tampoco puede administrar IAM de la Log View objetivo.
- v36: cuenta LAB puede leer jerarquía, pero no Policy Analyzer.
- v37: lectura directa de project IAM policy PASS; se identifica exactamente un candidato administrativo directo, `USER / roles/owner`, fingerprint sanitizado `c8c3e8ab1b4acf50a47c`.

Conclusión:

La arquitectura correcta separa:

- principal técnico LAB;
- principal administrador IAM;
- permisos temporales de observabilidad.

Intentar autoelevar la cuenta LAB era el mecanismo equivocado y no debe repetirse.

## 4. Cadena causal C — deriva del gate/registry

El Addendum de Control de Causa Raíz exige actualización atómica de owner, registry, preflight, workflow, documentación, Claude y Academia.

Estado observado:

- `tools/orbit360-gate-contract-registry-v20260717.json` mantiene el Block 1 en `contractVersion: 1.0.25` y `ACTIVE_FUNCTIONAL_FIX`.
- `tools/orbit360-validar-gate-contracts-v20260717.mjs` opera el Block 1 con `contractVersion: 1.0.41` y contiene perfiles hardcodeados por generación v28, v29, v30, v33 y runtime v33, además de legacy routing.
- v34–v37 se cerraron mediante lifecycle/engines/workflows/registry extensions separados.

Clasificación:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`

Causa raíz:

**Se perdió la atomicidad del contrato canónico.** El registry principal dejó de ser la única fuente ejecutable de verdad y el entrypoint pasó a conocer generaciones específicas directamente.

Impacto:

- mayor probabilidad de self-match y validadores obsoletos;
- necesidad de sincronizar varias representaciones del mismo gate;
- más commits source-only para cada generación;
- más superficie para fallos de transporte/pipeline;
- riesgo de que una conversación futura tome un documento antiguo como ruta vigente.

## 5. Cadena causal D — deriva documental

README vigente todavía declara como ruta inmediata:

`orbit360-launch-local-windows-source-only-v20260806.cmd`

seguido de recuperación Hosting + matriz visual.

Esa ruta corresponde a la auditoría del 2026-08-06 y ya no representa el estado posterior a v28–v37.

El cuerpo histórico del PR #5 también conserva referencias de HEAD y estados anteriores que no reflejan el cierre actual.

Clasificación:

`VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE` en su dimensión de gobierno documental.

La documentación viva debe dejar de ser histórica y convertirse nuevamente en índice del estado real.

## 6. Cadena causal E — reprocesos evitables y no evitables

### Reprocesos claramente evitables

- v30/v31: validadores sintácticos confundieron sentinels y APIs homónimas con secretos/writes reales.
- v37 source run inicial: `ReferenceError: R is not defined` por variable Bash no exportada al heredoc Node.
- múltiples sincronizaciones de registry extension/lifecycle que deberían derivarse de un contrato canónico único.

### Iteraciones que sí agregaron evidencia nueva

- v33→v34: distinguió ausencia de auditoría de falta efectiva de permisos Logging.
- v34→v35: distinguió lectura Logging de capacidad de administrar IAM de Log View.
- v35→v36: probó que la cuenta tampoco tenía Policy Analyzer.
- v36→v37: cambió materialmente el mecanismo y logró identificar owner mediante project IAM policy directa.

Estas últimas no fueron reintentos idénticos, pero pudieron haberse reducido preparando antes una **matriz source-only completa de capacidades requeridas y mecanismos alternativos** en lugar de descubrirlas una por una en runtime.

## 7. Incumplimiento metodológico acumulado

El Addendum de Aceleración establece:

- auditoría/diagnóstico/source-only no requieren autorización adicional;
- una autorización cubre un bloque macro de riesgo;
- no se divide un mismo bloque en microautorizaciones;
- dos iteraciones sin avance visible obligan a detener y corregir el mecanismo.

La cadena reciente cruzó ese umbral. Por tanto se activa ahora formalmente:

`STOP_RETRY_CONTROL_PLANE`

No significa que el producto esté roto. Significa que no se abre otro runtime hasta consolidar el mecanismo de control.

## 8. Qué NO se reabre

Permanecen cerrados y no se reconstruyen:

- Auth/membership/multirol/scopes salvo regresión demostrada;
- Pólizas write PASS histórico;
- Vehículos write PASS histórico;
- Recibos/cartera write PASS histórico;
- v32 reconciliación baseline/demo/retained26;
- v34–v37 diagnósticos IAM ya consumidos;
- Cliente 360/Aseguradoras no se corrigen para satisfacer gates obsoletos;
- Clientes/Aseguradoras no se reimportan.

## 9. Próximo paso correcto — MACROBLOQUE SOURCE-ONLY DE CONVERGENCIA

Antes de cualquier nuevo runtime se debe ejecutar un solo macrobloque sin secretos ni APIs externas:

### 9.1 Canonicalizar el control-plane

1. Promover `1.0.41` al registry canónico principal del Block 1.
2. Convertir v28–v37 en evidencia/histórico, no en rutas paralelas activas.
3. Eliminar del entrypoint canónico el conocimiento hardcodeado de generaciones cerradas y hacer que derive gate/lifecycle/engine desde un registro único versionado.
4. Mantener un único gateId de Block 1; no crear gates paralelos.
5. Añadir fixture que falle si registry, lifecycle, entrypoint y documentación discrepan en contractVersion/estado/nextAction.

### 9.2 Sincronizar estado vivo

Actualizar:

- README;
- índice/fuente operativa vigente;
- estado vivo del PR;
- plan/bitácora si corresponde;
- Claude/Academia.

Estado que debe quedar inequívoco:

- Block 1 activo;
- contrato 1.0.41;
- 14/16 adjudicados, 2 sin origen demostrable;
- v37 owner candidato identificado;
- universe gate pendiente;
- visual pendiente del universe PASS;
- ningún runtime nuevo autorizado.

### 9.3 Preparar una sola decisión de cierre de los 2 clientes

Después de que el control-plane source-only quede PASS, elegir una sola ruta:

**Ruta A — evidencia externa:** un único bloque owner-controlled, con autoridad real del owner, que cubra capacidad → grant mínimo temporal a Log View → auditoría acotada de los 2 fingerprints → revoke obligatorio → adjudicación → universe gate read-only si 16/16 queda resuelto.

**Ruta B — pérdida estructural de trazabilidad:** si no existe mecanismo seguro/viable para obtener la evidencia, registrar decisión humana/controlada sobre esos 2 registros antes del universe gate. No inferir, borrar, fusionar ni reimportar automáticamente.

No se debe continuar alternando A/B en pequeños experimentos.

## 10. Orden hacia producción tras convergencia

1. `PASS_CONTROL_PLANE_CONVERGENCE_SOURCE_ONLY`.
2. Una sola resolución de los 2 clientes: Ruta A o Ruta B.
3. Universe gate 414/26/7 o universo distinto únicamente si queda demostrado.
4. Una sola matriz visual post-Auth si universe PASS.
5. Cierre de Block 1.
6. Continuar la ruta productiva ya construida sin reabrir Pólizas/Vehículos/Recibos cerrados.
7. Release candidate y go-live controlado según Plan Maestro.

## 11. Estado de carriles

A — frontend/UX: congelado; no requiere corrección en esta auditoría.

B — backend/seguridad/control-plane: `STOP_RETRY_CONTROL_PLANE`; requiere convergencia source-only del registry/router/docs.

C — datos/migración: 14/16 adjudicados; 2 pendientes; no tocar datos durante la convergencia.

## 12. Decisión final

**NO abrir v38 runtime.**

La siguiente acción exacta es corregir la arquitectura del control-plane y su estado documental en source-only, con un único gate rector. Solo después se prepara un único macrobloque de resolución de los 2 clientes.
