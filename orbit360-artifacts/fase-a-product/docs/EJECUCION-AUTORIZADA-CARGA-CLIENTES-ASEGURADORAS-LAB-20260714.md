# Ejecución autorizada — carga controlada Clientes + Aseguradoras A&S LAB

Fecha: 2026-07-14  
Carril: C — datos reales/migración operativa  
Tenant: `alianzas-soluciones`  
Rama de referencia: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy

## Autorización explícita

Paula autorizó preparar y ejecutar una carga controlada en Firebase LAB, limitada a Clientes y Aseguradoras, con lectura previa, backup, dry-run, diff, auditoría y rollback.

Queda expresamente excluido:

- producción;
- deploy;
- pólizas;
- cobros;
- `finmovs`;
- histórico financiero;
- secretos en código o repositorio.

## Paquete local protegido

```txt
ORBIT360-CARGA-CONTROLADA-AYS-LAB-CLIENTES-ASEGURADORAS-20260714.zip
SHA-256: 6b2f20591cedbdea79ae9fcf16dcac1696cb7a08b6c91ae6825c910e152784b4
```

El paquete contiene datos reales y no se incorpora al repositorio. Debe permanecer únicamente en un equipo autorizado.

## Payload validado

```txt
Clientes fuente: 440
Clientes candidatos a escritura: 414
Clientes retenidos por duplicados/validación: 26
Asignaciones temporales a Paula: 30
Estado inicial: pendiente_polizas

Aseguradoras canónicas GT: 13
Aseguradoras canónicas CO: 13
Total aseguradoras candidatas: 26
Fuentes omitidas/cuarentena: Óle, Synergias como aliado y hoja Chubb contaminada según su dominio
```

## Tratamiento de seguridad

- Los valores de usuario y contraseña de los directorios fueron excluidos.
- Los portales conservan únicamente `credentialRef` y estado `backend_required`.
- Las cuentas bancarias operativas se conservan separadas de credenciales.
- El flujo no imprime configuraciones ni credenciales locales.
- El repo original se preserva mediante worktree temporal del HEAD remoto.

## Flujo ejecutable

1. Validar paquete, Git, Node y npm.
2. Crear worktree aislado de la rama obligatoria.
3. Copiar configuración local LAB ignorada por Git.
4. Resolver credencial administrativa local sin imprimirla.
5. Preparar `firebase-admin` fuera del repo.
6. Leer `asesores`, `clientes` y `aseguradoras` del LAB.
7. Crear backup y rollback local.
8. Resolver IDs reales de asesores por nombre normalizado.
9. Calcular diff crear/actualizar/bloquear.
10. Bloquear si hay asesores faltantes o coincidencias ambiguas.
11. Escribir solo `clientes` y `aseguradoras` en `tenantId/alianzas-soluciones/...`.
12. Registrar `auditLog` e `importBatches`.
13. Verificar por `batchId`.
14. Abrir Orbit 360 en modo `firestore-lab` para validación con datos A&S.

## Estado honesto

El paquete fue generado y validado estáticamente fuera del repositorio. La escritura remota solo ocurre al ejecutar el bloque local en el computador autorizado, donde existen la configuración y credencial LAB.

## Siguiente fuente

Después de validar Clientes y Aseguradoras en Orbit 360, la siguiente fuente separada es Pólizas. No se inferirán pólizas, cartera ni cobros desde movimientos financieros.
