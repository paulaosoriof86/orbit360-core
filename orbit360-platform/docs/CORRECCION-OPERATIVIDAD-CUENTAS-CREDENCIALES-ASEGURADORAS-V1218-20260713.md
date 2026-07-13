# Corrección de operatividad — Cuentas y credenciales en Aseguradoras v1.218

Fecha: 2026-07-13  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
Carriles: A/B/C

## Corrección funcional

La interpretación anterior trató cuentas bancarias y contraseñas con la misma restricción visual. Eso era incorrecto para el directorio operativo.

Regla aprobada:

```txt
Cuentas bancarias:
  visibles y copiables para todo usuario que pueda consultar Aseguradoras.

Usuarios y contraseñas de portales:
  visibles y copiables para Dirección, SuperAdmin, AdminTenant, Admin y Operativo.
  Asesor no los ve salvo permiso extra explícito.
```

Las restricciones configuradas para una identidad siguen prevaleciendo.

## Diferencia entre almacenamiento y visibilidad

Que un valor se guarde mediante proveedor seguro no significa que deba ocultarse al usuario operativo autorizado.

```txt
Cuenta bancaria:
  almacenamiento protegido o legacy transitorio
  visibilidad = todos los usuarios del directorio

Credencial de portal:
  almacenamiento protegido o legacy transitorio
  visibilidad = administrativos y operativos
```

No se exponen secretos en logs, documentación, seed nuevo o parámetros visibles.

## Migración no destructiva

Se eliminó el comportamiento que podía retirar un valor antiguo al abrir el editor antes de verificar su traslado.

Nuevo orden:

1. detectar valor legacy;
2. mantenerlo operativo según permisos;
3. marcar pendiente de migración;
4. copiarlo al proveedor seguro;
5. comprobar lectura/copia desde el proveedor;
6. retirar el valor anterior únicamente después de confirmación;
7. auditar antes/después y resultado.

Estado utilizado:

```txt
pendiente_migracion_segura_no_destructiva
```

La auditoría declara honestamente:

```txt
rawPersisted = true
migrationPerformed = false
destructive = false
```

hasta completar la migración.

## Implementación

### Política central

```txt
core/aseguradoras-op2-operational-access-policy.js
```

Define:

```txt
operational_all_viewers
administrative_operational
```

Y transmite al proveedor seguro contexto de módulo, entidad, rol y permiso.

### Recursos operativos

```txt
modules/aseguradoras-op2-operational-resources.js
```

Cuentas:

- número completo visible automáticamente;
- copiar cuenta;
- banco, tipo, moneda, titular y uso;
- acceso a medio de pago;
- funciona con `accountRef` o valor legacy mientras migra.

Credenciales:

- Dirección/Admin/Operativo ve usuario y contraseña;
- puede copiar usuario y contraseña;
- revelado de contraseña por 15 segundos;
- Asesor ve plataforma/estado, no credenciales;
- funciona con `credentialRef` o valor legacy mientras migra.

### Cierre no destructivo

```txt
modules/aseguradoras-op2-closure-bridge.js
```

- nuevas capturas se convierten en referencias;
- valores anteriores no se eliminan anticipadamente;
- editor dirige a las pestañas operativas;
- no existe auditoría falsa de migración o guardado.

### Academia

```txt
data/academia-v1217-aseguradoras-op2.js
```

Actualiza los mismos cursos existentes a `_cv = 1218`, conserva progreso/certificados y enseña la nueva política.

### Pipeline y pruebas

```txt
tools/orbit360-aplicar-cachebust-cotizador-comparativo-v1215.ps1
tools/orbit360-validar-aseguradoras-op2.mjs
tools/orbit360-smoke-visual-aseguradoras-op2.mjs
tools/orbit360-run-operacion-op1-op2-visual.ps1
.github/workflows/orbit360-aseguradoras-op2-smoke.yml
```

La matriz visual usa proveedores y datos ficticios en memoria:

```txt
Dirección: cuenta + usuario + contraseña
Operativo: cuenta + usuario + contraseña
Asesor: cuenta completa; sin usuario/contraseña
```

## Datos y backend

No se modificaron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
```

No se ejecutó:

```txt
dry-run real GT/CO
escritura de datos reales
deploy
merge
main
```

## Estado

```txt
Política corregida: SÍ
Código: IMPLEMENTADO
Academia: ACTUALIZADA
Claude: DOCUMENTADO
Validador/CI: CONFIGURADOS
Gate visual local: PENDIENTE DE EJECUCIÓN
Dry-run real: PENDIENTE DESPUÉS DEL GATE
```
