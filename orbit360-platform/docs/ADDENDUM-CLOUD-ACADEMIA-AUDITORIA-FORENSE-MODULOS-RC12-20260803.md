# Addendum Cloud / Claude / Academia — auditoría forense acumulativa RC1.2

Fecha: 2026-08-03

## Clasificación

```text
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
SECRETO_DATO_REAL
```

## Patrones reutilizables

### CL-133 — Paridad de candidata por módulo

Una candidata acumulativa no se valida por cantidad de commits ni por apariencia visual. Debe comparar, para cada archivo de módulo y bridge activo:

- blob de baseline aprobada;
- blob de candidata;
- blob de rama viva;
- último commit que modificó el archivo;
- evidencia de aprobación;
- integración al store;
- madurez del backend.

### CL-134 — Presencia no equivale a backend completo

La auditoría debe separar:

```text
archivo presente
módulo activo
sintaxis válida
registro en router
uso de Orbit.store
colecciones reales
writer durable
permisos/scopes
integraciones reales
smoke runtime
aprobación visual
```

Solo la combinación de estas capas permite declarar un módulo completo.

### CL-135 — Candidata acumulativa con brechas de madurez

Es válido concluir:

```text
GO_STATIC_CUMULATIVE_MODULE_PARITY_WITH_MATURITY_GAPS
```

cuando la candidata no retrocede código, pero aún existen módulos con backend parcial, integraciones no conectadas o aprobación pendiente. Esta decisión permite continuar con un cierre focalizado sin afirmar falsamente que todo el producto está terminado.

### CL-136 — SOURCE_ROOT y OUTPUT_PATH son contratos distintos

Un validador que inspecciona un worktree de release debe recibir por separado:

- raíz de lectura inmutable;
- ruta de evidencia observable.

Nunca debe concatenar una ruta absoluta de salida con la raíz de la candidata.

### CL-137 — Membership técnica no es onboarding productivo

Una membership técnica con todos los roles puede servir para LAB, pero no demuestra acceso multiusuario. Antes de producción deben existir memberships normales independientes para los perfiles requeridos, vinculadas por UID a usuarios Auth normales existentes.

### CL-138 — No normalizar identidad cambiando semántica

Si el único documento pertenece a una identidad técnica excluida, no se debe convertir en usuario normal alterando roles o estado. La solución correcta es onboarding controlado de memberships normales, con auditoría y rollback.

## Aplicación en Academia

La Academia debe enseñar por rol:

- diferencia entre rol simulado y membership real;
- relación Firebase Auth ↔ tenant membership;
- por qué un smoke con identidad técnica no representa al usuario final;
- cómo auditar una candidata acumulativa;
- diferencia entre defecto funcional, `DATA_CONTRACT_FAILURE`, `VALIDATOR_STALE` y `PIPELINE_MECHANISM_FAILURE`;
- cuándo corresponde STOP_RETRY;
- por qué un módulo presente no equivale a backend cerrado.

## Frontera protegida

No se envían a Cloud/Claude:

- correos;
- UID;
- credenciales;
- documentos de memberships reales;
- reglas o writers productivos;
- service accounts;
- datos A&S.

El onboarding productivo continúa clasificado como `BACKEND_PROTEGIDO_NO_CLAUDE`. La matriz, la metodología y los patrones sí pueden incorporarse al prototipo comercializable.
