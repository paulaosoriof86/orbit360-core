# ACADEMIA — ACCESS PRODUCTIVO DEBE LEER MEMBERSHIP, NO COLECCIONES DE DOMINIO

Fecha: 2026-07-30

## Caso M6 6.2.0 / 6.2.1

Un módulo puede estar autorizado por el rol activo aunque una colección auxiliar no forme parte del manifiesto runtime.

En el caso observado:

- `Operativo` y `Asesor` tenían Aseguradoras en el contrato canónico de membership;
- el runtime productivo montaba correctamente solo `clientes + aseguradoras`;
- los 7 asesores eran fuente, no colección promovida;
- una capa legacy intentaba usar datos del asesor / `Orbit.ROLES` para resolver visibilidad;
- al cambiar de Dirección a Operativo, el router terminaba negando Aseguradoras.

Clasificación correcta:

`FUNCTIONAL_DEFECT + DATA_CONTRACT_FAILURE`.

No era válido:

- migrar `asesores` solo para hacer pasar el smoke;
- ampliar el manifiesto M6 artificialmente;
- cambiar los permisos reales del usuario;
- tratarlo como timeout del validator.

La solución correcta fue desacoplar autorización de presencia de colecciones de dominio y consumir la membership autenticada.

## Regla reusable

En producto:

`Auth → membership → rol activo → módulos efectivos → scope efectivo → acceso`.

Nunca:

`colección auxiliar presente → inferir permiso`.

Esta regla aplica a Pólizas, Vehículos, Cobros, Siniestros, Comisiones, Documentos y módulos posteriores.

## Aprendizaje metodológico

Cuando un rol funciona en una vista y falla en otra:

1. comprobar primero el contrato de roles/módulos;
2. comprobar la proyección autenticada;
3. comprobar qué owner decide `canSee`;
4. distinguir dependencia de autorización de dependencia de datos;
5. no migrar datos para reparar una decisión de acceso;
6. reproducir el caso sintéticamente antes de volver a producción.

El test 6.2.1 demostró el comportamiento esperado con `advisorStorePresent:false`: Dirección, Operativo y Asesor mantienen acceso a Aseguradoras conforme al contrato, sin abrir Finanzas a roles que no lo tienen.

Clasificación reusable: `REPLICABLE_CLAUDE_ACUMULADO` + `ACADEMIA_ACTUALIZAR`.
