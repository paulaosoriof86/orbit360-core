# DIAGNÓSTICO READ-ONLY — ARTEFACTOS DE REFERENCIAS PROTEGIDAS

Fecha: 2026-07-21  
Incidente: `insurer-directory-protected-reference-regression-v20260721`  
Estado: `STOP_THE_LINE_READ_ONLY_DIAGNOSIS`

## 1. Alcance

Se compararon únicamente los artefactos sanitizados de dos ejecuciones existentes. No se leyó ni modificó Firebase, no se ejecutó gate, no se desplegó preview, no se abrió navegador y no se reveló ningún valor protegido.

Artefactos:

```txt
Checkpoint sano
Run: 29797444980
ArtifactId: 8482510536
Digest: sha256:e2427f5d1d65d924e581d15caf719e63c7b0e23077b07fb647c59886dcf9bf12
HEAD: 02a5436bc804b3a861f82375b124d05015389b4b

Observación fallida
Run: 29803066010
ArtifactId: 8484447512
Digest: sha256:55cf45ca14cf3d67d206020858c05abd4f9fa84fe8f439708a8e295b8839309f
HEAD: 1284d1ab2bb16bd8eb77e4f39afd83970d68af4b
```

## 2. Diferencia de cobertura de los artefactos

Artefacto sano: 10 archivos sanitizados.

- inventario de Functions;
- estado de despliegue;
- migración segura;
- conteos;
- inventario de conocimiento;
- preview exacto;
- readiness de navegador;
- proveedor protegido;
- preflight completo y sanitizado.

Artefacto fallido: 5 archivos.

- inventario de Functions;
- estado de despliegue omitido/listo;
- inventario post-migración;
- preflight completo y sanitizado.

La ejecución fallida se detuvo antes de conteos, preview, navegador y proveedor. Por tanto, no existe evidencia actual que autorice visualización ni nueva importación.

## 3. Checkpoint sano

Reporte de migración:

```txt
before.insurerCount = 26
before.rawCount = 91
before.refCount = 0
vault.recordsConfirmed = 91
vault.versionCreated = true
after.insurerCount = 26
after.rawCount = 0
after.refCount = 91
ok = true
```

Proveedor protegido:

```txt
providerRegistered = true
rawAccountsRemoved = true
secureReferencesPresent = true
protectedRevealConfirmed = true
rawAccounts = 0
secureReferences = 91
ok = true
```

Conteos:

```txt
clientes = 414
aseguradoras = 26
asesores = 7
```

## 4. Estado fallido

Inventario post-migración:

```txt
mode = post_migration_read_only
migrationExecuted = false
before.insurerCount = 26
before.rawCount = 0
before.refCount = 23
after.insurerCount = 26
after.rawCount = 0
after.refCount = 23
insurerCountPreserved = true
rawValuesAbsent = true
protectedReferencesPreserved = false
referenceFormatValid = false
referencesUnique = true
errorCode = POST_MIGRATION_STATE_INCOMPLETE
ok = false
```

Diferencia comprobada:

```txt
Referencias válidas checkpoint: 91
Referencias válidas observadas: 23
Brecha mínima: 68
```

La brecha puede incluir referencias ausentes y referencias existentes con formato no canónico. El artefacto sanitizado no contiene distribución por aseguradora, por lo que aún no permite determinar cuáles documentos fueron afectados.

## 5. Componentes descartados como causa primaria

El inventario de Functions es idénticamente satisfactorio en ambos artefactos:

```txt
expectedCount = 8
discoveredCount = 8
credentialsReady = true
bankAccountsReady = true
state = ACTIVE
runtime = nodejs22
latestCreatedRevision = latestReadyRevision
latestTrafficPercent = 100
ok = true
```

Conclusión:

- no falta Function;
- no existe revisión pendiente;
- no existe tráfico parcial;
- no corresponde redeploy;
- no corresponde cambiar IAM, runtime o service account;
- no corresponde repetir migración.

## 6. Primera conclusión de causa raíz

La pérdida ocurrió entre el checkpoint sano y la observación fallida, después de que las 91 referencias ya estaban creadas y verificadas.

El patrón es consistente con una escritura posterior del directorio que:

- preservó la cantidad de aseguradoras;
- mantuvo cero valores completos;
- redujo o transformó las referencias en arrays `cuentas`;
- no duplicó las referencias restantes;
- pudo reemplazar arrays completos desde información parcial.

Esto refuerza la clasificación:

```txt
DATA_CONTRACT_FAILURE
```

El gate amplio y la semántica de una etapa llamada “migrar” después del cierre refuerzan:

```txt
PIPELINE_MECHANISM_FAILURE
```

## 7. Información que todavía falta y no debe inventarse

Aún no se puede afirmar:

- cuáles aseguradoras exactas perdieron referencias;
- si las 68 referencias faltantes continúan en versiones de bóveda;
- cuál batch o clic produjo la sustitución;
- si también existen referencias de credenciales afectadas;
- si hubo uno o varios documentos modificados;
- si una parte de las referencias cambió de campo o formato.

## 8. Siguiente acción única autorizada

Crear y ejecutar una sola herramienta de inventario read-only, sin valores, que produzca por aseguradora:

```txt
insurerIdHash
country
accountRows
validAccountRefs
invalidAccountRefs
missingAccountRefs
portalRows
validCredentialRefs
invalidCredentialRefs
missingCredentialRefs
updatedAt
lastImportBatchId
lastSourceType
auditEventIdsHash
containsRawValues
```

Restricciones:

- no nombres de aseguradoras en evidencia pública si revelan información real;
- no números completos;
- no usuarios ni contraseñas;
- no reveal/copy;
- no escritura;
- no migración;
- no deploy;
- no navegador;
- no otro gate.

La herramienta debe comparar únicamente conteos, formatos, hashes y trazabilidad sanitizada.

## 9. Gate metodológico de la siguiente iteración

Antes de cualquier cambio:

```txt
Fuente: artefactos sanitizados existentes
Acción: inventario read-only por aseguradora
Owner: diagnóstico del incidente
Datos tocados: ninguno
Escrituras: 0
Reintentos: 0
Resultado esperado: mapa sanitizado de la brecha de 68 referencias
```

Si el inventario no puede explicar la brecha:

```txt
DETENER
NO ESCRIBIR
NO CREAR OTRO PARCHE
AMPLIAR DIAGNÓSTICO DE BÓVEDA READ-ONLY
```

## 10. Impacto Claude y Academia

### Claude

Patrones reutilizables:

- merge no destructivo de arrays;
- preservar referencias protegidas;
- no declarar éxito antes de read-after-write;
- estados honestos de recursos protegidos;
- revelar/copiar solo por permiso.

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
```

### Academia

Actualizar casos sobre:

- diferencia entre dato operativo y dato protegido;
- referencia opaca;
- inventario read-only;
- por qué una Function activa no garantiza integridad del dato;
- por qué no se reimporta para corregir una regresión.

Clasificación:

```txt
ACADEMIA_ACTUALIZAR
```
