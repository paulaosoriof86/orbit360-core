# Cierre de causa raíz — Membresía con prefijos y diagnóstico IAM obsoleto

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate principal: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Evidencia vinculante

```txt
run diagnóstico: 29776929727
artefacto: 8475007274
HEAD evaluado: 175e77b7b4c493a01540c7a5959b96dc0d1c947d
modo: read_only
```

El diagnóstico terminó correctamente, no abrió el importador, no invocó el proveedor y no escribió datos operativos.

## Causa raíz primaria

Clasificación:

```txt
DATA_CONTRACT_FAILURE
MEMBERSHIP_ROLE_PREFIX_INDEX_CORRUPTION
```

La membresía existe, está activa, pertenece al tenant correcto, coincide con la identidad esperada y tiene asesor enlazado. Sin embargo:

```txt
activeRole: direccion
activeRoleAssigned: false
importRoleAllowed: true
```

El arreglo efectivo de roles no contiene roles canónicos. Contiene prefijos de búsqueda o índices parciales como `d`, `di`, `dir`, `dire`, `ope` y `supe`. Por tanto, el rol activo `direccion` no puede encontrarse dentro de los roles asignados y el proveedor debe rechazar la operación.

No es un defecto del Excel, del parser, de la contraseña, del portal, del target ni de la bóveda.

## Causa secundaria del diagnóstico

Clasificación:

```txt
VALIDATOR_STALE
IAM_GET_POLICY_HTTP_METHOD
```

Las consultas read-only de IAM devolvieron `404`, pero el diagnóstico llamaba:

```txt
functions.getIamPolicy
run.services.getIamPolicy
```

mediante `POST`. En Cloud Functions v2 y Cloud Run v2, `getIamPolicy` utiliza `GET` con cuerpo vacío. Por tanto, esos `404` no prueban ausencia de `roles/run.invoker` y no pueden utilizarse todavía para cambiar IAM.

## Corrección autorizada

### Membresía LAB

Ejecutar una sola vez el bootstrap idempotente existente:

```txt
tools/orbit360-ensure-lab-secure-membership-v20260720.mjs
```

Debe:

- limitarse al proyecto `ays-orbit-360-lab` y tenant `alianzas-soluciones`;
- reemplazar prefijos por roles canónicos completos;
- conservar `Dirección` como rol activo y predeterminado;
- validar países, scopes y asesor;
- registrar motivo, antes/después, hashes y confirmación `CONFIRMO AMPLIAR ACCESO`;
- no guardar contraseñas, tokens ni valores de credenciales;
- no tocar Clientes, Aseguradoras, Pólizas, Cobros ni fuentes reales.

### Diagnóstico IAM

Corregir exclusivamente `getIamPolicy` para utilizar `GET`. Después de reparar la membresía, ejecutar otra vez el diagnóstico read-only y clasificar:

1. membresía aún inválida → detener sin repetir;
2. membresía válida e ingreso callable inválido → `ENVIRONMENT_FAILURE_CALLABLE_INVOKER`;
3. membresía, función e ingreso válidos → diagnóstico más profundo del handler, sin modificar datos;
4. no cambiar IAM a partir de los `404` producidos por el método HTTP obsoleto.

## Regla de ejecución

El flujo de reparación y verificación puede ejecutarse una sola vez. Debe aplicar primero el preflight contractual y resolver secretos únicamente después del GO.

Aceptación del bloque:

```txt
membershipEvidence.ok: true
activeRoleAssigned: true
rolesAssigned: true
scopeAll: true
advisorLinked: true
noSensitiveFields: true
diagnostic.membershipAuthorizationWouldPass: true
functionActive: true
runtimeServiceAccountMatches: true
rollbackDocumented: true cuando hubo cambio
```

El resultado de IAM se utiliza solo después de corregir el método `GET`.

## Restricciones

- Gate integral de importadores congelado durante esta reparación.
- No reimportar Clientes ni Aseguradoras.
- No cargar credenciales reales.
- No invocar el proveedor.
- No avanzar a Pólizas, Vehículos, Cobros o Comisiones.
- No merge, `main`, producción, DNS ni deploy productivo.

## Carriles

- A · Frontend/UX/Academia: enseñar diferencia entre rol canónico y prefijos de búsqueda.
- B · Backend/seguridad: reparar membresía LAB y validar IAM con el método correcto.
- C · Datos reales: sin cargas ni cambios; conteos preservados.

## Claude y Academia

```txt
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

Patrón reusable: nunca usar tokens de búsqueda, abreviaturas o prefijos como fuente de autorización. Los roles autorizables deben provenir exclusivamente del arreglo canónico de roles asignados. Un diagnóstico de IAM debe distinguir una política ausente de una llamada API mal construida.

## Siguiente acción exacta

```txt
1. Corregir GET en el diagnóstico IAM.
2. Ejecutar una sola reparación idempotente de membresía LAB.
3. Releer y validar la membresía.
4. Ejecutar diagnóstico read-only corregido.
5. Publicar evidencia sanitizada en PR #5.
6. No reactivar el gate integral hasta obtener membresía autorizable.
```
