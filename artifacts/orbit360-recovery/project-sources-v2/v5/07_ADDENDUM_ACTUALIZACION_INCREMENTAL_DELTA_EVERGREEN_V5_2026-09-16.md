# Gravicentra Insurance — Addendum Evergreen V5
## Método Permanente de Actualización Incremental de Datos / Delta Operativo

**Estado documental:** STATIC_NORMATIVE_EVERGREEN  
**Naturaleza:** normativa permanente; no contiene estado operativo mutable  
**Proyecto:** Gravicentra Insurance  
**Repo canónico:** `paulaosoriof86/orbit360-core`  
**Rama canónica:** `recovery/fase-a-clean-20260831`  
**Autoridad operativa:** `artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json`  
**Autoridad de lineage:** `artifacts/orbit360-recovery/release-control/CAPABILITY_LINEAGE_LOCK.json`  
**Ledger derivado:** `artifacts/orbit360-recovery/release-control/CAPABILITY_STATUS_LEDGER.json`

> Este documento no informa gate actual, HEAD, run, buildId, artifact, URL, porcentaje ni estado PASS/PENDING. El estado real se obtiene siempre de `CONTROL_PLANE.json`. Este addendum congela el método permanente para actualizar datos operativos después de la salida productiva.

## 1. Prevalencia y alcance

Este Addendum V5 extiende el paquete Evergreen vigente mediante **composición inmutable**.

No reescribe ni invalida el Documento Maestro Evergreen V3, el Addendum de Gobierno V3, la Matriz V3, el Manifiesto V3, el LEEME V3 ni el Addendum Post-Salida I6 Evergreen V4.

**Prevalece únicamente** sobre cualquier regla anterior de postproducción que obligue a:

- detener todo un módulo por una ambigüedad aislada;
- pedir una autorización humana separada para cada apply determinista después de un dry-run ya autorizado por el gate vigente;
- reprocesar registros sin cambio;
- transformar automáticamente una actualización de datos en cambio de código o release;
- exigir candidata, build o deploy cuando no existe defecto causal de producto.

Las reglas de seguridad, roles, lineage, integridad, release, rollback, privacidad, trazabilidad y fail-closed continúan vigentes.

## 2. Principio rector

Gravicentra Insurance ya existe y está operativo. La actualización ordinaria de datos es un proceso incremental, no una reconstrucción.

La secuencia obligatoria y permanente por módulo es:

**FUENTE NUEVA PINNED → ESTADO ACTUAL / READBACK → DIFF DETERMINISTA → APPLY SOLO DEL DELTA → READBACK / INTEGRITY → MINI-FREEZE → SIGUIENTE MÓDULO**

Reglas:

- no reprocesar lo que no cambió;
- no reconstruir módulos para actualizar datos;
- no crear mecanismos paralelos si existe uno aprobado;
- no reimportar todo cuando solo cambió una parte;
- no usar defectos periféricos para paralizar actualizaciones deterministas independientes.

## 3. Tres carriles estrictamente separados

Toda incidencia o tarea se clasifica antes de actuar en uno de estos carriles:

### A. DATA_UPDATE
Cambio de información operativa usando contratos y mecanismos existentes.

### B. CODE_DEFECT
Defecto reproducible del producto que impide leer, escribir, relacionar, proteger o verificar correctamente los datos.

### C. RELEASE_DEPLOY
Cambio de product source que requiere candidata, build, digest, Preview, promoción o rollback conforme al contrato vigente.

Una tarea `DATA_UPDATE` no pasa automáticamente a `CODE_DEFECT` ni a `RELEASE_DEPLOY`.

Solo escala cuando existe evidencia causal de riesgo real de corrupción/pérdida, escritura semánticamente incorrecta, duplicación material, ruptura de relaciones, permisos incorrectos o imposibilidad real de persistir/verificar.

## 4. Clasificación canónica del diff

Cada registro se clasifica únicamente como:

- `SIN_CAMBIO`
- `ACTUALIZAR`
- `AGREGAR`
- `REVISAR_AMBIGÜEDAD`
- `ELIMINAR_DESACTIVAR`, únicamente cuando fuente y contrato vigente lo autoricen expresamente.

### Reglas de escritura

