# Gravicentra Insurance — Plan de Trabajo Congelado V2

Fecha de congelación: 2026-09-09
Producto: Gravicentra Insurance
Repositorio: paulaosoriof86/orbit360-core
Rama de autoridad: recovery/fase-a-clean-20260831
Origen forense: 9c95f31461f2eabe9804625b5659bee772f5602a

## 1. Propósito

Este documento congela el plan completo de recuperación, salida a producción y transición a postproducción. No sustituye el Plan Maestro v1.3; lo operacionaliza y corrige el mecanismo de sincronización para impedir que estado, lineage, release identity, QA y conversación vuelvan a divergir.

Ninguna conversación de ChatGPT, PR body, documento histórico, workflow hardcodeado ni snapshot estático puede cambiar este plan o el estado operativo por sí mismo.

## 2. Autoridades separadas por tipo de verdad

1. Normativa evergreen: Addendum Prevalente, Plan Maestro v1.3, Capability Manifest, Anti-Descarrilamiento, matriz de criterios y Addendum Forense. No contienen estado operativo mutable.
2. CONTROL_PLANE.json: única autoridad operativa viva para gate actual, gate cerrado, release identity, producción, datos y siguiente acción.
3. CAPABILITY_LINEAGE_LOCK.json: lock inmutable del resultado I1. Prohíbe volver a buscar la última versión aprobada salvo LINEAGE_EXCEPTION causal y probada.
4. Evidencia de gate: artefactos inmutables de I1, I2, I3, I4A, I4B e I5.
5. Chats y snapshots: contexto/evidencia solamente. Nunca autoridad operativa.

RECOVERY_STATE.json y ACTIVE_RELEASE_LOCK.json quedan deprecados como autoridades independientes. Podrán conservarse temporalmente como compatibilidad, pero no pueden gobernar un workflow una vez activado CONTROL_PLANE.json.

## 3. Regla de reanudación independiente de conversación

Toda reanudación debe:

1. leer normativa evergreen;
2. leer CONTROL_PLANE.json desde la rama de autoridad;
3. validar CAPABILITY_LINEAGE_LOCK.json;
4. verificar HEAD y ausencia de source drift respecto del release certificado;
5. identificar el primer gate incompleto indicado por CONTROL_PLANE;
6. ejecutar únicamente ese gate;
7. no reabrir capacidades PASS sin invalidación causal demostrada.

Si cualquiera de esas comprobaciones falla, la ejecución se detiene antes de Firebase, producción o datos.

## 4. Cadena congelada hacia producción

La secuencia I0–I6 permanece congelada. No se crean iteraciones paralelas por bugs.

### I0 — Freeze / autoridad
Estado esperado: PASS.
Objetivo: autoridad, repo, rama, Firebase, corte de datos y fronteras congeladas.
Avance acumulado hacia producción al cerrar: 14.3%.

### I1 — Latest-approved capability lineage
Estado esperado: PASS 15/15.
Objetivo: fijar para cada capability la última aceptación demostrada, source/blob, owner, dependencias, roles y semántica.
Nuevo control permanente: CAPABILITY_LINEAGE_LOCK. I1 no se reejecuta por defectos ordinarios.
Avance acumulado: 28.6%.

### I2 — Clean source / composición / startup / write contracts
Estado esperado: PASS para la candidata que luego se construirá.
Objetivo: un solo index productivo, sin overlays históricos, contratos read/write, performance/startup, composición y reconciliaciones de lineage.
Si cambia product source después, se requiere nueva certificación I2/I3 de esa candidata, sin reabrir I1 salvo lineage exception.
Avance acumulado: 42.9%.

### Transición G — Gobierno y sincronización I3→I4A
No es una iteración nueva y no altera I0–I6.
Es precondición obligatoria de entrada a I4A.
Objetivos:
- sustituir múltiples autoridades mutables por CONTROL_PLANE único;
- sellar físicamente I3 SUCCESS en la autoridad viva;
- congelar CAPABILITY_LINEAGE_LOCK;
- eliminar hardcodes de source/build/preview de ejecutores;
- eliminar autoparches del QA harness;
- reducir fan-out a un ejecutor por gate;
- convertir el guard en state machine fail-closed;
- marcar snapshots estáticos como históricos/no operativos;
- preparar paquete documental evergreen para las Fuentes del Proyecto ChatGPT.
No suma porcentaje adicional; al cerrarse permite reconocer formalmente I3.

### I3 — Build inmutable + Firebase Hosting Preview + readback exacto
Objetivo: construir una vez desde el source I2 aprobado, empaquetar frontend + backend source, desplegar Hosting Preview aislado, releer bytes y sellar artifact/digests.
Avance acumulado al cerrar formalmente: 57.1%.
Regla: todo source change de producto invalida el artifact y requiere nuevo I2/I3. Los cambios solo de control-plane no alteran el artifact certificado.

### I4A — Prueba individual módulo por módulo en Preview
Objetivo: demostrar LATEST_APPROVED_VERSION_PREVIEW_PASS por capability afectada, con source/blob, roles, ruta, UI, datos, acciones, reload/persistencia, permisos, relaciones, cero 404/page/console errors y responsive.
Preservación: una capability previamente certificada solo se reabre si el diff causal toca su owner/dependencia/contrato o una regresión reproducible la invalida.
Aseguradoras debe demostrar directorio completo y reveal/copy protegido para Dirección, SuperAdmin, AdminTenant/Admin y Operativo; Asesor no recibe acceso completo.
Avance acumulado: 71.4%.

