# AUDITORÍA FORENSE Y EMPALME SELECTIVO — CANDIDATA CLAUDE v1.188–v1.197

Fecha: 2026-07-11  
Candidata: `Prototype Development Request - 2026-07-11T093254.494.zip`  
SHA256: `8ea0fd79eb80bf8b9da2601e17f4922292087e297773bebfe9530e4745aab1a0`  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, deploy ni producción.

## Decisión

La candidata es la fuente visual incremental más reciente, pero no puede copiarse completa sobre la rama viva.

```txt
baseline vivo =
rama activa y backend protegido
+ motor _fuentes vigente
+ hotfixes aceptados
+ mejoras aprobadas v1.188–v1.197
+ contratos de recursos seguros
+ documentación acumulada
```

Se adopta mediante empalme selectivo, no como ZIP bruto.

## Integridad

- 102 archivos.
- 2 nuevos frente a v1.187: `core/credential-vault.js`, `core/document-viewer.js`.
- 10 modificados frente a v1.187.
- 0 eliminados.
- Sin traversal, symlinks ni cifrado.
- JS/MJS con sintaxis válida.
- Protegidos de Claude sin cambios frente a su candidata anterior, pero desactualizados frente al backend vivo.

## Avances aceptados

- órbita compacta en login móvil;
- responsive mejorado;
- KPI de Aseguradoras con detalle;
- deep-link de ficha;
- limpieza parcial de copy;
- visor documental inicial;
- datos sensibles enmascarados;
- Academia con metadatos;
- correcciones en Notificaciones, Cliente 360 y Automatizaciones;
- patrones `documentRef` y `credentialRef`.

## No se copiaron completos

### `index.html`

El ZIP no carga backend LAB, store Firestore LAB ni hotfix Portal y reintroduce sidebar por `localStorage`. El empalme conserva loader/init/store/Auth/importador/Portal y agrega solo componentes aprobados.

### `modules/aseguradoras.js`

No se reemplaza porque la rama viva tiene un contrato `_fuentes` más profundo: tipos diferenciados, once dimensiones, tarifas, reglas, presentación, Comparativo, condiciones, casos de prueba y compatibilidad legacy. La UX nueva se monta mediante bridge y conserva `base._fuentes`.

### Protegidos

No se sustituyeron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
tools backend existentes
```

## Empalme realizado

Nuevos archivos:

```txt
core/backend-resource-contracts.js
core/document-viewer.js
core/credential-vault.js
modules/aseguradoras-v1197-ux-bridge.js
data/academia-v1197-bridge.js
styles/v1197-empalme.css
tools/orbit360-validar-recursos-seguros-v1197.mjs
```

`index.html` se actualizó aditivamente preservando backend LAB, `Orbit.store`, Auth, importador y hotfix Portal.

Aseguradoras incorpora directorio limpio, filtros, cinco KPI con detalle, ficha principal navegable, tabs, visibilidad por rol activo, cuentas enmascaradas/revelables según permiso, copia de usuario, credencial por referencia, visor documental y conservación del motor `_fuentes`.

Academia incorpora rutas para Dirección, Operativo y Asesor.

## Pendientes Carril A

1. Editor completo de Aseguradoras todavía delegado al editor/modal base.
2. Convertir también la edición en página.
3. Auditoría de KPI transversal pendiente.
4. Conectar el visor en todos los módulos.
5. Copy técnico restante.
6. Evidencia responsive real.
7. Consolidar README/CHANGELOG/manifiestos.
8. Alta transaccional final de aseguradora.
9. Retirar borrado físico del flujo normal.
10. Estados vacíos y drill detallado en todos los KPI.
11. Academia por módulo al incorporar puentes restantes.

## Pendientes Carril B

1. Bóveda real.
2. Reautenticación.
3. TTL y limpieza de secreto.
4. Auditoría durable.
5. Tenant/rol/scope.
6. Drive OAuth, Picker y Shared Drives.
7. Resolver `documentRef`.
8. Preview/download/export temporal.
9. Visibilidad documental.
10. Migrar configuración IA fuera de `localStorage`.
11. Validadores y smoke real.
12. Reconciliar guard de seguridad en el flujo local.
13. Resolver CI P0.9 sin abrir nuevas fases preparatorias.

## Pendientes Carril C

- dry-run directorios GT/CO;
- importación sanitizada de aseguradoras;
- datos sensibles reales solo después de seguridad B;
- pólizas como siguiente fuente tras clientes;
- documentos por referencia;
- tarifas/cotizadores separados;
- movimientos como financiero histórico;
- cobros separados de finmovs;
- trazabilidad completa y validación humana.

## Estado

```txt
CARRIL_A: EMPALMADO_SELECTIVAMENTE_CON_PENDIENTES
CARRIL_B: RETOMADO_CON_CONTRATOS_DE_RECURSOS_SEGUROS
CARRIL_C: PENDIENTE_SEPARADO
BASELINE: RAMA_VIVA + EMPALME_V1197
DEPLOY: NO
MERGE: NO
PRODUCCIÓN: NO
```
