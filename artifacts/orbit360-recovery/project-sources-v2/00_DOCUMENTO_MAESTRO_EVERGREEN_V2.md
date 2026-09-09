# Documento Maestro Evergreen V2 — Gravicentra Insurance

## Naturaleza
Este documento es normativo y deliberadamente no contiene gate actual, HEAD actual, run actual, buildId actual, Preview URL actual, porcentaje actual ni estados PASS/PENDING mutables. Esos datos viven exclusivamente en GitHub.

## Producto y autoridad
- Marca: Gravicentra Insurance.
- Repositorio: `paulaosoriof86/orbit360-core`.
- Rama de recovery: `recovery/fase-a-clean-20260831`.
- Origen forense: `9c95f31461f2eabe9804625b5659bee772f5602a`.
- `main` no es autoridad de release para este recovery.
- Se usa el mismo Firebase y Hosting Preview/Channel aislado; no se crea otro backend para esta salida.

## Jerarquía de verdad
1. Reglas normativas evergreen de este paquete y las reglas prevalentes que conserva.
2. `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json`: única autoridad operativa mutable para estado de gates, release identity, entorno, producción, datos y siguiente acción.
3. `artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json`: autoridad inmutable de última versión aprobada por capability después del PASS de I1.
4. Evidencias inmutables por gate y por capability en GitHub/Actions.
5. Chats, PR bodies, capturas y documentos históricos: contexto/evidencia, nunca estado operativo.

Si una fuente estática contradice `CONTROL_PLANE.json` en un dato operativo mutable, prevalece `CONTROL_PLANE.json`. Si una conversación contradice evidencia física de GitHub, prevalece GitHub.

## Lineage
I1 se ejecuta para fijar la última versión aprobada de cada capability. Una vez congelado `CAPABILITY_LINEAGE_LOCK.json`, I2–I5 no vuelven a buscar versiones aprobadas. Una falla runtime no reabre lineage por sí sola. Solo una `LINEAGE_EXCEPTION` con evidencia física, motivo causal y capabilities afectadas puede modificar el lock; las no afectadas permanecen ligadas a su evidencia previa.

## Cadena de release congelada
I0 Freeze/autoridad → I1 lineage → I2 clean source/composición/startup/write contracts → I3 build inmutable + Preview + readback → I4A QA individual Preview → I4B E2E transversal → I5 mismo artifact a producción + pruebas LIVE → I6 refresh de agosto y postproducción.

Los bugs no crean iteraciones nuevas. Si cambia product source después de I3, se declara nueva candidata y se repite I2/I3 para esa source; no se parchea un artifact certificado.

## Artifact y backend
- Un solo `index.html` productivo canónico.
- LAB, seeds y auth-LAB quedan fuera del entrypoint/artifact productivo.
- Build una vez. Preview y producción usan los mismos bytes certificados.
- El backend source package forma parte de la identidad del release y se liga por digest al mismo paquete de I3.
- El backend canónico de producción solo se despliega dentro de I5.
- Los recursos Preview, cuando sean indispensables para I4A, deben estar aislados por nombre/región/routing, no ser alcanzables por producción y demostrar cero writes operativos salvo lo explícitamente aprobado.

## Datos
Firestore continúa como fuente operativa y Drive como repositorio documental. Durante I0–I5 el corte es 2026-07-31. Agosto queda bloqueado hasta `PRODUCTION_ACCEPTED=true`. No se reimportan datos para corregir visualización, cache, routing, composición, permisos, validators o defectos de release.

## Aseguradoras
Dirección, SuperAdmin, AdminTenant/Admin y Operativo deben ver y operar el directorio completo conforme a la última versión aprobada, incluidos usuario, revelado/copia segura de contraseña y cuentas. Asesor no obtiene visibilidad completa salvo aprobación posterior demostrada. Ocultar UI no constituye control de seguridad; la autorización debe estar en backend.

## Performance
Login y primer render no esperan service worker ni módulos no esenciales. Ningún timeout de 30/120 segundos forma parte del flujo exitoso normal. Las esperas de QA no redefinen el contrato de performance del producto.

## Prueba obligatoria por capability
Última aceptación; source/blob SHA; owner/dependencias; roles; read/write; buildId; ruta/carga; UI aprobada; datos; acciones; persistencia/recarga cuando aplique; permisos; relaciones; ausencia de 404/console/page errors; responsive aplicable. Los estados finales son `LATEST_APPROVED_VERSION_PREVIEW_PASS` y, en I5, `LATEST_APPROVED_VERSION_LIVE_PASS`.

## Reanudación
Toda sesión nueva debe leer las reglas evergreen, luego consultar físicamente `CONTROL_PLANE.json`, verificar `CAPABILITY_LINEAGE_LOCK.json`, HEAD y source drift, y ejecutar únicamente el gate que el Control Plane autoriza. Nunca se reconstruye el estado desde la conversación.

## Postproducción
Después de I5 el Control Plane no se abandona. Se transforma en control de mantenimiento: producción vigente queda fijada por su release identity; cada cambio futuro declara impacto causal, usa candidata nueva, pasa Preview, retest afectado + smoke transversal, promociona el mismo artifact y verifica LIVE. Esta regla evita volver a una metodología basada en HEAD, conversaciones o archivos sueltos.
