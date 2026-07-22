# Bloque 1 — STOP THE LINE y reconciliación efectiva de owners del registro

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Gate: `block1-client360-insurers-lab-v20260717`  
Contrato: `1.0.35`

## Clasificación

- `VALIDATOR_STALE`
- `PIPELINE_MECHANISM_FAILURE`

## Necesidad

El preflight del Bloque 1 debía validar el release crítico `block1-critical-runtime-20260721-4` sin perder los owners vigentes que ya habían sido reconciliados en el overlay 1.0.34.

Al simplificar el overlay 1.0.35 se conservaron PWA, la barrera visual y el contrato visual, pero se omitieron overrides efectivos que seguían siendo necesarios para interpretar correctamente Calidad, importación documental, el puente seguro y la Academia de Aseguradoras.

## Causa raíz

El registro base y su extensión todavía contenían tokens históricos para:

- `insurerSecureTargetBridge`: versión `20260720.1` y `noProtectedValueAccess:true`;
- `realInsurerDirectoryAcademy`: versión `1.221`.

Los archivos vigentes ya usan:

- `insurerSecureTargetBridge` versión `20260721.3`, proveedor de mappings y bloqueo de escrituras operativas;
- `realInsurerDirectoryAcademy` versión `1.223`, una confirmación/una escritura y gates posteriores read-only.

El overlay 1.0.34 reemplazaba correctamente esos owners. El overlay 1.0.35 inicial perdió esos overrides al reconstruirse de forma simplificada.

## Corrección atómica

Commit de reconciliación: `781ed51b1ef2d70b8b46c46450f947c2f2e67b40`.

Se conservaron los seis owners efectivos del overlay 1.0.34:

1. `clientInsurerVisualStabilityBarrier`
2. `clientInsurerVisualContract`
3. `clientDataQuality`
4. `insurerDocumentImport`
5. `insurerSecureTargetBridge`
6. `realInsurerDirectoryAcademy`

Se añadió el owner PWA requerido por el release 1.0.35.

Resultado de reconciliación:

```text
owners preservados: 6
owners añadidos: 1
owners eliminados: 0
archivos de producto modificados: 0
implementación del validador modificada: 0
escrituras operativas: 0
```

También se restauraron contratos explícitos para:

- `orbit360-platform/modules/calidad.js`
- `orbit360-platform/modules/aseguradoras-v1202-import-bridge.js`
- `orbit360-platform/core/insurer-secure-target-bridge-v20260720.js`
- `orbit360-platform/data/academia-v1217-aseguradoras-op2.js`

## Evidencia posterior

Preflight ejecutado:

```text
Run: 29883945919
Artifact: 8515820110
Digest: sha256:4d0d2cb45afc900188d7b9e68e14be0193fc5de9de6b8a4b81af2c99092ec509
HEAD: 9fc2a3bbd3c1bef74dcad736e2278ac7667868ef
Controles: 1194
Aprobados: 1193
Fallidos: 1
```

Todos los owners y contratos reconciliados aprobaron. El único control fallido fue la ausencia de este mismo documento, que había sido declarado como archivo requerido antes de quedar creado en la rama.

Código exacto:

```text
REQUIRED_FILE:orbit360-platform/docs/BLOQUE1-STOP-LINE-RECONCILIACION-OWNERS-REGISTRO-20260721.md
```

Este resultado no invalida el producto, el manifiesto crítico, el Router, la barrera, la PWA, el Service Worker, el puente seguro ni la Academia. La corrección requerida es exclusivamente documental.

## Restricciones preservadas

- Sin reimportación.
- Sin escrituras Firestore.
- Sin lectura de bóveda.
- Sin secrets.
- Sin navegador.
- Sin deploy LAB.
- Sin Functions ni Rules.
- Sin producción.
- Sin merge ni `main`.
- Colombia intacta.
- 414 clientes, 26 aseguradoras, 7 asesores, 91 referencias y 26 credenciales preservados.

## Siguiente acción exacta

Ejecutar una sola vez el mismo preflight estático 1.0.35 después de crear esta bitácora. Aceptar exclusivamente `GO_GATE_CONTRACT` y evidencia estática `ok:true`. Solo ese resultado podrá habilitar una autorización separada para un único deploy Hosting LAB y gate final antes de la revisión visual.
