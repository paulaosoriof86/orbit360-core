# Macrobloque de salida a producción — Gravicentra Insurance RC1

Fecha: 2026-08-03  
Estado inicial: `AUTORIZADO / PENDIENTE_EJECUCION`  
Candidata: `27cb7dfcda8568280ebef15993a953364304f29b`

## Objetivo

Desplegar exclusivamente Firebase Hosting desde la candidata RC1 sellada y ejecutar un smoke productivo focalizado sin reabrir Gate 7.11, predeploy, reimportación ni auditoría general.

## Alcance autorizado

```text
verificación inmutable de RC1
snapshot Firestore read-only antes
preservación de release actual y anterior
Firebase Hosting deploy exclusivo
smoke de activos y módulos
verificación de conteos y digests sin cambios
rollback exacto solo ante fallo bloqueante
```

## Módulos obligatorios

- Cliente 360;
- Aseguradoras;
- Pólizas;
- Cobros;
- Ops;
- Leads.

## Guardas

```text
Firestore writes: 0
Auth writes: 0
reimportación: no
Functions: no
Rules: no
main: no
merge: no
Gate 7.11: no repetir
predeploy: no repetir
microautorizaciones: no
```

## Criterios de mantenimiento

El deploy se conserva únicamente si:

1. los activos públicos seleccionados coinciden byte a byte con RC1;
2. los módulos requeridos permanecen presentes en configuración e índice;
3. los conteos source y canonical coinciden con el contrato aceptado;
4. los digests Firestore before/after permanecen idénticos;
5. Hosting registra una nueva release y conserva la release previa como ancla exacta;
6. no existen escrituras operativas, despliegues de Rules/Functions ni reimportación.

## Rollback

Si el smoke falla después de un deploy exitoso, se crea una nueva release de Hosting apuntando exactamente a la versión que estaba activa antes del macrobloque. Después se verifica que los hashes públicos regresen al snapshot anterior y que Firestore permanezca idéntico.

## Arquitectura reusable y Academia

- `CL-110`: un go-live debe consumir una candidata sellada, no el HEAD de trabajo.
- `CL-111`: el snapshot before debe registrar digests y anclas de rollback antes del deploy.
- `CL-112`: el smoke debe comprobar artefacto desplegado y ausencia de mutación de datos.
- `CL-113`: el rollback debe apuntar a una versión exacta y verificar restauración pública.
- `CL-114`: diferenciar fallo de deploy, fallo funcional post-deploy y fallo de rollback.

Clasificación externa:

```text
workflow, credenciales y rollback real: BACKEND_PROTEGIDO_NO_CLAUDE
patrón reusable: REPLICABLE_CLAUDE_ACUMULADO
contenido didáctico: ACADEMIA_ACTUALIZAR
datos, IDs, digests y secretos: SECRETO_DATO_REAL / excluir
```

El patrón queda documentado en el core. No se declara enviado a Cloud/Claude hasta contar con evidencia real de recepción.