- `SIN_CAMBIO`: cero writes.
- `ACTUALIZAR`: escribir únicamente campos cuyo cambio sea determinista y autorizado.
- `AGREGAR`: crear únicamente cuando la identidad canónica demuestre que no existe registro equivalente.
- `REVISAR_AMBIGÜEDAD`: fail-closed solo sobre ese registro/campo; el resto del lote continúa.
- `ELIMINAR_DESACTIVAR`: nunca inferir por ausencia. Requiere instrucción explícita de fuente/contrato y autorización vigente.

Un valor vacío de la nueva fuente no borra enriquecimiento operativo válido salvo contrato rector explícito.

## 5. Autorización permanente del apply determinista

Cuando `CONTROL_PLANE.json` haya abierto formalmente un gate de actualización de datos y la fuente se encuentre pinned/fingerprintada, la autorización de ese gate habilita:

1. readback/snapshot;
2. dry-run/diff;
3. apply inmediato de `ACTUALIZAR` y `AGREGAR` deterministas;
4. readback e integrity;
5. mini-freeze del módulo.

**No se requiere una segunda autorización por conversación para cada apply determinista.**

Sí requieren HOLD específico:

- ambigüedades materiales no resolubles con contrato vigente;
- deletes/desactivaciones no expresamente autorizados;
- cambios que afecten secretos, permisos o seguridad fuera de la semántica ya aprobada;
- drift de autoridad/lineage/control plane;
- cualquier write cuyo efecto no pueda predecirse y verificarse de forma determinista.

La autorización general de datos no autoriza cambio de código, nueva release, promoción productiva ni modificación silenciosa de contratos.

## 6. Máximo normal de dos ciclos

Por módulo, el objetivo operativo normal es:

**CICLO 1 — DIFF / DRY-RUN**  
Fuente pinned + readback + clasificación + conteos + conflictos.

**CICLO 2 — APPLY + READBACK**  
Delta determinista + receipt de writes + readback + relaciones + mini-freeze.

Solo se permite una vuelta adicional por una discrepancia concreta y demostrada durante el readback.

No convertir actividad en porcentaje. No declarar PASS sin evidencia física.

## 7. Identidad, deduplicación y conservación

Se reutilizan exclusivamente las claves y contratos canónicos ya aprobados.

- nunca crear nuevas claves ad hoc para acelerar una actualización;
- nunca deduplicar solo por nombre cuando existe identificador rector;
- conservar IDs existentes y relaciones válidas;
- preservar historiales, provenance, referencias, documentos y datos no autorizados a ser sustituidos;
- reprocesar la misma fuente debe ser idempotente;
- dos fuentes contradictorias generan `REVISAR_AMBIGÜEDAD`, no overwrite silencioso.

Las reglas específicas vigentes por entidad —Aseguradoras, Clientes, Pólizas, Vehículos/riesgos, Recibos, Cobros, Comisiones y demás capabilities— continúan rigiéndose por los contratos congelados existentes.

## 8. Credenciales y secretos

Las credenciales, contraseñas, tokens y secretos:

- nunca se imprimen;
- nunca se exportan a artifacts de evidencia;
- nunca se registran en logs de diff;
- nunca se incluyen en capturas o receipts.

Su verificación usa referencias, presencia, longitud/marcadores no sensibles, hashes/identificadores seguros cuando el mecanismo vigente lo permita y readback funcional sin exposición.

Un defecto aislado de copy/clipboard no bloquea una actualización de datos si no compromete seguridad, persistencia, integridad o capacidad real de verificación.

## 9. Orden operativo congelado para actualización

Salvo dependencia material registrada en `CONTROL_PLANE.json`, el orden de actualización es:

1. Aseguradoras / Directorio.
2. Clientes.
3. Pólizas.
4. Vehículos y relaciones/riesgos asociados.
5. Recibos / cartera.
6. Cobros.
7. Demás datos Fase A con actualización pendiente.

Leads, Ops u otras capabilities no retrasan Clientes/Pólizas salvo dependencia causal demostrada.

El avance entre módulos se produce por mini-freeze físico, no por continuidad de una conversación.

## 10. Evidencia mínima del mini-freeze

Cada módulo conserva, como mínimo:

