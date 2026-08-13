# Diagnóstico read-only por aseguradora — incidente importador Aseguradoras

Fecha: 2026-07-21  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Issue: #7 `STOP THE LINE`  
Estado: `DIAGNOSIS_COMPLETE_SELECTIVE_RECOVERY_PENDING`

## 1. Alcance y seguridad

Este diagnóstico se ejecutó exclusivamente en modo read-only.

```txt
writesExecuted: false
migrationExecuted: false
deployExecuted: false
browserExecuted: false
reimportExecuted: false
containsPII: false
containsSecrets: false
```

El gate anterior de migración, preview e importador quedó congelado mediante `if: false`. La ejecución autorizada leyó únicamente:

- documentos de Aseguradoras en Firestore LAB;
- referencias opacas y conteos del proveedor protegido;
- versiones y registros de bóveda para comprobar cobertura, sin publicar valores;
- auditoría sanitizada relacionada con Aseguradoras.

No se revelaron contraseñas, usuarios ni números de cuenta.

## 2. Evidencia vinculante

```txt
HEAD: fc052bc8441579725c9ab705fee080e8746be864
Run: 29832367661
Job: STOP THE LINE · diagnóstico read-only del importador
Conclusion: success
Artifact: 8495824076
Digest: sha256:c3db2952964595a62267c7bea0e88047c2cb5316967aa15e3964717beb281a07
```

Todos los pasos del diagnóstico finalizaron con éxito. El job anterior de migración, preview e importador fue omitido por congelamiento.

## 3. Resultado global

### Documentos operativos

```txt
aseguradoras: 26
referencias bancarias válidas: 23
referencias bancarias inválidas: 0
cuentas pendientes backend_required: 70
valores bancarios completos en store: 0

referencias de credenciales válidas: 26
referencias de credenciales inválidas: 0
credenciales pendientes backend_required: 0
valores de credenciales completos en store: 0
```

### Bóveda protegida

```txt
versiones conservadas: 8
cuentas bancarias protegidas: 91
cuentas con valor completo disponible: 91
credenciales protegidas: 26
usuarios disponibles: 26
contraseñas disponibles: 26
```

### Diferencia

```txt
referencias bancarias de bóveda ausentes de documentos: 68
referencias de credenciales de bóveda ausentes de documentos: 0
```

Conclusión: **la bóveda no perdió información**. Las 91 cuentas y las 26 credenciales, incluidas las 26 contraseñas, permanecen disponibles en el proveedor protegido. El defecto está limitado a la proyección de referencias bancarias dentro de 13 documentos operativos de aseguradoras de Guatemala.

## 4. Distribución por país

```txt
Colombia
aseguradoras: 13
referencias bancarias válidas: 20
referencias faltantes: 0
pendientes backend_required: 0
estado: INTACTO

Guatemala
aseguradoras: 13
referencias bancarias válidas: 3
referencias faltantes: 68
pendientes backend_required: 70
estado: AFECTADO
```

No se autoriza cargar ni modificar Colombia para resolver este incidente.

## 5. Matriz sanitizada de aseguradoras GT afectadas

Los identificadores se muestran únicamente como hashes sanitizados.

| insurerHash | filas actuales | refs válidas | backend_required | registros en bóveda | refs de bóveda ausentes |
|---|---:|---:|---:|---:|---:|
| `14aebdebedc980e6` | 9 | 0 | 9 | 9 | 9 |
| `a8047f8658b8d9e2` | 10 | 0 | 9 | 9 | 9 |
| `833c87db1ea040d0` | 8 | 0 | 8 | 8 | 8 |
| `571ea239226a5859` | 11 | 2 | 9 | 9 | 7 |
| `580ce1a1751c7f1d` | 7 | 0 | 7 | 7 | 7 |
| `188c56b752b21440` | 6 | 0 | 6 | 6 | 6 |
| `7f7ab3ab9e6a06a9` | 9 | 1 | 6 | 7 | 6 |
| `2cfb68f7fdfc3743` | 4 | 0 | 4 | 4 | 4 |
| `db3f79770494cf78` | 4 | 0 | 4 | 4 | 4 |
| `bdebb19b4ab7e0a3` | 4 | 0 | 3 | 3 | 3 |
| `fa24edf133e226ce` | 3 | 0 | 2 | 2 | 2 |
| `ffff091b346583cc` | 2 | 0 | 2 | 2 | 2 |
| `4e6a53227fe3495d` | 1 | 0 | 1 | 1 | 1 |
| **Total** | **78** | **3** | **70** | **71** | **68** |

Las 20 referencias restantes pertenecen a las 13 aseguradoras de Colombia y permanecieron intactas. Las 3 referencias GT válidas explican el total global de 23.

## 6. Ventana temporal y operación asociada

Los 13 documentos GT afectados fueron actualizados entre:

```txt
2026-07-21T03:45:45.016Z
2026-07-21T03:45:46.123Z
```

Los documentos declaran:

```txt
sourceType: directorio_aseguradoras
```

Auditoría relacionada:

