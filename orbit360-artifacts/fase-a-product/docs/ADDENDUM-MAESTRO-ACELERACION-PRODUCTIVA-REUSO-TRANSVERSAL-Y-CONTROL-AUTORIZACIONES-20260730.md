# ADDENDUM MAESTRO — ACELERACIÓN PRODUCTIVA, REUSO TRANSVERSAL Y CONTROL DE AUTORIZACIONES

Fecha: 2026-07-30  
Proyecto: Orbit 360 / A&S  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR rector: #5 draft/open

## 1. Carácter y precedencia

Este addendum nace de la repetición comprobada de recoveries productivos de M6 que, aun preservando datos y rollback seguro, utilizaron producción para descubrir defectos sucesivos del instrumento de validación. Su objetivo es eliminar ese patrón de raíz y proteger la ruta crítica de salida a producción.

Desde su incorporación, esta directiva es vinculante para el trabajo vivo y debe leerse junto con los documentos maestros/addenda anteriores, el estado vivo de PR #5/HEAD y el Plan Maestro. Cuando una instrucción operativa anterior permita una interpretación más lenta o fragmentada, prevalece la regla más restrictiva de aceleración y no repetición contenida aquí, sin rebajar seguridad, integridad ni controles de producción.

## 2. Objetivo rector

La prioridad operativa es cerrar Fase A y alcanzar producción funcional lo antes posible, sin regresiones y sin reconstruir por módulo capacidades transversales ya resueltas.

La ruta crítica vigente es:

`cerrar M6 → Pólizas → Vehículos → Recibos/cartera → Cobros/conciliación → Comisiones/planillas → financiero histórico → Siniestros/Documentos según plan → resto de módulos`.

Todo trabajo que no desbloquee, proteja o reutilice esa ruta debe diferirse salvo obligación crítica demostrada.

## 3. Regla de no repetición productiva

1. Un fallo productivo NO genera automáticamente otro recovery.
2. Si la misma etapa o familia de fallo reaparece, se activa `STOP_RETRY` inmediatamente.
3. Con `STOP_RETRY`:
   - producto queda congelado;
   - no se crea un nuevo request productivo;
   - no se pide nueva autorización;
   - se clasifica causa raíz;
   - se reproduce el fallo fuera de producción cuando sea técnicamente posible;
   - se corrige la capa responsable;
   - se ejecuta prueba estática/sintética del caso reproducido.
4. Producción no se usa como entorno de desarrollo del validator.
5. Solo se reabre riesgo cuando existe causa raíz demostrada y corrección probada fuera de producción.

## 4. Autorizaciones por bloque de riesgo

1. Lectura, auditoría, diagnóstico, documentación, pruebas estáticas, pruebas sintéticas y preparación inerte no requieren autorización humana adicional.
2. Una autorización productiva cubre un único bloque macro previamente definido y un único request inmutable.
3. No se divide un mismo bloque de riesgo en microautorizaciones de preflight, Hosting, browser, integridad o rollback.
4. Una autorización consumida por un deploy real no se reutiliza, pero tampoco se solicita una nueva hasta haber cerrado estáticamente la causa del fallo anterior.
5. No se podrá solicitar autorización con un texto esencialmente equivalente al anterior si no existe evidencia nueva que cambie materialmente el riesgo y demuestre la corrección de causa raíz.

## 5. Presupuesto de iteración

Antes de cada reapertura productiva deben estar cerrados, en una sola preparación:

- contrato/gate canónico;
- validator;
- prueba sintética de la causa previa cuando aplique;
- workflow estable;
- rollback;
- integridad;
- evidencia sanitizada;
- request todavía ausente.

Si el paquete no está completo, producción no se abre.

## 6. Reuso transversal obligatorio

Las capacidades construidas durante Cliente 360/Aseguradoras/M6 no pertenecen exclusivamente a esos módulos. Son infraestructura común y NO deben reconstruirse para Pólizas, Vehículos, Cobros, Siniestros u otros módulos.

