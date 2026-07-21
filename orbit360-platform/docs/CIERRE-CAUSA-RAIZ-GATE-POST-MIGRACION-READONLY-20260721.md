# Cierre de causa raíz — gate post-migración en modo read-only

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria de destino: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción, `main` y merge: no autorizados

## Bloque y gate

```txt
Bloque: 1 — Cliente 360 + Aseguradoras
GateId: block1-real-insurer-directories-lab-v20260720
Run fallido analizado: 29801892762
Job: 88544422959
HEAD evaluado: 5db32215cb9e18c661b95aa4c52cfb2d76827f88
ArtifactId: 8484044771
Artifact digest: sha256:564b9bb47643cce54fa2ffa012dda2c2eaeda009850f5039eef3371bb38dee83
```

## Estado preservado antes de la falla

El run confirmó:

```txt
preflight: GO_GATE_CONTRACT · 250/250
Functions descubiertas: 8/8
Functions de credenciales listas: true
Functions bancarias listas: true
redeploy bancario: omitido correctamente
```

El run se detuvo antes de publicar preview y antes de ejecutar la nueva regresión de escritura controlada. No hubo nueva carga de Guatemala, carga de Colombia ni cambio del directorio real.

## Primera etapa fallida

```txt
Migrar cuentas heredadas y verificar cero texto plano
```

Esa etapa pertenecía al cierre anterior, cuando 91 valores heredados fueron trasladados fuera del store operativo y sustituidos por referencias protegidas. La migración ya había sido aceptada con:

```txt
aseguradoras: 26
valores completos después: 0
referencias protegidas después: 91
proveedor protegido: confirmado
```

## Clasificación

```txt
VALIDATOR_STALE + PIPELINE_MECHANISM_FAILURE
```

No se clasificó como defecto del nuevo contrato de escritura porque el workflow falló antes de desplegarlo o probarlo. Tampoco se atribuyó a Functions: el inventario confirmó ocho Functions activas y listas.

## Causa raíz

El workflow continuaba invocando un entrypoint mutador después de que la migración había quedado cerrada. Aunque el script histórico incluía una ruta idempotente, el contrato de ejecución seguía modelando la etapa como “migrar” y no garantizaba que cada run posterior fuera exclusivamente observacional.

Adicionalmente, si el entrypoint terminaba con error, el workflow se detenía antes de copiar el reporte generado. Por eso el artefacto contenía inventario de Functions y preflight, pero no los conteos exactos del estado bancario que motivaron la salida.

La causa raíz no se resuelve reintentando la migración. Se elimina la capacidad de mutar en esta fase.

## Corrección

### Inventario post-migración read-only

Nuevo owner:

```txt
tools/orbit360-inventariar-cuentas-protegidas-aseguradoras-lab-v20260721.mjs
```

El inventario:

- lee únicamente la colección de Aseguradoras;
- no escribe Firestore ni proveedor protegido;
- cuenta aseguradoras, filas bancarias, valores completos y referencias;
- valida formato y unicidad de referencias;
- genera evidencia sin PII ni secretos;
- produce también el formato histórico esperado por el workflow para preservar compatibilidad y garantizar que la evidencia se copie antes de evaluar `ok`.

Predicados:

```txt
aseguradoras = 26
valores completos = 0
referencias protegidas >= 91
referencias inválidas = 0
referencias duplicadas = 0
modo = read_only
migrationExecuted = false
```

### Entry point histórico retirado

Archivo:

```txt
tools/orbit360-migrar-cuentas-aseguradoras-vault-lab-v20260721-v2.mjs
```

Ya no contiene lógica de escritura. Conserva el nombre únicamente porque el workflow histórico lo invoca, establece modo de compatibilidad y delega en el inventario read-only.

### Contrato del gate

Overlay:

```txt
tools/orbit360-gate-contract-overlay-importers-v20260720.json
```

Versión:

```txt
contractVersion: 1.1.1
runtimeVersion: 20260721-2
status: ACTIVE_POST_MIGRATION_READ_ONLY_CONTROLLED_WRITE_FIX
```

El registro activo sustituye el validador de migración por el inventario read-only y añade los owners del contrato de escritura especializada, listener P0, regresión integral y Academia.

## Relación con la corrección de escritura controlada

La corrección del importador permanece congelada en el HEAD evaluado hasta que el gate post-migración apruebe. El siguiente run debe validar, en este orden:

1. preflight 1.1.1;
2. ocho Functions existentes y listas;
3. estado bancario read-only completo;
4. conteos de 414 clientes, 26 aseguradoras y 7 asesores;
5. preview del SHA exacto;
6. contrato de escritura `20260721.2`;
7. una aseguradora ficticia realmente insertada en smoke;
8. cero segundo dry-run;
9. cero falso éxito;
10. información protegida fuera del store;
11. auditoría y trazabilidad presentes;
12. propuesta sin confirmar interceptada;
13. alta manual preservada.

## Carriles

### A — Frontend / UX / Academia

- producto congelado hasta el gate;
- no cambia el archivo real ni el directorio;
- Academia diferencia migración inicial de verificación post-migración.

### B — Backend / seguridad / pipeline

- mutador retirado de la fase activa;
- inventario estrictamente read-only;
- Functions, IAM, reglas, Auth y bóveda sin cambios;
- evidencia disponible incluso cuando un predicado sea falso.

### C — Datos reales A&S

- cero nueva carga durante la corrección;
- Guatemala pendiente de una sola repetición después de `ok:true`;
- Colombia bloqueada hasta aceptar Guatemala;
- no se reimportan Clientes ni Aseguradoras para resolver el gate.

## Claude y Academia

```txt
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

Patrón reusable para Claude:

- una migración cerrada cambia de fase a inventario read-only;
- el gate posterior no conserva capacidad de mutar;
- la evidencia se escribe antes de evaluar el resultado;
- un fallo del pipeline no se corrige modificando datos.

No compartir con Claude: datos reales, referencias, Functions, cuentas ejecutoras, IAM, bóveda o credenciales.

## Siguiente acción exacta

1. actualizar Academia con la fase post-migración read-only;
2. auditar el diff contra `5db32215cb9e18c661b95aa4c52cfb2d76827f88`;
3. mover una sola vez la rama obligatoria al corte auditado;
4. ejecutar el mismo gate sin migración ni escritura bancaria;
5. aceptar únicamente evidencia sanitizada `ok:true`;
6. solo después repetir Guatemala una vez;
7. mantener Colombia bloqueada.
