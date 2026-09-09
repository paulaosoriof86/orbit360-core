# Addendum Prevalente de Gobierno, Sincronización y Notificación V3

## 1. Prevalencia

Este addendum gobierna la sincronización entre GitHub, workflows, evidencias, estado por capability y Fuentes del Proyecto ChatGPT.

Prevalece sobre cualquier snapshot que intente usar como autoridad un gate, HEAD, run, buildId, Preview URL, porcentaje o estado capturado en una fecha concreta. No deroga contratos funcionales, de seguridad, datos, QA o release consolidados en el Documento Maestro Evergreen V3.

## 2. Una sola autoridad mutable de release

`artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json` es la única autoridad mutable para:

- gate/transition actual;
- gates formalmente cerrados;
- release/candidate identity;
- source/tree;
- build/artifact/digests/Preview;
- producción/datos/writes;
- siguiente acción;
- autorización de remediaciones;
- indicador de necesidad de reemplazar Fuentes del Proyecto.

Ningún workflow, documento o conversación puede duplicar esos valores como autoridad.

## 3. Autoridades subordinadas sin duplicar poder

### CAPABILITY_LINEAGE_LOCK
Es inmutable tras I1 PASS. Solo cambia mediante `LINEAGE_EXCEPTION` causal y físicamente demostrada.

### CAPABILITY_STATUS_LEDGER
Es un ledger operativo **derivado** para las 15 capabilities. Puede registrar Preview/Live/evidencia por capability, pero:

- no gobierna gate;
- no gobierna release identity;
- debe declarar binding exacto al release certificado;
- el guard central debe bloquear cualquier mismatch con Control Plane/Lineage Lock;
- `EVIDENCE_IMPORT_PENDING_NO_REOPEN` no significa FAIL ni reabre trabajo: significa que el ledger aún debe importar evidencia acreditable existente.

## 4. Plan congelado y snapshot histórico

`PLAN_TRABAJO_CONGELADO_V2.md` conserva la estructura congelada de I0–I6.

Las secciones que describen “estado al congelar V2” o un release concreto son **evidencia histórica de congelamiento**, no estado operativo. Su addendum evergreen en `release-control` lo declara expresamente y Control Plane prevalece.

## 5. Ejecutores y hardcodes

- Un gate tiene un executor autoritativo.
- I2, I3, I4A, I4B e I5 deben estar state-gated.
- Ningún executor hardcodea source SHA, buildId, Preview URL o artifact ID.
- Workflows retirados no se restauran por bugs ordinarios.
- Los executors no se disparan por cambios documentales del paquete evergreen.
- El guard central sí observa los archivos de gobierno necesarios para bloquear regresiones.

## 6. QA reproducible

- Harness y adjudicadores se versionan en GitHub.
- Cada evidencia registra blob SHA.
- Está prohibido reescribir el harness dentro del runner antes de la prueba.
- Un cambio de validator/QA no altera product source si no existe diff causal de producto.
- Cualquier evidencia PASS queda ligada a release identity y harness identity.

## 7. Fail-closed

Diferencias entre cualquiera de estos elementos bloquean antes de la siguiente mutación:

- Control Plane;
- Lineage Lock;
- Capability Status Ledger;
- source/tree;
- artifact/digests;
- Preview marker;
- harness identity;
- gate esperado;
- paquete evergreen/manifiesto.

El sistema no promete ausencia absoluta de defectos; impide que una desincronización avance silenciosamente o sea declarada PASS.

## 8. Política de Fuentes del Proyecto

La versión activa de las Fuentes del Proyecto es una **copia estática evergreen**.

No debe contener:

- gate actual;
- HEAD actual;
- run IDs operativos;
- buildId actual;
- Preview URL actual;
- porcentaje actual;
- estados PASS/PENDING de ejecución.

Por tanto, cambios normales de ejecución **no obligan a reemplazar las fuentes**.

## 9. Triggers que sí obligan a una nueva versión

Se exige paquete V(n+1) cuando cambia una verdad normativa permanente:

1. frontera/nombre/memoria del Proyecto ChatGPT;
2. repo/rama/Firebase de autoridad;
3. secuencia o semántica de gates;
4. capabilities Fase A;
5. política de roles/seguridad;
6. contrato de datos/corte;
7. contrato de lineage;
8. contrato artifact/frontend/backend;
9. criterios obligatorios de QA/aceptación;
10. arquitectura de autoridad/control;
11. regla de postproducción.

Una nueva incidencia, run, error 403/429, Preview URL o HEAD **no** es por sí misma trigger documental.

## 10. Notificación obligatoria

Cuando una regla normativa requiera actualización:

- GitHub registra la causa;
- `CONTROL_PLANE.json` debe poner `projectSources.staticSourceUpdateRequired=true`;
- debe incluir `reason` y alcance;
- se genera el paquete de versión superior;
- se valida integridad;
- Paula recibe una notificación con:
  - qué cambió;
  - por qué;
  - qué archivos actuales debe eliminar;
  - cuáles debe cargar;
  - si alguna fuente se conserva.

No se modifica silenciosamente una fuente activa sin notificar.

## 11. Integridad

Cada paquete evergreen tiene manifiesto con Git blob SHA para archivos canónicos y SHA-256 para el paquete descargable. El guard central verifica que:

- los archivos existan;
- los blobs coincidan;
- no contengan patrones de estado mutable;
- apunten a Control Plane, Lineage Lock y Status Ledger correctos.

## 12. Regla final

Para responder “dónde vamos”, nunca se leen las Fuentes del Proyecto como estado. Se consulta GitHub:

`CONTROL_PLANE → CAPABILITY_STATUS_LEDGER → evidencia física`

Para responder “cuál es la última versión aprobada”:

`CAPABILITY_LINEAGE_LOCK → evidencia I1`

Para saber si Paula debe reemplazar fuentes:

`CONTROL_PLANE.projectSources.staticSourceUpdateRequired`.
