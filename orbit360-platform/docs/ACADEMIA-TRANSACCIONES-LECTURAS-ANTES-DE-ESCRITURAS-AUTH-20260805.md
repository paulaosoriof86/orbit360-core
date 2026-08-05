# ACADEMIA — TRANSACCIONES: LEER TODO ANTES DE ESCRIBIR

Fecha: 2026-08-05  
Módulo: Seguridad, Auth y gates

## Caso

El gate de recuperación de acceso v3 superó el preflight, pero se detuvo al aplicar la configuración de acceso.

Clasificación:

```text
PIPELINE_MECHANISM_FAILURE
```

No fue un defecto de usuarios, roles, contraseñas, Firebase Auth ni datos CRM.

## Causa

La transacción recorría varios perfiles intercalando:

```text
leer perfil 1 → programar escritura 1 → leer perfil 2
```

El patrón correcto es:

```text
leer todos → validar todos → construir todos los patches → escribir todos
```

Esto evita lecturas posteriores a una escritura programada y conserva atomicidad.

## Diferencia metodológica

- `DATA_CONTRACT_FAILURE`: faltan o contradicen datos requeridos.
- `VALIDATOR_STALE`: el gate exige una forma vieja o incorrecta del contrato.
- `PIPELINE_MECHANISM_FAILURE`: el mecanismo que ejecuta un contrato válido está mal compuesto.

## Gate seguro

Ante este fallo:

- la transacción abortó completa;
- hubo cero escrituras confirmadas;
- no se desplegó la Function;
- no se crearon identidades ni memberships;
- no se reintentó el request consumido.

El correctivo se aplicó source-only y cualquier nueva ejecución requiere path, gate y autorización nuevos.
