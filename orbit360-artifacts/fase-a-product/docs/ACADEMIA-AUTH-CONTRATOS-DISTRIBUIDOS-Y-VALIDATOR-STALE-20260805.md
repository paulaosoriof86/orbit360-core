# ACADEMIA — AUTH, CONTRATOS DISTRIBUIDOS Y VALIDATOR_STALE

Fecha: 2026-08-05  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Objetivo

Enseñar por qué un usuario visible en un módulo de Equipo no necesariamente puede iniciar sesión y cómo distinguir un dato realmente incompleto de un validador que exige una forma obsoleta del contrato.

## 1. Las cuatro capas del acceso

Un acceso operativo exige coherencia entre:

1. identidad en el proveedor de autenticación;
2. registro de la persona/asesor en la configuración del tenant;
3. membership activa del tenant;
4. roles, rol predeterminado, países y scopes efectivos.

Crear solo una ficha en Equipo no equivale a crear la identidad ni la membership.

## 2. Contrato distribuido no significa contrato incompleto

La configuración puede estar legítimamente distribuida:

- identidad verificada por una fuente autorizada;
- roles y rol predeterminado en un roster aprobado;
- países en el registro de la persona o en la configuración activa del tenant;
- scopes derivados del perfil aprobado y sus extras/restricciones.

Un validador no debe obligar a duplicar todos los campos en un único documento legacy si existen fuentes canónicas más recientes y selladas.

## 3. Diferencia entre DATA_CONTRACT_FAILURE y VALIDATOR_STALE

### DATA_CONTRACT_FAILURE

Existe cuando ninguna fuente autorizada permite resolver un campo obligatorio, hay ambigüedad o las fuentes se contradicen.

Ejemplos:

- dos personas coinciden con la misma identidad;
- no existe correo autorizado ni digest de identidad;
- no hay países en el registro ni en la configuración del tenant;
- los roles aprobados se contradicen entre fuentes vigentes.

### VALIDATOR_STALE

Existe cuando el contrato sí puede componerse desde fuentes autorizadas, pero el validador exige una estructura anterior o una duplicación innecesaria.

Ejemplo reusable:

```text
validador exige correo + roles + países + scopes en el mismo registro
pero
correo está verificado en identidad,
roles/default están en roster aprobado,
países vienen de configuración tenant,
scopes vienen del contrato de perfil
```

La corrección debe hacerse en el owner del validador/compositor, no mediante hardcode ni duplicación arbitraria de datos.

## 4. Orden correcto del gate

```text
request único e inmutable
→ preflight canónico antes de secretos
→ composición de configuración desde fuentes aprobadas
→ dry-run/diff
→ escritura limitada e idempotente
→ censo Auth/memberships
→ despliegue de Function allowlisted solo si falta
→ creación o vínculo de identidad
→ membership
→ verificación de roles, países y scopes
→ correo de establecimiento/recuperación
→ snapshot e integridad
```

## 5. STOP_RETRY

Cuando el mismo bloque se detiene:

- se consume la autorización;
- no se modifica ni reutiliza el request;
- no se crea otra cuenta demo;
- no se inventan roles, países o contraseñas;
- se identifica el owner exacto;
- se prepara el root fix source-only;
- un nuevo runtime requiere autorización nueva.

## 6. Regla de autoadministración

El producto debe permitir que un administrador autorizado cree o vincule usuarios desde configuración, sin editar código. El backend debe traducir esa acción a identidad + membership + roles/scopes, con auditoría y recuperación de contraseña.

No deben existir:

- usuarios hardcodeados;
- contraseñas en código o evidencia;
- dependencia permanente de cuentas demo;
- acceso por nombre sin identidad verificable;
- scopes “todos” abiertos sin motivo y confirmación reforzada.

## 7. Caso didáctico por rol

### Dirección

Comprende que un usuario puede tener varios roles y un rol predeterminado, y que abrir alcance total requiere trazabilidad.

### Operativo

Comprende que validar un pago o gestionar cartera depende de permisos y scopes, no solo del nombre del cargo.

### Asesor

Comprende que su alcance propio debe mantenerse aunque también tenga un rol operativo adicional.

## 8. Resultado esperado

El estudiante debe poder responder:

1. por qué una ficha de Equipo no garantiza login;
2. qué diferencia Auth de membership;
3. cuándo un error es de datos y cuándo el validador está obsoleto;
4. por qué no debe resolverse con hardcode;
5. cómo conservar seguridad y autoadministración al mismo tiempo.
