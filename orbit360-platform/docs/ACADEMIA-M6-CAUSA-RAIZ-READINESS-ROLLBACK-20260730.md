# ACADEMIA — M6: CAUSA RAÍZ, READINESS Y ROLLBACK

Fecha: 2026-07-30

## Objetivo

Enseñar a cada rol técnico/operativo a distinguir una falla funcional de una falla del validador, del entorno, del pipeline o del contrato de datos antes de corregir producto.

## Caso M6

### Caso A — VALIDATOR_STALE por detección textual

Un validador buscaba la palabra `localStorage` y marcaba fallo incluso cuando aparecía en comentarios que decían que no se usaba.

Aprendizaje: validar comportamiento o sintaxis operativa, no coincidencias textuales sin contexto. Producto debe congelarse mientras se corrige el validador.

### Caso B — ENVIRONMENT_FAILURE

El deploy multi-target esperaba Storage Rules, pero el bucket real no existía.

Aprendizaje: un recurso opcional ausente no se crea automáticamente para hacer pasar un gate. Primero se decide si el bloque realmente lo necesita. Si no lo necesita, se difiere `fail-closed`.

### Caso C — PIPELINE_MECHANISM_FAILURE

El deploy correctivo creó la release de Hosting correctamente, pero el workflow hizo un único GET inmediatamente después. La URL respondió 404 durante la propagación y la etapa se declaró fallida.

Aprendizaje: readiness de Hosting debe ser acotado y observable:

- confirmar release creada;
- esperar propagación;
- reintentar solo lecturas;
- buscar marcador/hash esperado;
- diferenciar 404 transitorio de fallo terminal;
- ejecutar rollback solo al agotar el presupuesto o ante señal terminal.

### Caso D — VALIDATOR_STALE por firma de API

En el recovery 6.1.4 el smoke declaraba un timeout de 60 segundos para esperar el arranque de la aplicación, pero la llamada a Playwright colocaba el objeto de opciones como segundo argumento de `waitForFunction`. Ese lugar corresponde al argumento opcional que se pasa a la función evaluada; las opciones van en el tercer argumento. El timeout configurado no se aplicó y Playwright usó su límite por defecto de 30 segundos.

La evidencia mostró simultáneamente:

- deploy del proveedor: PASS;
- Hosting readiness: PASS HTTP 200;
- datos before/after: estables;
- escrituras: 0;
- smoke: timeout exactamente a 30 segundos;
- rollback: PASS y retorno a fail-closed.

Aprendizaje: un timeout no demuestra por sí solo un defecto funcional. Antes de modificar producto hay que comprobar que el propio validador esté usando correctamente la API que pretende medir.

El fix reusable exige:

1. validar firma y posición de argumentos de APIs async;
2. declarar explícitamente `undefined` para un argumento opcional omitido cuando las opciones ocupan el siguiente parámetro;
3. versionar el validador;
4. guardar diagnóstico sanitizado del estado de arranque si vuelve a vencer el tiempo;
5. revalidar estáticamente antes de reabrir riesgo productivo.

### Caso E — `continue-on-error`: presentación no es contrato

GitHub Actions puede mostrar un step con conclusión visual tolerada cuando `continue-on-error` está activo, aunque el `outcome` real del step sea `failure`.

Aprendizaje: el cierre contractual debe usar `steps.<id>.outcome` y la evidencia generada por el gate. Nunca se debe declarar PASS únicamente porque la lista visual de steps parece verde.

### Caso F — DATA_CONTRACT_FAILURE por manifiesto runtime

En 6.1.6 el timeout del smoke ya estaba corregido y efectivamente esperó 60 segundos. Sin embargo, la aplicación no llegaba a `started=true`.

El diagnóstico mostró que la configuración productiva declaraba cuatro colecciones: `clientes`, `aseguradoras`, `gestiones` y `notificaciones`, aunque M4 había promovido canónicamente para este bloque solo `clientes` y `aseguradoras`. Además, `notificaciones` no tenía política definida en `COLLECTION_POLICY`.

La secuencia del fallo fue:

1. el runtime pidió una colección fuera del contrato vigente;
2. el planner la rechazó;
3. el store entró en `attach-error`;
4. `_attachSnapshots()` devolvió `false` antes de que los snapshots válidos terminaran de adjuntarse;
5. el bootstrap devolvió `ok:false` y no instaló el store productivo;
6. la aplicación nunca marcó `started=true`;
7. el gate ejecutó rollback seguro.

Aprendizaje: el manifiesto runtime no es una lista de módulos que “eventualmente existirán”. Debe ser la intersección exacta de:

- fuentes efectivamente migradas/canónicas;
- colecciones aprobadas para el bloque;
- política de acceso vigente;
- capacidades autorizadas para esa transición.