- identificador y hash/fingerprint de la fuente;
- mecanismo aprobado utilizado;
- snapshot/readback necesario;
- conteos `SIN_CAMBIO`, `ACTUALIZAR`, `AGREGAR`, `REVISAR_AMBIGÜEDAD`, `ELIMINAR_DESACTIVAR` cuando aplique;
- diff redactado sin secretos;
- receipt de writes;
- conteos before/after relevantes;
- readback de registros nuevos/modificados;
- validación de relaciones y duplicados;
- provenance/actor/proceso/timestamp cuando aplique;
- conflictos aislados y motivo del HOLD;
- rollback/recuperabilidad requerida por el contrato vigente.

No es obligatorio revalidar capabilities no afectadas ni repetir pruebas históricas no invalidadas causalmente.

## 11. Formato ejecutivo estándar

El handoff de cada módulo utiliza:

`MÓDULO:`  
`FUENTE:`  
`ACTUAL:`  
`SIN CAMBIO:`  
`ACTUALIZAR:`  
`AGREGAR:`  
`AMBIGUOS:`  
`WRITES:`  
`READBACK:`  
`ESTADO:`  
`SIGUIENTE ACCIÓN:`

Este formato informa ejecución; no sustituye evidencia ni `CONTROL_PLANE.json`.

## 12. Reanudación sin dependencia del chat

Para continuar en cualquier conversación o sesión:

1. leer las Fuentes Evergreen estáticas vigentes;
2. consultar físicamente `CONTROL_PLANE.json`;
3. consultar `CAPABILITY_LINEAGE_LOCK.json` solo si la identidad/contrato lo requiere;
4. consultar el mini-freeze/evidencia física del último módulo de datos;
5. confirmar fuente pinned/fingerprint y mecanismo aprobado;
6. ejecutar únicamente el primer trabajo material incompleto.

Nunca reconstruir el estado desde conversaciones, resúmenes de chat o memoria.

El chat es interfaz de ejecución; **GitHub + Control Plane + evidencia física son la continuidad real**.

## 13. Regla para Código / Build / Deploy

Una discrepancia de datos no autoriza modificación de producto.

Solo si se demuestra un `CODE_DEFECT` causal:

- se registra la incidencia;
- se corrige dentro del gate vigente conforme a las reglas de no regresión;
- cualquier cambio de product source genera nueva candidata/build/digest según el contrato de release;
- el artifact certificado no se parchea.

Sin cambio causal de source: **no candidata nueva, no rebuild, no redeploy**.

## 14. Fail-closed sin bloqueo global

Fail-closed significa no escribir el registro/campo cuya semántica sea materialmente incierta.

No significa detener:

- los registros deterministas del mismo lote;
- otros módulos sin dependencia material;
- la actualización completa por un defecto periférico independiente.

El HOLD debe ser mínimo, localizado, trazable y reversible.

## 15. Sincronización de Fuentes del Proyecto

Este Addendum V5 debe incorporarse como **nueva fuente evergreen adicional**, conservando intactas las fuentes normativas anteriores que continúan vigentes.

La composición activa debe pinnear por Git blob SHA cada fuente retenida y este V5. No se duplican ni reescriben documentos anteriores únicamente para incorporar este método.

Tras activar V5 y superar el guard de integridad correspondiente:

1. conservar las fuentes Evergreen existentes;
2. agregar este archivo como nueva fuente;
3. actualizar el manifiesto estático activo para incluir su blob SHA;
4. poner `CONTROL_PLANE.projectSources.staticSourceUpdateRequired=false` una vez confirmada la sincronización;
5. no volver a editar Fuentes del Proyecto por cambios operativos normales.

## 16. Regla final congelada

La actualización operativa normal de Gravicentra Insurance se gobierna permanentemente por:

**FUENTE PINNED → READBACK ACTUAL → DIFF DETERMINISTA → APPLY SOLO DELTA → READBACK / INTEGRITY → MINI-FREEZE → SIGUIENTE MÓDULO**

La velocidad proviene de no repetir trabajo ni reprocesar datos; la seguridad proviene de escribir únicamente lo determinista y aislar la incertidumbre material.

Ninguna conversación futura puede sustituir este método por reconstrucción, reimportación total, nueva metodología o release innecesaria sin una nueva verdad normativa permanente formalmente aprobada.