```txt
2026-07-21T03:45:45.118Z
credential.import
count: 13
outcome: stored

2026-07-21T03:45:48.824Z
aplicar_directorio_aseguradoras
```

La secuencia relaciona la regresión con la aplicación completa del directorio GT inmediatamente después de la importación protegida de credenciales. No corresponde atribuirla a:

- Colombia;
- la migración histórica a bóveda;
- pérdida de Secret Manager;
- Functions ausentes;
- IAM;
- timeout;
- navegador;
- parser XLSX.

## 7. Causa raíz confirmada

Clasificación:

```txt
DATA_CONTRACT_FAILURE
PIPELINE_MECHANISM_FAILURE
```

### 7.1 Orden incorrecto de escritura

`applyApproved()` escribe primero los documentos operativos de aseguradoras y solo después invoca al proveedor protegido.

### 7.2 Sustitución de referencias por estado provisional

El parser representa las cuentas sensibles detectadas como:

```txt
accountRef: backend_required
```

El merge del importador sustituye el objeto existente coincidente por el objeto incoming. Por tanto, una cuenta que ya tenía una referencia `acct_*` puede quedar nuevamente con `backend_required`.

### 7.3 Dos escritores sobre arrays completos

Después de confirmar la bóveda, el proveedor intenta volver a escribir el array completo de cuentas con las referencias definitivas. El importador y el proveedor actúan como dos escritores independientes sobre `cuentas` y `portales`.

### 7.4 Ausencia de confirmación durable

`Orbit.store.update()`:

1. actualiza la caché;
2. inicia `Firestore.set(..., { merge:true })`;
3. no devuelve una promesa esperable;
4. no espera confirmación remota;
5. no realiza read-after-write;
6. retorna inmediatamente el objeto local.

Así, dos escrituras de arrays completos pueden competir y una escritura tardía puede dejar el estado provisional.

### 7.5 Éxito falso

Si el proveedor protegido falla, `applyApproved()` convierte el fallo en `secureStatus = backend_error`, pero devuelve de todas formas:

```txt
ok: true
```

Esto permite mostrar éxito aun cuando la vinculación protegida no haya quedado completa y durable.

## 8. Conclusiones funcionales

1. Las contraseñas no se perdieron.
2. Las 26 credenciales están vinculadas y disponibles para revelado/copia autorizados.
3. Las 91 cuentas completas permanecen en bóveda.
4. No se necesita reimportar directorios.
5. No se necesita reconstruir las 26 aseguradoras.
6. No se necesita redeploy de Functions.
7. No se debe tocar Colombia.
8. La reparación puede ser selectiva, determinística y sin valores completos en el store.

## 9. Única acción autorizada siguiente

Estado:

```txt
SELECTIVE_REFERENCE_RECOVERY_PREPARATION
```

Secuencia obligatoria:

1. generar backup sanitizado de los 13 documentos GT afectados;
2. preparar plan dry-run de restauración para exactamente 68 referencias;
3. emparejar por `insurerId + accountId` contra la bóveda vigente;
4. preservar todos los campos actuales de cada cuenta;
5. reemplazar únicamente `backend_required` por la referencia `acct_*` correspondiente;
6. no agregar, borrar, reordenar ni duplicar cuentas;
7. no modificar contactos, links, teléfonos, portales, credenciales, facturación, ramos o conocimiento;
8. validar que el plan proponga 68 cambios y cero bloqueos;
9. ejecutar una sola escritura atómica después del backup;
10. realizar read-after-write y rollback verificable.

No se autoriza todavía la escritura. Primero debe existir evidencia sanitizada del backup y del dry-run exacto.

## 10. Corrección estructural posterior

Antes del gate final de M1, el importador deberá tener un único coordinador transaccional:

```txt
dry-run
→ proveedor protegido
→ mappings confirmados
→ merge por identidad estable
→ escritura durable esperada
→ read-after-write
→ auditoría
→ resultado final
```

Condiciones mínimas:

- fail-closed;
- cero `ok:true` si el proveedor falla;
- no sustituir referencias válidas por `backend_required`;
- no escribir arrays completos desde dos owners;
- merge de campo y recurso por identidad estable;
- una sola confirmación operativa;
- segunda dry-run con cero cambios;
- rollback completo.

## 11. Claude y Academia

```txt
REPLICABLE_CLAUDE_INMEDIATO
- importador inteligente con merge no destructivo
- estados honestos
- proveedor antes de persistencia
- resultado fail-closed

ACADEMIA_ACTUALIZAR
- diferencia entre dato sensible y referencia opaca
- diferencia entre defecto funcional, contrato de datos y validador obsoleto
- recuperación selectiva y trazabilidad

BACKEND_PROTEGIDO_NO_CLAUDE
- Functions
- Secret Manager
- IAM
- scripts de recuperación
- reglas y credenciales
```

## 12. Estado de M1

```txt
M1 funcional: preservado
Diagnóstico del incidente: cerrado
Datos completos en bóveda: confirmados
Credenciales/contraseñas: confirmadas
Recuperación selectiva de 68 referencias: pendiente
Corrección estructural del importador: pendiente
Gate final único: pendiente
Revisión visual única: pendiente
```