La corrección no consiste en crear la colección faltante o ampliar permisos para hacer pasar el smoke. Se reduce el manifiesto al contrato real. En M6: `clientes` + `aseguradoras`.

### Caso G — DATA_CONTRACT_FAILURE por alias lógico/físico

En 6.1.8 Auth, bootstrap, deploy y readiness ya funcionaron. La aplicación alcanzó `runtime_contract`, pero el store expuso 0 clientes y 0 aseguradoras aunque el snapshot administrativo before/after seguía demostrando 414/26.

El problema estaba en la diferencia entre el **nombre lógico** usado por la política y el **campo físico** persistido por la migración:

```text
política lógica: country
esquema canónico físico: pais
```

El esquema de importación exige `pais` para clientes y aseguradoras. M4 preservó ese campo al promover los registros canónicos. La política productiva, en cambio, enviaba directamente `country` como constraint Firestore.

Firestore puede resolver correctamente una consulta sobre un campo que ningún documento posee y retornar cero documentos. Por eso no hubo error de transporte: hubo una respuesta técnicamente válida pero semánticamente equivocada.

Aprendizajes:

1. una política puede trabajar con nombres lógicos, pero el adaptador de persistencia debe traducirlos a campos físicos;
2. los aliases físicos se validan contra el esquema de migración, no contra intuiciones de frontend;
3. un snapshot vacío no es éxito funcional cuando existe un baseline canónico esperado;
4. el smoke debe contrastar el resultado con 414/26 y conservar el estado runtime antes de lanzar assertions;
5. readiness de aplicación requiere que **todas** las colecciones obligatorias hayan completado snapshot, no solo la primera.

La corrección M6 usa un alias productivo explícito `country → pais` y una barrera de readiness para `clientes + aseguradoras`. No cambia datos, Rules ni permisos.

## STOP_RETRY

Si la misma etapa falla dos veces:

1. detener reintentos;
2. no abrir otro módulo;
3. no agregar otro parche funcional;
4. diagnosticar gate/pipeline/contrato;
5. corregir causa raíz;
6. exigir nueva evidencia antes de habilitar otra transición de riesgo.

Cuando aparece un `VALIDATOR_STALE` o `DATA_CONTRACT_FAILURE` demostrado después de un rollback seguro, el producto continúa congelado. Se corrige y valida la capa responsable antes de pedir una nueva autorización productiva; la autorización ya consumida no se recicla.

## Rollback correcto

Rollback debe poder ejecutarse aunque el servicio opcional que causó el fallo no exista. Por eso se reduce a las dependencias mínimas necesarias para quedar seguro.

En el caso M6:

- Firestore: deny-all;
- Hosting: página neutra de indisponibilidad;
- Storage: no activo / recurso inexistente;
- datos: intactos.

## Diferencias que el usuario debe reconocer

| Tipo | Ejemplo M6 | Acción correcta |
|---|---|---|
| `FUNCTIONAL_DEFECT` | La UI muestra un nombre demo en producto | corregir owner visual/productivo |
| `VALIDATOR_STALE` | comentario “No localStorage” dispara fallo | corregir validador, congelar producto |
| `VALIDATOR_STALE` | timeout de 60 s no se aplica por firma incorrecta de API | corregir instrumento, versionarlo y revalidar sin tocar producto |
| `ENVIRONMENT_FAILURE` | bucket Storage inexistente | corregir alcance/entorno; no inventar recurso |
| `PIPELINE_MECHANISM_FAILURE` | GET inmediato tras release devuelve 404 transitorio | corregir readiness/propagación |
| `DATA_CONTRACT_FAILURE` | runtime pide una colección no migrada o sin política | reducir manifiesto al contrato canónico; no crear datos/permisos por conveniencia |
| `DATA_CONTRACT_FAILURE` | query usa `country`, pero el documento canónico usa `pais` | traducir alias lógico→físico y validar contra esquema/baseline |
| `DATA_CONTRACT_FAILURE` | conteos/digests o membership no coinciden | detener transición y corregir contrato/datos |
| `SECURITY_FAILURE` | permisos insuficientes o acceso fuera de scope | fail-closed y corregir autorización/IAM |

## Evaluación sugerida

Ante un fallo de deploy/smoke, el alumno debe identificar primero si:

- la release no fue creada;
- la release fue creada pero aún no se propagó;
- el target no existe;
- la URL apunta al site equivocado;
- el shell esperado no coincide;
- el timeout configurado fue realmente aplicado por la API;
- `continue-on-error` está ocultando un `outcome=failure`;
- el manifiesto runtime contiene colecciones fuera de migración/política;
- el planner usa el campo físico correcto de la persistencia;
- todas las colecciones obligatorias terminaron su primer snapshot;
- una respuesta vacía contradice el baseline canónico esperado;
- hubo un cambio de datos no autorizado.

La respuesta correcta nunca es “volver a ejecutar” sin clasificar primero.
