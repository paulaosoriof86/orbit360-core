# ADDENDUM MAESTRO — DIRECTORIO OPERATIVO: USUARIOS, CONTRASEÑAS Y CUENTAS

**Fecha:** 2026-07-22  
**Proyecto:** Orbit 360 — Alianzas y Soluciones  
**Repositorio:** `paulaosoriof86/orbit360-core`  
**Rama obligatoria:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft/open  
**Gate:** `block1-client360-insurers-lab-v20260717`

## 0. Carácter vinculante

Este addendum restablece y endurece la corrección canónica del 13 de julio de 2026 sobre cuentas bancarias de aseguradoras.

Para la clasificación y visualización de usuarios de portal, contraseñas y cuentas bancarias, este documento prevalece sobre cualquier documento, overlay, Academia, importador, proveedor, validador o evidencia posterior que haya tratado los tres campos como recursos protegidos equivalentes.

Quedan expresamente invalidadas, para decisiones futuras, las reglas que exijan:

- cero números bancarios completos en el directorio operativo;
- `accountRef` como requisito para mostrar o copiar una cuenta;
- revelado temporal obligatorio de números bancarios;
- ocultamiento o eliminación del usuario del portal;
- almacenamiento exclusivo de usuarios y números en bóveda;
- las expresiones «Cuenta protegida» o «Usuario protegido» como estado normal de un registro disponible.

Los documentos históricos de 2026-07-20 y 2026-07-21 se conservan como evidencia del incidente, pero sus conclusiones de clasificación quedan sustituidas por este addendum.

## 1. Clasificación canónica de campos

### Usuario del portal

Es un dato operativo del directorio.

Debe:

- permanecer visible para todo rol autorizado a consultar las credenciales de ese portal;
- persistirse en el registro operativo del portal;
- poder copiarse junto con la contraseña cuando el rol tenga permiso;
- mostrar «Sin usuario registrado» únicamente cuando la fuente y la bóveda realmente no contengan usuario.

No debe:

- sustituirse por «Usuario protegido»;
- sustituirse por «Usuario pendiente de registrar» cuando ya existe en la bóveda o en la fuente confirmada;
- depender de revelado temporal;
- eliminarse del directorio después de confirmar la importación.

### Contraseña del portal

Es el único campo secreto de acceso en este alcance.

Debe:

- permanecer en el proveedor seguro;
- conservar `credentialRef`;
- revelarse temporalmente únicamente con rol y sesión autorizados;
- volver al estado «Oculta» después del tiempo definido;
- no persistirse como texto en el directorio, Store, evidencia, logs o documentos.

### Número de cuenta bancaria

Es un dato operativo del directorio de aseguradoras, no una contraseña, token o credencial.

Debe:

- persistirse en `cuentas[].numero` o su alias canónico;
- mostrarse completo de forma predeterminada a todo usuario con acceso de lectura al módulo Aseguradoras, incluido Asesor;
- copiarse directamente con banco, tipo, número, moneda y titular;
- permanecer separado del permiso de crear, editar o eliminar cuentas;
- conservar opcionalmente `accountRef` como respaldo, trazabilidad y rollback, pero nunca como condición de visualización.

Puede ofrecerse una acción local para ocultar el número en pantalla, pero el estado inicial y canónico es visible.

## 2. Causa raíz del incidente

La política correcta del 13 de julio fue anulada por una cadena posterior que:

1. reclasificó los números bancarios completos como `SECURITY_FAILURE`;
2. migró 91 números desde el directorio a Secret Manager;
3. eliminó `numero` y `accountNumber` de los registros operativos;
4. conservó solo `accountRef` y máscara;
5. aplicó el mismo tratamiento al usuario y a la contraseña del portal;
6. configuró el owner visual para revelar temporalmente las cuentas;
7. configuró el gate para exigir cero valores bancarios completos en almacenamiento operativo;
8. aprobó mediante validadores la semántica equivocada.

Además, 68 referencias recuperadas quedaron asociadas a filas con un identificador operativo distinto del identificador histórico conservado en la bóveda. La Function exige igualdad entre ambos IDs y por eso devuelve «No fue posible recuperar el dato» aunque la referencia y el número existan.

Clasificación definitiva:

```text
DATA_CONTRACT_FAILURE
FUNCTIONAL_DEFECT
VALIDATOR_STALE
```

La clasificación `SECURITY_FAILURE` aplicada a usuarios y números bancarios queda retirada. Sigue siendo válida únicamente para contraseñas, tokens y secretos reales.

## 3. Reparación selectiva obligatoria

La reparación no es una reimportación de Aseguradoras.

Debe:

