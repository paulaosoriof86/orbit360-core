# Academia Orbit 360 — Preservación de Aseguradoras post-go-live

Fecha: 2026-08-29  
Módulo: Aseguradoras  
Ámbito: arquitectura reusable, roles, seguridad, gates y diagnóstico causal.

## Objetivo

Evitar que una anomalía de Aseguradoras vuelva a provocar reimportaciones, reconstrucciones o parches sobre un proceso ya cerrado. La aceptación post-go-live se hace contra el owner operativo final y distingue producto, datos, wiring y validador.

## Contrato funcional final

El directorio operativo distingue datos visibles, credenciales y permisos:

- **Usuario de portal:** dato operativo. Puede mostrarse y copiarse a quien tenga permiso.
- **Contraseña:** puede revelarse temporalmente a Dirección, Admin, SuperAdmin, AdminTenant, Operativo o a quien tenga permiso extra explícito, salvo restricción explícita.
- **Fuente de la contraseña:** el owner puede consumir en lectura un valor operativo ya existente en los aliases `password`, `pass`, `contrasena` o `clave`; si no existe valor directo, conserva `credentialRef`/proveedor como fallback.
- **Permiso:** es la barrera real de revelado. Un rol no autorizado no obtiene acceso por conocer una referencia ni porque exista el valor en el registro.
- **Persistencia:** este rootfix es de lectura/render y no autoriza nuevas escrituras de credenciales, cambios de datos, reimportación ni relajación de reglas de Firestore.
- **Número de cuenta bancaria:** dato operativo. Debe estar visible y poder copiarse directamente junto con banco, tipo, moneda y titular.
- **`accountRef`/proveedor seguro:** puede existir como respaldo, pero no es requisito para visualizar o copiar el número de cuenta.

El owner canónico sucesor es `clientInsurerOperationalDirectoryOwner`, versión `20260829.1`, en `core/client-insurer-operational-directory-owner-v20260722.js`.

## Composición productiva

Producción usa `core/router-tenant-config-product-bootstrap-p0.js`, no el bootstrap LAB. El bootstrap productivo:

- no carga el provider LAB;
- conserva modo `product-readonly`;
- carga el owner operativo final;
- usa revisión de URL `v=20260829-1` para impedir que un cache anterior deje visible la versión `20260723.2` después de promover el sucesor.

Un cambio del owner sin actualizar su composición/caché es incompleto y debe clasificarse como fallo del mecanismo, no como un nuevo defecto de Aseguradoras.

## Owner vs consumidor legacy

`modules/aseguradoras-v1202-resources-bridge.js` puede continuar presente por compatibilidad, pero **no es autoridad final** sobre bancos/plataformas. El bootstrap productivo carga el owner canónico y este declara que supersede esas secciones legacy.

Una auditoría no debe concluir que el bridge legacy determina el comportamiento final solo porque el archivo exista. Debe comprobar qué owner termina gobernando el render.

## Roles

La visibilidad sigue el motor canónico de permisos/scopes.

- Dirección/Admin/SuperAdmin/AdminTenant/Operativo: pueden revelar la contraseña cuando no exista una restricción explícita.
- Permiso extra `aseguradoras_plataformas_credenciales` o `aseguradoras_editar`: puede habilitar el acceso según la política vigente.
- Restricción explícita sobre esos permisos prevalece y bloquea el revelado.
- Asesor no recibe credenciales por su rol base; solo podría hacerlo mediante un permiso extra explícito y dentro de su alcance.

## Cómo clasificar una falla

### `FUNCTIONAL_DEFECT`

El owner final está cargado correctamente, el validador lo protege, pero el comportamiento visible incumple el contrato.

### `DATA_CONTRACT_FAILURE`

El registro no contiene ninguna fuente utilizable para una credencial que debería existir, o rompe el contrato operativo del dato.

### `VALIDATOR_STALE`

El producto contiene o propone la solución final, pero el gate/validador sigue exigiendo la arquitectura anterior —por ejemplo, provider LAB + Functions como única solución— o sigue fijado a la versión `20260723.2`.

**Ante `VALIDATOR_STALE`: producto y datos se congelan. Se corrige el validador/mecanismo, no se crea otro parche funcional.**

### `PIPELINE_MECHANISM_FAILURE`

El cambio funcional se aplica directamente al HEAD canónico sin pasar por el overlay explícito, o el empaquetado/runtime conserva una versión antigua aunque el source sucesor sea correcto.

**Ante `PIPELINE_MECHANISM_FAILURE`: se restaura primero el baseline preservado, se conserva el delta en una candidata separada y se promueve por `stage → accept`.**

## Regla anti-reproceso

> PASS histórico vigente + mismo artefacto productivo = NO REPROCESAR.

Para Aseguradoras, una incidencia de visualización, acceso, owner, bootstrap o gate no autoriza:

- reimportar las 26 aseguradoras;
- reconstruir directorio/ficha/conocimiento;
- volver a diseñar permisos ya cerrados;
- reabrir el gate M1 histórico;
- crear otro provider si el valor operativo existente ya puede resolverse con permisos.

## Preservación automática

El guard source-only `tools/orbit360-aseguradoras-operational-owner-preservation-v20260827.mjs` debe comprobar como mínimo:

1. owner final `20260829.1`;
2. usuario operativo visible;
3. revelado de contraseña limitado a roles/permisos autorizados;
4. fallback de lectura sobre credencial operativa existente;
5. fallback de provider preservado;
6. cuenta bancaria visible y copia directa;
7. cero writes/reimports desde el owner;
8. bootstrap **productivo** cargando la revisión `20260829-1`;
9. ausencia de provider LAB en el bootstrap productivo;
10. bridge legacy no convertido en autoridad final.

El perfil de sucesor actual es `ASEGURADORAS_AUTHORIZED_REVEAL_V2` y solo admite dos deltas de producto: owner operativo + bootstrap productivo. No incluye `functions/`, provider nuevo ni datos.

## Diferencia entre aceptación histórica y post-go-live

El gate histórico M1 permanece como evidencia de lo que se validó en su momento. No se reescribe retrospectivamente.

La aceptación post-go-live añade una protección transversal posterior que verifica el contrato final efectivamente incorporado a la candidata canónica. Esto evita que un PASS antiguo sea usado para aprobar silenciosamente una regresión futura y evita que un validador obsoleto fuerce el regreso a una arquitectura descartada.
