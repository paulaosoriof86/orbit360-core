# Academia Orbit 360 — Preservación de Aseguradoras post-go-live

Fecha: 2026-08-27  
Módulo: Aseguradoras  
Ámbito: arquitectura reusable, roles, seguridad, gates y diagnóstico causal.

## Objetivo

Evitar que una anomalía de Aseguradoras vuelva a provocar reimportaciones, reconstrucciones o parches sobre un proceso ya cerrado. La aceptación post-go-live se hace contra el owner operativo final y distingue producto, datos, wiring y validador.

## Contrato funcional final

El directorio operativo distingue datos operativos de secretos:

- **Usuario de portal:** dato operativo. Puede mostrarse y copiarse a quien tenga permiso.
- **Contraseña:** secreto. No se persiste en texto plano; solo puede revelarse temporalmente mediante proveedor seguro y vuelve a estado oculto.
- **Número de cuenta bancaria:** dato operativo. Debe estar visible y poder copiarse directamente junto con banco, tipo, moneda y titular.
- **`accountRef`/proveedor seguro:** puede existir como respaldo, pero no es requisito para visualizar o copiar el número de cuenta.

El owner canónico es `clientInsurerOperationalDirectoryOwner`, versión `20260723.2`, en `core/client-insurer-operational-directory-owner-v20260722.js`.

## Owner vs consumidor legacy

`modules/aseguradoras-v1202-resources-bridge.js` puede continuar presente por compatibilidad, pero **no es autoridad final** sobre bancos/plataformas. El bootstrap del Router carga el owner canónico y este declara que supersede esas secciones legacy.

Una auditoría no debe concluir que el bridge legacy determina el comportamiento final solo porque el archivo exista. Debe comprobar qué owner termina gobernando el render.

## Roles

La visibilidad sigue el motor canónico de permisos/scopes. El contrato de seguridad no convierte datos operativos en secretos por conveniencia técnica.

- Dirección/roles autorizados: ven el directorio conforme a alcance y permisos.
- Operativo: accede según su alcance y permisos operativos.
- Asesor: solo lo que su rol/scope permite; no obtiene privilegios por conocer un `credentialRef`.
- Ningún rol recibe una contraseña persistida en store.

## Cómo clasificar una falla

### `FUNCTIONAL_DEFECT`

El owner final está cargado correctamente, el validador lo protege, pero el comportamiento visible incumple el contrato.

### `DATA_CONTRACT_FAILURE`

La fuente/modelo vuelve a clasificar incorrectamente usuario o cuenta bancaria como secreto, o rompe el contrato operativo del dato.

### `VALIDATOR_STALE`

El producto contiene la solución final, pero el gate/validador sigue comprobando una versión anterior o verifica solo síntomas superficiales —por ejemplo, que existan 26 aseguradoras, pestañas o botones— sin garantizar el owner final y su semántica.

**Ante `VALIDATOR_STALE`: producto y datos se congelan. Se corrige el validador/mecanismo, no el módulo.**

## Regla anti-reproceso

> PASS histórico vigente + mismo artefacto productivo = NO REPROCESAR.

Para Aseguradoras, una incidencia de visualización, acceso, owner, bootstrap o gate no autoriza:

- reimportar las 26 aseguradoras;
- reconstruir directorio/ficha/conocimiento;
- mover cuentas bancarias a secretos;
- volver a diseñar permisos ya cerrados;
- reabrir el gate M1 histórico.

## Preservación automática

El guard source-only `tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs` debe comprobar como mínimo:

1. owner final `20260723.2`;
2. usuario operativo visible;
3. contraseña protegida y temporal;
4. cuenta bancaria visible;
5. cero dependencia de reveal para bancos;
6. copia bancaria directa con campos exactos;
7. cero writes/reimports desde el owner;
8. bootstrap solicitando/cargando esa misma versión;
9. bridge legacy no convertido en autoridad final.

Si cualquiera falla, la candidata no debe continuar por el mecanismo normal de aceptación hasta resolver la divergencia de fuente.

## Diferencia entre aceptación histórica y post-go-live

El gate histórico M1 permanece como evidencia de lo que se validó en su momento. No se reescribe retrospectivamente.

La aceptación post-go-live añade una protección transversal posterior que verifica el contrato final efectivamente incorporado a la candidata canónica. Esto evita que un PASS antiguo sea usado para aprobar silenciosamente una regresión futura.
