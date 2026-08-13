# Claude acumulado — Dependency gate para padres en HOLD

Fecha: 2026-08-01  
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`

## Patrón reusable

Antes de excluir de un read model un registro en estado pendiente o `REQUIERE_VALIDACION`, ejecutar un gate de dependencias que determine si existen hijos operativos que lo referencian.

```text
source record with validation hold
→ dependency scan
→ direct children
→ downstream descendants
→ restricted-parent vs dependent-hold alternatives
→ dry-run
→ explicit authorization before write
```

## Contrato mínimo

El gate reusable debe:

- separar calidad de datos de existencia referencial;
- impedir documentos huérfanos;
- preservar el estado de validación original;
- no convertir un HOLD en dato validado;
- permitir un padre restringido cuando sea necesario para resolver relaciones;
- emitir agregados y digests, no IDs ni valores de negocio;
- comparar alternativas sin escribir;
- requerir autorización independiente para aplicar cambios.

## Clasificación de fallos

- Variable o regla incorrecta del validador: `VALIDATOR_STALE`.
- Padre excluido que rompe relaciones del destino: `DATA_CONTRACT_FAILURE`.
- No corregir el dato para hacer pasar un validador obsoleto.
- No relajar relaciones obligatorias para ocultar un contrato incompleto.

## Exclusiones

No transferir a Claude:

- nombres, documentos o IDs reales;
- conteos específicos del tenant cuando no sean necesarios para el patrón;
- rutas de credenciales, secretos o configuración protegida;
- implementación Firestore concreta del tenant;
- evidencia privada o snapshots.

## Aplicación transversal

El patrón aplica a:

- clientes y pólizas;
- aseguradoras y pólizas;
- pólizas y vehículos;
- pólizas y recibos;
- recibos y cartera;
- pólizas/recibos y cobros;
- usuarios, memberships, roles y scopes;
- catálogos referenciados por módulos operativos.
