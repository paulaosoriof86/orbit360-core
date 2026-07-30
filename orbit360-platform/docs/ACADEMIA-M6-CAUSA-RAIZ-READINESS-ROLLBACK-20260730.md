# ACADEMIA — M6: CAUSA RAÍZ, READINESS Y ROLLBACK

Fecha: 2026-07-30

## Objetivo

Enseñar a cada rol técnico/operativo a distinguir una falla funcional de una falla del validador, del entorno o del pipeline antes de corregir producto.

## Caso M6

### Caso A — VALIDATOR_STALE

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

## STOP_RETRY

Si la misma etapa falla dos veces:

1. detener reintentos;
2. no abrir otro módulo;
3. no agregar otro parche funcional;
4. diagnosticar gate/pipeline;
5. corregir causa raíz;
6. exigir nueva evidencia antes de habilitar otra transición de riesgo.

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
| `ENVIRONMENT_FAILURE` | bucket Storage inexistente | corregir alcance/entorno; no inventar recurso |
| `PIPELINE_MECHANISM_FAILURE` | GET inmediato tras release devuelve 404 transitorio | corregir readiness/propagación |
| `DATA_CONTRACT_FAILURE` | conteos/digests o membership no coinciden | detener transición y corregir contrato/datos |
| `SECURITY_FAILURE` | permisos insuficientes o acceso fuera de scope | fail-closed y corregir autorización/IAM |

## Evaluación sugerida

Ante un fallo de deploy seguido de un 404, el alumno debe identificar primero si:

- la release no fue creada;
- la release fue creada pero aún no se propagó;
- el target no existe;
- la URL apunta al site equivocado;
- el shell esperado no coincide;
- hubo un cambio de datos no autorizado.

La respuesta correcta nunca es “volver a ejecutar” sin clasificar primero.