Se consideran transversales y reutilizables:

- Auth y membership;
- multirol, rol activo y scopes;
- `Orbit.store` y write guard;
- separación read-only/write;
- manifiesto canónico de colecciones;
- aliases lógico → físico;
- readiness de todas las colecciones activas;
- blocking-gate readiness para overlays/gates diferidos;
- Hosting readiness acotado;
- smoke multirol/multivista;
- diagnóstico sanitizado antes de assertions;
- integridad before/after y digests;
- monitoreo de cero escrituras cuando el bloque sea read-only;
- rollback fail-closed;
- clasificación de causa raíz;
- request inmutable;
- ledger de fixes reusable;
- evidencia y gate único por cierre.

Cada módulo siguiente solo puede agregar aquello que sea genuinamente específico de su dominio/fuente/reglas de negocio.

## 7. Contrato de incorporación de módulos posteriores

Para Pólizas, Vehículos, Cobros, Siniestros y módulos posteriores se seguirá este patrón:

`fuente → esquema/aliases → normalización → dry-run/diff → reglas de dominio → persistencia autorizada → revalidación → smoke usando harness transversal`.

Está prohibido volver a acondicionar desde cero Auth, membership, scopes, readiness, browser harness, integridad, Hosting o rollback salvo regresión demostrada de esa infraestructura común.

## 8. Criterio de alcance mínimo

Antes de iniciar un bloque debe separarse:

- **imprescindible para desbloquear producción**;
- **mejora útil pero diferible**;
- **deuda técnica no bloqueante**;
- **cambio visual/branding no bloqueante**.

Solo la primera categoría puede ampliar la ruta crítica actual. Las demás se registran y se programan en el punto de menor riesgo.

## 9. Rebranding y otros cambios visuales

Las decisiones de marca no deben mezclarse con gates de datos/backend/producción en curso. Se manejarán como bloque aislado inmediatamente antes del lanzamiento público definitivo o en el último punto seguro previo a ese lanzamiento, con inventario de referencias visibles y regresión cero.

La nota de marca vigente se documenta por separado para evitar contaminar el alcance técnico actual.

## 10. Control de cumplimiento

Cada cierre de bloque debe reportar explícitamente:

- avance visible;
- reutilización de infraestructura previa;
- componentes nuevos realmente específicos del dominio;
- número de ejecuciones productivas del bloque;
- si hubo `STOP_RETRY`;
- causa raíz si hubo fallo;
- prueba estática/sintética previa a cualquier reintento;
- estado de datos/rollback;
- siguiente acción exacta sobre la ruta crítica.

Si dos iteraciones consecutivas no producen avance funcional visible o reutilización demostrable, se considera desviación metodológica y se debe detener el flujo para corregir el mecanismo, no seguir agregando parches.

## 11. Aplicación inmediata

Estado al emitir este addendum:

- M6 6.1.14 terminó `ROLLED_BACK_SAFE`;
- causa raíz: `VALIDATOR_STALE / LEGAL_GATE_DEFERRED_RENDER_RACE`;
- 6.1.15 cerró PASS estático con prueba sintética del gate diferido a 520 ms;
- `STOP_RETRY` activo;
- no existe request 6.1.16;
- no se solicita otra autorización productiva en este corte;
- producción permanece fail-closed;
- datos permanecen intactos;
- el siguiente recovery, cuando corresponda, será un único bloque macro preparado completamente antes de reabrir riesgo.

## 12. Clasificación

- metodología reusable: `REPLICABLE_CLAUDE_ACUMULADO`;
- formación/Academia: `ACADEMIA_ACTUALIZAR`;
- infraestructura y seguridad: `BACKEND_PROTEGIDO_NO_CLAUDE`;
- datos/tenant reales: `TENANT_AYS_ONLY` / `SECRETO_DATO_REAL` según aplique.
