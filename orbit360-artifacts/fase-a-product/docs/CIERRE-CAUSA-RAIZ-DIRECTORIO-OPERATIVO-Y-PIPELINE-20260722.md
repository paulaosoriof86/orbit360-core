# CIERRE DE DIAGNÓSTICO — DIRECTORIO OPERATIVO Y PIPELINE M1

**Fecha:** 2026-07-22  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block1-client360-insurers-lab-v20260717`

La visualización Hosting LAB fue rechazada y no constituye aprobación M1.

## Defectos demostrados

- números bancarios enmascarados o sustituidos por «Cuenta protegida»;
- revelado bancario con «No fue posible recuperar el dato»;
- copia bancaria dependiente del revelado fallido;
- usuarios de portal sustituidos por «Usuario pendiente de registrar»;
- contraseña temporal visible correctamente.

## Causa raíz funcional

```text
usuario: dato operativo visible
número bancario: dato operativo visible y copiable
contraseña: secreto con revelado temporal
```

Una cadena posterior de proveedor, importador, bridge, owner visual, Academia y validador aplicó erróneamente tratamiento protegido a los tres campos.

Clasificación: `DATA_CONTRACT_FAILURE` + `FUNCTIONAL_DEFECT` + `VALIDATOR_STALE`.

## Causa raíz del pipeline

Cuatro ejecuciones se detuvieron antes de acceder a datos:

```text
29968658125  phase alignment literal
29968906716  visual HTML literal
29969478259  cache token en owner incorrecto
29969765220  conteo literal válido de Academia
```

En todos los casos: Firestore no leído, bóveda no leída, cero escrituras y cero commit de producto.

La causa fue un transformador monolítico ejecutado dentro del workflow, que mezclaba producto, importadores, proveedores, Academia, overlays y validadores y dependía de coincidencias textuales exactas.

## Regla vinculante

El workflow no puede construir ni transformar el producto. El patch completo 1.0.38 debe existir primero como commit atómico directo y ser auditado como conjunto. El workflow solo podrá validarlo y producir evidencia.

## Estado

```text
M1: ABIERTO
M2: BLOQUEADO
VISUALIZACIÓN ACTUAL: RECHAZADA
TERCER REQUEST ESTÁTICO: PROHIBIDO
FIRESTORE / BÓVEDA / HOSTING: BLOQUEADOS
FUNCTIONS / RULES / PRODUCCIÓN: BLOQUEADOS
REIMPORTACIÓN: NO REQUERIDA / NO AUTORIZADA
```

## Siguiente acción exacta

Preparar sin ejecución el patch atómico directo 1.0.38 y la matriz antes/después por archivo. Auditar el resultado completo. Solo después sustituir el workflow por validación pura y crear una solicitud nueva.