### I4B — Matriz E2E transversal
Objetivo: módulo × rol × viewport × relaciones sobre el mismo release certificado. Probar navegación, scopes, relaciones, hidratación, startup/PWA y regresiones transversales.
Avance acumulado: 85.7%.

### I5 — Promoción del MISMO artifact + LIVE QA
Objetivo: desplegar el mismo artifact/digest de I3 y el backend source package certificado; rehash/readback; prueba LIVE módulo por módulo; writes controlados before/after; integridad, rollback y ausencia de errores.
Solo al cerrar I5 se permite PRODUCTION_ACCEPTED=true.
Avance acumulado: 100%.

### I6 — Refresh agosto y entrada a postproducción
No cuenta dentro del porcentaje de salida a producción porque ocurre después de PRODUCTION_ACCEPTED.
Objetivo: datos 2026-08-01 a 2026-08-31 por fuente con dry-run, diff, deduplicación, autorización, auditoría y rollback.
Después de I6, el mismo CONTROL_PLANE se transforma en control de mantenimiento/postproducción; no se abandona el mecanismo.

## 5. Estado de avance al congelar V2

- I0: PASS.
- I1: PASS 15/15; requiere materialización del Lineage Lock permanente, no repetir investigación.
- I2: evidencia física PASS para la candidata 96f6962b8519a032c2f54b50d2796fa2545de1e4 mediante run 34304799588; el cierre histórico anterior queda superseded para source identity.
- I3: ejecución física SUCCESS run 34307974287, pendiente de sellado de gobierno V2.
- I4A: no debe continuar hasta cerrar Transición G.
- I4B: pendiente.
- I5: pendiente.
- I6: HOLD.

Avance formal previo a sellar Transición G: 42.9%.
Avance físicamente demostrable pendiente de sellado: 57.1%.
Iteraciones congeladas que faltan después de formalizar I3 para llegar a producción: 3 — I4A, I4B e I5.
Bloques de ejecución restantes desde este punto: Transición G + I4A + I4B + I5.

## 6. Release certificado que Transición G debe sellar

Source SHA: 96f6962b8519a032c2f54b50d2796fa2545de1e4
Source tree: 59598a18c6befe13c317cd338754d81457548f76
I3 run: 34307974287
Runner/control commit: 207fa50242b8462ae93cf6234626c383a9fcdd40
Build ID: gi-i3-96f6962b8519-57f234755dc1
Artifact ID: 10087355583
Artifact name: gravicentra-i3-34307974287
Artifact archive digest: sha256:688768297142074ae987305eedf100db802cbbe85c3600db6d2263075e5e1860
Preview channel: gi-i3-34307974287
Preview URL: https://ays-orbit-360-lab--gi-i3-34307974287-598g48lr.web.app
Hosted files: 202
Hosted payload digest: f1b91976a33279a38863f4465fef5d17c122886a21e41c1021e941355afa0ea4
Backend files: 17
Backend source digest: b317ee5d6c7346bdb0abfa6bb71b5f246cd7647ed7272551065c2053f497f805
Bundle files: 221
Bundle digest: 45c6be9a3972f336676deeb71c2d6161998ddd4e3ceda3265c98f46c43525d55
Readback: exact 202/202
Functions deployed in I3: false
Shared backend mutation in I3: false
Production touched: false
Data touched: false
Writes: 0
Data cutoff: 2026-07-31
August: HOLD

## 7. Reglas anti-desincronización obligatorias

- Un único archivo mutable gobierna gate + release identity: CONTROL_PLANE.json.
- Ningún workflow puede hardcodear source SHA, buildId, preview URL o artifact ID.
- Ningún workflow puede derivar autoridad de chats, PR bodies o snapshots.
- El guard debe validar estado, lineage lock, artifact identity y source drift antes de Firebase.
- El QA harness ejecutado debe ser byte-identificable y no puede autoeditarse durante el run.
- Un gate cerrado no se reabre sin INVALIDATION_CAUSAL registrada.
- Un source change posterior al build obliga a nuevo artifact/digest.
- Preview y producción usan el mismo artifact certificado.
- Backend productivo solo se despliega en I5 desde el backend source package certificado.
- Agosto sigue HOLD hasta PRODUCTION_ACCEPTED.
- Si falla sincronización, el resultado es BLOCKED, nunca PASS parcial por interpretación.

## 8. Regla de reporte por iteración

Al cierre de cada bloque se debe reportar siempre:
- gate y estado;
- porcentaje acumulado hacia producción;
- evidencia física nueva;
- qué se preservó sin reabrir;
- defectos abiertos y clase causal;
- siguiente gate único;
- iteraciones restantes hasta producción;
- producción/data/writes;
- release identity exacta.

## 9. Condición de cambio de este plan

Este plan está FROZEN. Solo puede modificarse mediante un addendum explícito de gobierno que explique causa, impacto, evidencia y compatibilidad con las autoridades prevalentes. Un bug ordinario no modifica el plan.
