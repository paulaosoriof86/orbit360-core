# Cierre de causa raíz — cuentas bancarias protegidas y readiness de directorios reales

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## Bloque y gate

```txt
Bloque: 1 — Cliente 360 + Aseguradoras LAB
GateId: block1-real-insurer-directories-lab-v20260720
HEAD evaluado: 02a5436bc804b3a861f82375b124d05015389b4b
Run: 29797444980
ArtifactId: 8482510536
Artifact digest: sha256:e2427f5d1d65d924e581d15caf719e63c7b0e23077b07fb647c59886dcf9bf12
Resultado: success
```

## Clasificación y causa raíz

La exposición heredada de números completos en el store operativo se clasificó como `SECURITY_FAILURE + DATA_CONTRACT_FAILURE` y se corrigió mediante proveedor seguro, referencias opacas y migración atómica.

Los fallos posteriores del gate se clasificaron como `PIPELINE_MECHANISM_FAILURE`:

1. Firebase desplegó correctamente las cuatro Functions bancarias, pero devolvió código distinto de cero al no poder configurar automáticamente la política de limpieza de artefactos.
2. El inventario inicial utilizó el indicador obsoleto `--gen2`; la CLI vigente requiere `--v2`.

No se modificó el producto para resolver fallos de pipeline. Se corrigió exclusivamente el mecanismo de validación y se evitó un redeploy innecesario.

## Functions verificadas

Se inventariaron ocho Functions: cuatro de credenciales y cuatro de cuentas bancarias.

Predicados aprobados para las ocho:

```txt
existencia: true
estado ACTIVE: true
runtime Node.js 22: true
cuenta ejecutora esperada: true
última revisión creada = última revisión lista: true
tráfico en revisión vigente: 100%
```

El run final detectó las Functions bancarias ya listas y omitió correctamente el redeploy.

## Migración segura

```txt
Aseguradoras preservadas: 26
Cuentas completas antes: 91
Referencias protegidas antes: 0
Cuentas completas después: 0
Referencias protegidas después: 91
Registros confirmados en bóveda: 91
Versión segura creada: true
Rollback: historial de versiones + batch atómico Firestore
```

La migración fue la primera ejecución real del lote. El mecanismo permanece diseñado como idempotente para reanudación segura, pero no se volvió a ejecutar.

## Proveedor protegido

```txt
providerRegistered: true
rawAccountsRemoved: true
secureReferencesPresent: true
protectedRevealConfirmed: true
ok: true
```

No se publicaron valores, credenciales ni datos reales en la evidencia.

## Datos preservados

```txt
clientes: 414
aseguradoras: 26
asesores: 7
readyForVisualValidation: true
```

No hubo reimportación de Clientes ni Aseguradoras.

## Preview y readiness

Preview LAB exacto:

```txt
https://ays-orbit-360-lab--orbit360-ays-lab-fj1zxnk2.web.app
```

Predicados aprobados:

```txt
login: true
legalReady: true
directionRole: true
insurerCount26: true
canonicalImporterOwner: true
parserReady: true
controlledWriterReady: true
secureOnlyReady: true
secureProviderReady: true
noUnmaskedSensitiveValues: true
importButtonReady: true
countryGTCO: true
excelInputReady: true
exactRuntimeCommit: true
ok: true
```

## Estado de cierre

```txt
M1 técnico: CERRADO
Cadena de causa raíz de cuentas bancarias: CERRADA
Readiness para directorio real Guatemala: APROBADO
Carga de Guatemala: PENDIENTE DE SELECCIÓN DEL ARCHIVO EN ORBIT
Colombia: BLOQUEADA hasta aceptación de Guatemala
```

La selección del archivo en el navegador es el único punto manual inevitable. No se debe crear otro gate, redeploy, reimportación ni corrección previa a esa carga.

## Carriles

- **A — Frontend/UX/Academia:** importador visible y listo; estados seguros y copy no técnico confirmados.
- **B — Backend/seguridad:** ocho Functions activas; bóveda, referencias opacas, revisión y tráfico confirmados.
- **C — Datos A&S:** 91 cuentas migradas sin alterar los conteos; siguiente fuente: directorio Guatemala.

## Impacto Claude / prototipo reutilizable

```txt
Clasificación: REPLICABLE_CLAUDE_ACUMULADO
Patrón reusable: cuentas bancarias y credenciales se representan con referencias protegidas, nunca con valores completos en store.
No compartir: Functions, service accounts, IAM, bóveda, migración, datos reales o secretos.
```

## Impacto Academia

Actualizar la lección de Aseguradoras/Importador para explicar:

- diferencia entre dato operativo y dato protegido;
- referencia opaca;
- validación previa a migración;
- diferencia entre fallo de producto y fallo de pipeline;
- por qué un error de limpieza de artefactos no implica que el deploy haya fallado.

## Siguiente acción exacta

1. Abrir el preview aprobado.
2. Ingresar con la sesión LAB autorizada.
3. Ir a Aseguradoras → Importar directorio.
4. Seleccionar una sola vez `Directorio Aseguradoras Guatemala 2026.xlsx`.
5. Revisar dry-run/diff sanitizado y aceptar Guatemala únicamente si el resultado es correcto.
6. Mantener Colombia bloqueada hasta ese cierre.