- leer los 26 documentos actuales y la bóveda existente;
- emparejar cuentas por `accountRef` + aseguradora;
- emparejar portales por `credentialRef` + aseguradora;
- proponer en dry-run únicamente `cuentas[].numero` y `portales[].usuario`;
- conservar IDs, orden, contactos, enlaces, teléfonos, países, monedas, trazabilidad, credenciales y contraseñas;
- no crear ni eliminar aseguradoras, cuentas o portales;
- no tocar Clientes, Pólizas, Cobros, Finanzas ni otros módulos;
- aplicar una sola transacción controlada con read-after-write;
- disponer de rollback exacto;
- producir evidencia sanitizada sin valores, nombres, usuarios, contraseñas ni números.

Las dos cuentas realmente pendientes permanecen como «Pendiente de registrar».

## 4. Importador futuro

Después de la confirmación remota:

- el importador canónico escribe el usuario en el portal operativo;
- escribe el número completo en la cuenta operativa;
- envía únicamente la contraseña al tratamiento secreto obligatorio;
- puede conservar usuario y número en la bóveda como respaldo heredado, pero no debe borrarlos del directorio;
- el bridge puede seguir impidiendo escrituras del proveedor; el owner de la escritura operativa es el importador canónico con diff, confirmación, lectura posterior y rollback.

## 5. Owner visual

La ficha de Aseguradoras debe cumplir:

```text
usuario: visible
contraseña: Oculta → revelado temporal
cuenta bancaria: visible
copiar cuenta: directo, sin proveedor ni revelado previo
campo Uso: no visible y no copiado
titular: fallback a nombre de aseguradora
```

Quedan prohibidos en el owner canónico:

```text
Cuenta protegida
data-m1-bank-reveal
fieldType:'bank_account'
revealBankAccount(...)
Usuario protegido
Usuario pendiente de registrar cuando existe valor confirmado
```

## 6. Gate y validadores

El gate debe fallar si encuentra cualquiera de estas regresiones:

- eliminación de `numero` o `accountNumber` después de una importación confirmada;
- eliminación del usuario después de confirmar la credencial;
- número bancario dependiente de `accountRef` o Secret Manager para mostrarse o copiarse;
- validador que exija cero números bancarios completos en el directorio;
- Academia que enseñe que la cuenta bancaria es una credencial secreta;
- owner visual con revelado temporal de cuentas;
- copia que dependa de una Function bancaria.

Predicado de aceptación de M1:

```text
414 clientes
26 aseguradoras
7 asesores
91 cuentas operativas restituidas
2 cuentas pendientes honestas
usuarios disponibles restituidos según bóveda
0 contraseñas en directorio
0 filas creadas/eliminadas/reordenadas
copy bancario directo
password reveal temporal
Hosting LAB exacto
revisión humana aprobada
```

## 7. Control del mecanismo de reparación

Los intentos de dry-run `29968658125` y `29968906716`, y los intentos de reparación estática `29969478259` y `29969765220`, fallaron antes de acceder a datos. En todos ellos:

```text
Firestore read: false
Vault read: false
Operational writes: false
Product commit created: false
```

La causa no fue el contrato operativo ni los datos. Fue el mecanismo de pipeline: el workflow intentaba construir la corrección mediante un transformador monolítico que mezclaba owners, importadores, proveedores, Academia, overlays y validadores, y dependía de conteos literales exactos.

Se confirmaron dos ejemplos:

- buscó en `index.html` una referencia de caché cuyo owner real es el bootstrap del router;
- consideró error que Academia tuviera dos apariciones válidas de `contentVersion:'1.228'`.

Regla vinculante:

> El workflow no puede construir, transformar ni parchear el producto. El cambio completo debe existir previamente como commit atómico directo y auditarse como conjunto. El workflow solo valida el commit ya construido y produce evidencia.

Quedan retirados como mecanismos de ejecución:

```text
tools/orbit360-aplicar-correccion-directorio-operativo-v20260722.mjs
tools/orbit360-reparar-directorio-operativo-estructural-v20260722.mjs
tools/orbit360-reparar-directorio-operativo-estructural-v2-v20260722.mjs
```

No se autoriza una tercera solicitud estática ni otro transformador. La siguiente etapa es preparar, sin ejecución, el patch atómico completo 1.0.38 y auditar todos sus archivos finales antes de crear cualquier request.

## 8. Restricciones

Continúan prohibidos:

- reimportar Clientes o Aseguradoras para resolver este defecto;
- desplegar Functions o Rules;
- tocar producción, `main` o merge;
- publicar valores en evidencia;
- volver a acceder a datos antes de disponer del patch atómico completo;
- avanzar a M2 antes de aprobación visual humana.

## 9. Claude y Academia

**Claude:** `REPLICABLE_CLAUDE_ACUMULADO` únicamente para la semántica reusable de directorio operativo. No recibe valores, bóveda, Functions, IAM ni datos reales.

**Academia:** debe enseñar que usuario y número bancario son datos operativos; la contraseña es el secreto. También debe explicar la diferencia entre protección de edición, visibilidad operativa y tratamiento de secretos, y que un workflow valida un patch ya construido en lugar de fabricarlo mediante sustituciones literales durante la ejecución.
