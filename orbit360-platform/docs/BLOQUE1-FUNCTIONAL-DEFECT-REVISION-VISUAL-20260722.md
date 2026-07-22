# Bloque 1 — FUNCTIONAL_DEFECT en revisión visual M1

Fecha: 2026-07-22  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
HEAD de partida verificado: `32668665b63b87d7167a66ebd75a2be0bef979dd`  
Gate: `block1-client360-insurers-lab-v20260717`

## Estado

El gate técnico conjunto conserva su evidencia histórica `ok:true` bajo contrato 1.0.36. La revisión visual humana única fue consumida y **no fue aprobada**. M1 permanece abierto y el gate queda congelado: no se autoriza reejecución, runtime, navegador, deploy, reimportación ni avance a Pólizas.

## Clasificación

`FUNCTIONAL_DEFECT`

No es `VALIDATOR_STALE`, `DATA_CONTRACT_FAILURE`, `ENVIRONMENT_FAILURE`, `PIPELINE_MECHANISM_FAILURE` ni `SECURITY_FAILURE`. Los datos, referencias seguras, permisos y gate técnico permanecen preservados; falló la conducta visible del owner visual.

## Hallazgos comprobados

1. En móvil, títulos, encabezados, pestañas, acciones y el botón **Instalar como app** no quedan contenidos correctamente.
2. Plataformas no mantiene visible el usuario y muestra el fallback genérico `Usuario protegido`.
3. `Ver temporalmente` sustituye el usuario con la contraseña, en lugar de revelar la contraseña en un espacio separado.
4. Bancos no presenta correctamente la cuenta protegida.
5. `Copiar datos completos` no cumple el bloque esperado.
6. Titular debe usar el nombre de la aseguradora cuando el registro no tenga titular confiable.
7. `Uso` no debe mostrarse ni copiarse.

## Causa raíz

El gate 1.0.36 comprobó existencia de cajas seguras, permisos, cero campos de contraseña y ausencia de escrituras, pero no validó la semántica visible exacta: usuario y contraseña separados, contenido bancario copiado ni contención real en móvil. El owner `core/client-insurer-visual-contract-v20260720.js` implementaba además el fallback y la sustitución incorrectos.

## Corrección atómica

- `core/client-insurer-visual-contract-v20260720.js`: usuario visible permanente, contraseña en slot temporal separado, copia segura usuario+contraseña, número bancario protegido visible/revelable, titular con fallback a aseguradora y copia sin `Uso`.
- `styles/client-insurer-visual-contract-v20260720.css`: contención móvil de títulos, encabezados, tabs, acciones y botón PWA.
- `data/academia-v1221-m1-visual-integrity.js`: contenido 1.227 con la semántica corregida.
- `tools/orbit360-m1-visual-remediation-contract-v20260722.js`: validador estático dedicado.
- `tools/orbit360-block0-architecture-gate-v20260717.js`: incorporación del contrato estático.
- overlay efectivo y manifiesto: contrato 1.0.37.

## Alcance preservado

- 414 clientes, 26 aseguradoras y 7 asesores.
- 91 referencias bancarias históricas válidas y únicas; 2 pendientes `backend_required`.
- 26/26 credenciales preservadas.
- Colombia intacta.
- Cero valores protegidos completos en Store.
- Sin cambios en Auth, Orbit.store, importadores, Firestore, Functions, Rules, producción o main.

## Impacto Claude / prototipo reutilizable

Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Patrones reutilizables: usuario siempre visible; contraseña temporal separada; datos bancarios operativos sin campo `Uso`; titular con fallback configurable; responsive real de encabezados, pestañas, acciones y CTA PWA. No se comparten datos reales, referencias protegidas ni implementación de bóveda.

## Impacto Academia

Se actualiza la lección M1 para explicar:

- diferencia entre usuario visible y contraseña temporal;
- campos exactos de copia bancaria;
- exclusión del campo `Uso`;
- responsive incluyendo `Instalar como app`;
- que un gate verde no reemplaza la revisión visual.

## Pruebas y evidencia

En esta etapa solo se permiten:

- `node --check` de los owners y validadores modificados;
- contrato estático 1.0.37;
- cero escrituras, runtime, navegador y deploy.

## Siguiente acción exacta

Cerrar el delta estático con `PASS`. Después, y solo mediante autorización separada de un solo uso, ejecutar el preflight vinculante. No repetir el gate final. Cualquier deploy posterior se limita a Hosting LAB y exige nueva versión de entrega/cache más coincidencia exacta en bytes y SHA-256 antes de una única revisión visual correctiva.
