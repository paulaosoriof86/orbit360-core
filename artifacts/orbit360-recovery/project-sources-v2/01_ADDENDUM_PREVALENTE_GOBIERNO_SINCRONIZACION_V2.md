# Addendum Prevalente de Gobierno, Sincronización y Continuidad V2

## Prevalencia
Este addendum prevalece sobre cualquier instrucción histórica o snapshot que trate como autoridad operativa un gate, HEAD, candidate SHA, buildId, Preview URL, porcentaje o estado capturado en una fecha concreta. No deroga los contratos funcionales, de seguridad, datos, QA y release del Addendum Prevalente original, Plan Maestro v1.3, capability manifest, Anti-Descarrilamiento, matriz ni Addendum Forense; elimina únicamente su uso como reloj operativo cuando contienen snapshots.

## Causa raíz corregida
La desincronización se produjo porque estado de gate y release identity podían duplicarse en documentos, JSON independientes, workflows hardcodeados y conversaciones. La corrección estructural es abolir esa duplicidad.

## Autoridad única mutable
`artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json` es la única autoridad mutable. Debe contener en una sola transacción lógica:
- estado y secuencia de gate;
- candidata/release certificado;
- source/tree;
- artifact/build/digests/Preview cuando existen;
- estado de producción/datos;
- siguiente acción;
- flags de invariantes del mecanismo.

`RECOVERY_STATE.json` y `ACTIVE_RELEASE_LOCK.json` son tombstones deprecados. Ningún workflow puede leerlos como autoridad. El guard histórico `gravicentra-release-lineage-guard.mjs` debe permanecer fail-closed.

## Autoridad de lineage
`CAPABILITY_LINEAGE_LOCK.json` congela el cierre I1. Está prohibido repetir búsquedas de última versión aprobada sin una `LINEAGE_EXCEPTION` causal, físicamente demostrada y limitada a capabilities afectadas.

## Ejecutores
- Un gate tiene un executor autoritativo.
- I2, I3 e I4A son state-gated por `gravicentra-control-plane-guard-v2.mjs`.
- Los executors de gates de release no se disparan por cambios documentales o de control-plane.
- Ningún executor puede hardcodear release identity.
- Workflows históricos/causal-fix retirados no se restauran por bugs ordinarios.
- El guard central puede observar tombstones en `paths` para detectar reactivación; observar no significa consumir autoridad.

## QA reproducible
El harness efectivo debe existir como bytes versionados en GitHub y registrar su blob SHA. Está prohibido reescribirlo dentro del runner antes de una prueba. Si el QA harness cambia, la nueva evidencia debe declarar su identidad; una corrección de validator no implica cambio de product source salvo causalidad demostrada.

## Ciclo de una nueva candidata
Si aparece un defecto real de producto después de I3:
1. se clasifica y se determina impacto causal;
2. se crea el cambio de product source dentro de la misma rama de recovery;
3. `CONTROL_PLANE` entra en `I2_IN_PROGRESS` y registra `nextCandidate.sourceSha` + `sourceTree` exactos;
4. I2 solo puede ejecutar esa candidata;
5. I3 solo puede construir desde el source I2 aprobado;
6. nace artifact/digest nuevo;
7. se invalidan solo las evidencias causalmente afectadas más las regresiones transversales que correspondan;
8. nunca se parchea un artifact certificado.

La existencia temporal de un product commit no registrado no autoriza ningún gate: I3/I4A/I4B/I5 deben fallar por drift hasta que el Control Plane abra correctamente I2.

## Transición de gate
Un run exitoso no actualiza por sí solo la autoridad. El gate se considera formalmente cerrado únicamente cuando:
- existe evidencia física SUCCESS aplicable;
- sus identificadores exactos coinciden con Control Plane;
- los invariants del mecanismo pasan;
- el Control Plane se actualiza al siguiente estado;
- el guard central vuelve a pasar sobre esa actualización.

## Producción
I5 promueve los mismos bytes frontend y el backend source package certificado. Deploy exitoso no equivale a `PRODUCTION_ACCEPTED`. Antes de aceptar producción se ejecutan pruebas LIVE por capability, roles, navegación, relaciones, persistencia/recarga, writes controlados con before/after, integridad y rollback.

## Postproducción
La misma arquitectura continúa después del recovery. La release productiva aceptada queda registrada en Control Plane. Un cambio futuro se modela como candidata separada; nunca se toma HEAD como equivalente a producción y nunca se deduce estado desde una conversación.

## Fail-closed
Cualquier diferencia entre Control Plane, Lineage Lock, source/tree, artifact/digests, Preview marker, harness identity o gate esperado bloquea la ejecución antes de la siguiente mutación. El objetivo no es prometer ausencia absoluta de defectos, sino impedir que una desincronización avance silenciosamente o sea declarada PASS.
