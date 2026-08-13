# Cierre de causa raíz — Importadores E2E, membresía canónica y 403 del proveedor

Fecha: 2026-07-20  
Bloque: 1 — Cliente 360 + Aseguradoras  
Gate: `importers-e2e-acceptance-lab-v20260720`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## 1. Evidencia de la revisión v3

La revisión v3 corrigió el bloqueo previo del acuerdo legal sin saltarse la interfaz real.

Resultado comprobado:

```txt
browserAuthReady: true
activeRoleResolved: true
legalGateSatisfied: true
sourceParsed: true
operaciones detectadas: 1
referencias detectadas: 1
dryRunProduced: true
targetIdsResolved: true
providerInvoked: true
providerStatus: 403
providerErrorCode: PERMISSION_DENIED
rollbackOk: true
conteos restaurados: 414 clientes / 26 aseguradoras / 7 asesores
```

Por tanto, el archivo, el parser, el mapeo de destino y el ciclo legal ya no son el primer fallo real.

## 2. Clasificación

```txt
DATA_CONTRACT_FAILURE
```

No se clasifica como fallo del Excel ni como contraseña incorrecta.

El frontend LAB autentica la cuenta canónica y la representa con rol `Dirección`. El proveedor seguro valida además la membresía backend en:

```txt
tenants/{tenantId}/members/{uid}
```

La verificación LAB anterior solo comprobaba:

- existencia de la membresía;
- tenant correcto;
- estado `active`.

No comprobaba los campos exigidos por el contrato multirol y por el proveedor seguro:

- `roles[]`;
- `defaultRole`;
- `activeRole`;
- `countries[]`;
- `dataScopes`;
- `advisorId` cuando existe rol Asesor.

Una membresía puede estar activa y, al mismo tiempo, ser insuficiente para autorizar una acción sensible. El backend hizo lo correcto al rechazarla.

## 3. Causa raíz

> La sesión visual y la membresía backend no estaban reconciliadas bajo un contrato canónico único. El gate comprobaba autenticación y estado activo, pero no la asignación efectiva del rol que el proveedor debía autorizar.

Esto explica por qué:

- la plataforma permitía entrar;
- el importador llegaba al dry-run;
- el proveedor era invocado;
- la escritura segura no ocurría;
- las referencias de credenciales no aparecían en las fichas.

## 4. Corrección aplicada

Se agregó el bootstrap idempotente LAB:

```txt
tools/orbit360-ensure-lab-secure-membership-v20260720.mjs
```

La corrección:

1. se bloquea fuera del proyecto `ays-orbit-360-lab`;
2. valida que el asesor canónico exista y esté activo;
3. normaliza la membresía de la cuenta LAB;
4. asigna roles, rol predeterminado, rol activo, países, scopes y vínculo de asesor;
5. no guarda contraseñas, tokens ni valores de credenciales;
6. registra motivo y confirmación reforzada;
7. conserva auditoría antes/después;
8. documenta la fuente de rollback;
9. vuelve a leer y valida el estado canónico;
10. no toca Clientes, Aseguradoras reales, Pólizas, Cobros ni producción.

El runner ejecuta esta validación antes de crear la aseguradora sintética y antes de abrir el navegador.

## 5. Seguridad de credenciales

La corrección no hace públicas las contraseñas ni las guarda en `Orbit.store`.

El comportamiento esperado se mantiene:

```txt
archivo fuente -> proveedor seguro -> bóveda -> credentialRef opaca en la ficha
```

Solo un usuario autenticado, perteneciente al tenant y con rol autorizado puede revelar o copiar el valor mediante el proveedor seguro. La ficha operativa nunca conserva el valor en texto plano.

## 6. Academia y patrón reusable

Clasificación:

```txt
REPLICABLE_CLAUDE_ACUMULADO
ACADEMIA_ACTUALIZAR
BACKEND_PROTEGIDO_NO_CLAUDE
```

Patrón reusable para Claude:

- la UI no debe considerar suficiente un rol visual;
- una acción sensible requiere rol activo contenido en los roles asignados;
- los estados de acceso deben ser honestos;
- un `403` posterior al dry-run no se corrige cambiando el archivo ni reimportando datos.

No se comparte con Claude:

- UID LAB;
- email LAB;
- rutas de bóveda;
- implementación del proveedor;
- reglas internas de autorización;
- secretos o valores reales.

Academia v1.227 agrega:

- membresía canónica;
- diferencia entre rol visual y rol autorizado;
- clasificación `DATA_CONTRACT_FAILURE`;
- prohibición de repetir el gate sin corregir la causa.

## 7. Regla de ejecución

La revisión v4 puede ejecutarse una sola vez después de:

```txt
GO_GATE_CONTRACT
```

Aceptación exclusiva:

```txt
ok: true
membership canónica
legalGateSatisfied: true
providerInvoked: true
remoteConfirmation: true
storeWriteObserved u opaqueReferenceObserved: true
readAfterWriteOk: true
auditSuccessObserved: true
auditFailureObserved: true
plaintextSecretsInOperationalStore: false
rollbackOk: true
```

Si vuelve a fallar en `provider_invoked`, se detienen los reintentos y se abre diagnóstico específico del proveedor. No se crea otro parche ni se modifica otro módulo.

## 8. Lo que todavía no demuestra el gate sintético

Un PASS sintético demostrará que el circuito técnico puede:

- guardar una credencial en bóveda;
- escribir una referencia opaca;
- releerla;
- auditar éxito y rechazo;
- revertir la prueba.

No significará que las credenciales reales de las 26 aseguradoras ya fueron cargadas. Ese paso posterior debe ser una importación controlada de referencias seguras sobre los portales existentes, sin volver a crear ni reimportar las aseguradoras.

## 9. Siguiente acción exacta

```txt
1. Ejecutar preflight vinculante del mismo gate.
2. Ejecutar la revisión v4 una sola vez.
3. Aceptar únicamente evidencia sanitizada ok:true.
4. Si pasa, preparar la aplicación controlada de credenciales reales sin reimportar aseguradoras.
5. No avanzar a Pólizas ni Cobros antes del cierre de M1.
```
