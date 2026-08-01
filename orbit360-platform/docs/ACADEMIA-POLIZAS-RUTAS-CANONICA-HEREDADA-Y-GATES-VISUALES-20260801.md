# Academia Orbit 360 — Pólizas, rutas de datos y aprobación visual

Fecha: 2026-08-01  
Clasificación: `ACADEMIA_ACTUALIZAR`

## Aprendizaje del caso

Un módulo puede tener código correcto y datos existentes, pero aun así mostrar un universo incompleto cuando el frontend y los procesos de migración consultan rutas físicas diferentes.

En este caso coexistieron:

```text
ruta canónica del producto:
tenants/{tenantId}/data/{collection}/items

ruta heredada operativa:
tenantId/{tenantId}/{collection}
```

## Diferencia que debe enseñar Academia

### Defecto funcional

Existe cuando el módulo recibe los datos correctos y aun así renderiza, calcula o navega mal.

### Validador obsoleto

Existe cuando el gate compara universos, campos o contratos que ya no corresponden al runtime real.

### Falla de contrato de datos

Existe cuando dos componentes válidos esperan la misma información en rutas, campos o formatos incompatibles.

El caso de Pólizas combinó:

```text
DATA_CONTRACT_FAILURE
+ PIPELINE_MECHANISM_FAILURE
+ un VALIDATOR_STALE intermedio
```

## Regla para Dirección

Un PASS técnico no equivale a aprobación visual. Dirección debe visualizar y aprobar por separado:

```text
Pólizas
Vehículos
Recibos
Cartera
relaciones en Cliente 360
```

Mientras no exista esa revisión, el estado debe mostrarse como pendiente, aunque los conteos administrativos o los smokes estáticos hayan pasado.

## Regla para importadores y migración

No reimportar una fuente para corregir una diferencia de ruta o proyección. Primero se debe:

```text
identificar ruta autoritativa
comparar IDs y digests
clasificar solo-canónica y solo-heredada
crear dry-run de migración/adaptación
confirmar diff y rollback
obtener autorización de escritura
```

## País y moneda

El filtro de país requiere un campo físico consultable. Cuando Recibos, Cartera o Cobros no contienen `pais` top-level:

- la relación con Póliza puede proponer el país;
- la propuesta conserva trazabilidad;
- el registro permanece `REQUIERE_VALIDACION` hasta el gate correspondiente;
- no se infiere ni escribe automáticamente.

## Seguridad y gates

Después de dos fallos en la misma etapa:

```text
detener reintentos
congelar preview
clasificar la causa
preservar evidencia
no tocar otro módulo
abrir un único gate de causa raíz
```

La Academia debe mostrar este caso a Dirección, Operativo y equipo técnico como ejemplo de por qué una revisión visual debe estar separada de la migración y del backend.
