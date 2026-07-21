# Cierre de causa raíz — segundo dry-run después de confirmar directorio de aseguradoras

Fecha: 2026-07-21  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria de destino: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Merge, `main` y producción: no autorizados

## Bloque y alcance

```txt
Bloque: 1 — Cliente 360 + Aseguradoras
Fuente: directorio_aseguradoras
País en validación: GT
Colombia: bloqueada hasta cierre de Guatemala
Gate único: block1-real-insurer-directories-lab-v20260720
```

La corrección se limita al contrato entre el importador especializado de Aseguradoras y el listener transversal P0. No modifica el Excel real, los 26 registros existentes, los 414 clientes, los 7 asesores, las Functions, la bóveda ni las 91 referencias bancarias protegidas.

## Necesidad y comportamiento esperado

Después de revisar el dry-run y confirmar el lote, el registro validado debe:

1. escribirse una sola vez;
2. conservar lote, owner, fuente y trazabilidad;
3. no generar un segundo dry-run sobre la misma escritura;
4. no declarar éxito si el conteo escrito no coincide;
5. conservar datos sensibles fuera del store operativo;
6. dejar auditoría y gestión para los registros retenidos.

Cualquier escritura que no tenga contrato y confirmación debe continuar interceptada por P0.

## Clasificación

```txt
FUNCTIONAL_DEFECT + DATA_CONTRACT_FAILURE
```

No fue un defecto del Excel, parser, autenticación, proveedor seguro, cuentas bancarias, IAM o Firebase.

## Causa raíz

El importador especializado ya había producido el dry-run y validado la confirmación reforzada. Al intentar escribir, el listener global `importa-dryrun-p0-wire.js` solo reconocía como controlada una operación con estos marcadores genéricos:

```txt
createdByImport: true
importBatchId: presente
validationStatus: validado
```

El owner especializado enviaba una estructura distinta: trazabilidad en `fuenteDirectorio`, `importado:true` para altas y estados propios de Aseguradoras. El listener interpretaba esa escritura ya confirmada como una nueva importación y la convertía otra vez en revisión P0.

La prueba anterior no detectaba el defecto porque cargaba únicamente el importador especializado y omitía el listener global en el orden real del runtime.

## Corrección única

### 1. Contrato canónico reusable

Archivo:

```txt
orbit360-platform/core/importer-controlled-write-contract-v20260721.js
```

Responsabilidades:

- reconoce únicamente escrituras del owner `insurer-directory-import-v1202`;
- exige archivo, hoja, país, tipo de fuente y ausencia de alertas duras;
- rechaza texto plano sensible;
- distingue registro de directorio, gestión retenida y actividad de auditoría;
- agrega marcadores canónicos de lote y owner;
- permanece fail-closed para cualquier estructura distinta.

Versión:

```txt
20260721.2
```

### 2. Listener P0 alineado

Archivo:

```txt
orbit360-platform/core/importa-dryrun-p0-wire.js
```

Cambio:

- conserva el contrato genérico existente;
- consulta el contrato especializado antes de capturar;
- persiste los marcadores canónicos cuando la operación está autorizada;
- mantiene interceptadas las escrituras no autorizadas;
- evita el segundo dry-run y el falso éxito.

### 3. Orden determinista de carga

Archivo:

```txt
orbit360-platform/modules/importar.js
```

Cambio:

- carga primero el contrato canónico;
- conserva callbacks cuando el builder P0 ya está en descarga;
- publica eventos de disponibilidad;
- carga el listener solo después de contrato y builder;
- elimina la dependencia de velocidad de red.

### 4. Regresión integral

Archivo:

```txt
orbit360-platform/tools/orbit360-smoke-directorios-aseguradoras-v1202.mjs
```

Orden reproducido:

```txt
importador especializado → contrato canónico → listener P0 → confirmación → store
```

Predicados obligatorios:

```txt
una aseguradora realmente insertada: true
cero segundo dry-run: true
cero falso éxito: true
datos sensibles fuera del store: true
auditoría presente: true
trazabilidad archivo/hoja/país presente: true
gestión para registro retenido: true
escritura sin contrato interceptada: true
Asesor sin permiso de aplicación: true
```

### 5. Validador del gate

Archivo:

```txt
tools/orbit360-aseguradoras-import-readiness-v20260720.mjs
```

El mismo readiness ahora:

- ejecuta la regresión integral antes de la revisión de navegador;
- verifica contrato y listener en el runtime desplegado;
- exige versión exacta `20260721.2`;
- conserva las verificaciones de autenticación, acuerdo legal, rol Dirección, 26 aseguradoras, proveedor seguro, cero valores expuestos y commit exacto;
- agrega los predicados al `resultado-sanitizado.json`.

No se creó otro gate. La ejecución sigue siendo:

```txt
block1-real-insurer-directories-lab-v20260720
```

## Academia

Archivo:

```txt
orbit360-platform/data/academia-v1217-aseguradoras-op2.js
```

Versión actualizada:

```txt
1.223
```

Aprendizajes añadidos por rol:

- una confirmación debe producir una sola escritura;
- lote y trazabilidad acompañan la escritura;
- una segunda revisión sobre el mismo lote es defecto y obliga a detener;
- un resultado no es exitoso si no coincide con la escritura real;
- diferencia entre defecto funcional, contrato compartido y validador obsoleto.

## Carriles

### A — Frontend / UX / Academia

- no cambia el flujo visual de selección del archivo;
- se elimina el falso mensaje de cierre;
- Academia enseña el estado correcto;
- no se introduce copy técnico en la UI cliente.

### B — Backend / seguridad / Orbit.store

- contrato reusable y fail-closed;
- listener alineado;
- valores protegidos permanecen fuera del store;
- Functions, IAM, reglas y bóveda no se modifican.

### C — Datos reales A&S

- no hubo nueva importación durante la corrección;
- no se modificaron Clientes o Aseguradoras;
- Guatemala permanece pendiente de una sola repetición posterior al gate;
- Colombia continúa bloqueada.

## Claude

```txt
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

Compartible:

- patrón de contrato entre importador especializado y listener global;
- una confirmación / una escritura;
- regresión con orden real de scripts;
- fail-closed y cero falso éxito.

No compartir:

- datos reales;
- archivos de A&S;
- Functions, cuentas ejecutoras, IAM, bóveda o credenciales;
- URLs o evidencias con información sensible.

## Estado antes del gate

```txt
código: implementado en rama técnica aislada
datos reales: sin cambios
deploy: no ejecutado
gate: pendiente de una sola ejecución
Guatemala: no repetir antes de ok:true
Colombia: bloqueada
```

## Siguiente acción exacta

1. revisar el diff completo contra el HEAD obligatorio;
2. mover la rama obligatoria una sola vez al corte auditado;
3. ejecutar automáticamente el mismo gate;
4. aceptar exclusivamente evidencia sanitizada `ok:true`;
5. solo entonces repetir Guatemala una vez;
6. verificar creación real, conteos, trazabilidad y ausencia de segundo dry-run;
7. mantener Colombia bloqueada hasta el cierre de Guatemala.
