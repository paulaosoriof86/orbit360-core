# Incidente importador — aseguradoras pendientes de validación

Fecha: 2026-07-14  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carril: C con guardas B

## Evidencia

Al seleccionar `CARGA-INICIAL-AYS-LAB-SANITIZADA-20260714.json`, el cargador rechazó el archivo por ocho registros de aseguradoras con `requiereValidacion=true`.

## Causa raíz

El importador trataba una alerta de calidad de aseguradora como error estructural del archivo. Además, durante el armado del lote reemplazaba el estado pendiente por `validado`.

## Corrección

- Las aseguradoras canónicas con datos pendientes ya no invalidan el archivo.
- Conservan `requiereValidacion=true`, `validationStatus=requiere_validacion` y su motivo.
- Se cargan como directorio restringido.
- Quedan deshabilitadas para vinculación, tarifas, Cotizador y Comparativo hasta validarse.
- Una cuarentena explícita o coincidencia ambigua sí bloquea el dry-run.
- El resumen diferencia `Aseguradoras pendientes` de `Bloqueos`.
- Se renovó la versión del recurso para evitar caché anterior.

## Archivos

- `orbit360-platform/modules/importar-initial-tenant-lab.js`
- `orbit360-platform/core/backend-lab-init.js`
- `tools/orbit360-test-import-initial-pending-insurers.mjs`
- `.github/workflows/orbit360-ays-lab-preview.yml`

## Validación

- Sintaxis JavaScript: PASS.
- Prueba dinámica de aseguradora pendiente: PASS.
- La advertencia permanece y las capacidades quedan restringidas: PASS.
- Prueba de cuarentena explícita: PASS; bloquea el lote.
- El archivo de datos no fue modificado.

## Commits

- `f6bbfff68c9163c2664c42b0b61dc25441c65dcc`
- `19c54e8ac08e90b959f9c367b6cf245ff3859bd3`
- `2154dfd0ace1cb87ba0ead816bfdd0d31145556d`
- `ce071180b67c025a8b7bddda88136d73ddb08a03`

## Rollback

Revertir estos commits en orden inverso únicamente ante una regresión demostrada. No modificar datos ya escritos ni otros componentes protegidos.

## Aplicación a Claude y Academia

Patrón reusable: separar `bloqueo que impide escritura` de `registro cargable con calidad pendiente y capacidades restringidas`. Academia debe explicar que una entidad pendiente puede entrar al directorio sin habilitar funciones operativas sensibles.

## Reapertura acotada — 2026-07-20

La aceptación técnica sintética no sustituye la aceptación de datos reales. Antes del Bloque 2 se debe probar desde la plataforma la carga directa de los directorios GT y CO, con diff por aseguradora, escritura controlada, lectura posterior, confirmación de accesos protegidos, auditoría, rollback y matriz final de completitud.


## Diagnóstico estático de causa raíz — 2026-07-20

Clasificación consolidada:

- `VALIDATOR_STALE`: los validadores exigían una llave temporal antigua, contenidos de Academia v1.220 y el hash de Auth anterior al cierre aceptado de M1.
- `FUNCTIONAL_DEFECT`: dos módulos persistían una preferencia visual directamente en almacenamiento del navegador. Se reemplazó por estado de sesión; no cambia datos operativos ni configuración del tenant.

Correcciones:

1. La revelación temporal continúa durante 15 segundos y elimina la llave compuesta `aseguradora|portal`.
2. Academia se valida contra v1.221 y conserva la diferencia entre fuente, dry-run, escritura, lectura posterior y recurso protegido pendiente.
3. El baseline protegido reconoce el Auth aceptado durante M1; no se modificó `core/auth.js`.
4. El orden del directorio permanece configurable durante la sesión, sin escritura directa del módulo en almacenamiento del navegador.
5. Registro, overlay, workflow y documentación avanzan juntos a contrato 1.0.1.

No se tocaron Firebase, secretos, datos LAB, reglas, producción ni el gate sintético cerrado.


## Causa raíz definitiva · cuentas bancarias protegidas — 2026-07-21

Clasificación: `SECURITY_FAILURE + DATA_CONTRACT_FAILURE + PIPELINE_MECHANISM_FAILURE`.

La carga inicial conservó 91 números bancarios completos en la colección operativa de Aseguradoras. El parser ya los separaba como recursos protegidos, pero el flujo `applySecureOnly` filtraba únicamente credenciales de portales y no existía proveedor bancario conectado. El pipeline autorreparable dependía de un segundo workflow que GitHub no disparaba desde `GITHUB_TOKEN`.

Corrección de raíz:

- un solo gate ejecuta preflight, contratos, proveedor, migración, preview y navegador;
- el mismo backend seguro admite credenciales y cuentas con referencias distintas;
- la migración idempotente crea una nueva versión de bóveda, confirma lectura y sustituye texto plano mediante batch atómico;
- el importador envía `credential` y `bank_account` en la misma confirmación protegida;
- el owner bloquea el cierre si existen cuentas y el proveedor bancario no está disponible;
- Academia y validadores distinguen fuente, escritura operativa y recurso protegido confirmado.

No se reimportan aseguradoras para resolver esta falla. No se documentan ni publican valores reales. Clasificación Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`; solo el patrón UX/metodológico se acumula como `REPLICABLE_CLAUDE_ACUMULADO`.
