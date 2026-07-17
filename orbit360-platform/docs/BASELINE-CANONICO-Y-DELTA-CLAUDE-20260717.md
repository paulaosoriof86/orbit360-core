# Baseline canónico y delta Claude — 2026-07-17

Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Carriles: A (prototipo/UX/Academia), B (backend protegido), C (datos A&S)

## 1. Insumo nuevo auditado

```txt
Prototype Development Request - 2026-07-17T001643.602.zip
SHA-256: abb6bbe417e5d9a2172adfe1b4852045dd3579abf49a495ec4ef82ad81da34d4
Archivos: 109
Versión funcional declarada por CHANGELOG: v1.255
```

Comparación contra la candidata frontend canónica anterior:

```txt
Prototype Development Request - 2026-07-13T145159.387.zip
archivos anteriores: 104
idénticos: 72
modificados: 24
agregados: 13
retirados/reubicados: 8
```

Validación estática del ZIP nuevo:

```txt
JavaScript revisado: 58 archivos
node --check: 0 errores
referencias locales desde index.html: 58
referencias faltantes: 0
```

## 2. Decisión de baseline

El ZIP 2026-07-17 es la **última candidata Claude a auditar e integrar**, pero todavía no sustituye directamente la rama viva.

La composición segura es:

```txt
frontend propietario de la candidata nueva
+ backend protegido de la rama
+ contratos/proyecciones A&S todavía necesarios
- overlays/bridges cuyo fix ya quedó incorporado en el propietario
```

No se hará copia completa del ZIP ni reemplazo de carpetas.

## 3. Archivos protegidos

Los siguientes archivos del ZIP son byte-idénticos a la candidata frontend anterior, pero no se copiarán sobre la rama porque la rama contiene la implementación protegida LAB/productiva:

```txt
data/store.js
core/auth.js
core/importa.js
```

También se preservan:

```txt
data/store-firestore-lab.local.js
core/backend-lab-*
firestore.rules
tools/orbit360-* backend/importadores/gates
```

El `index.html` del ZIP no carga el backend LAB ni los contratos recientes de la rama; por tanto, no es reemplazable de forma directa.

## 4. Deltas reutilizables confirmados de Claude

### Integrar en archivo propietario

1. `core/router.js`
   - cierra correctamente el menú/overlay móvil en toda navegación real;
   - aplica acceso al módulo mediante contrato central;
   - evita que el usuario quede visualmente atrapado en Inicio.

2. `core/legal.js`
   - evita modales duplicados del mismo gate legal;
   - incorpora marca de scope en el nodo del modal.

3. `modules/comparativo.js`
   - gate de mutaciones y consistencia acumulada;
   - plantilla de impresión base por tenant con override por aseguradora;
   - conserva comparativo conjunto con plantilla base.

4. `modules/comisiones.js`
   - aplica scope también en mutaciones directas y detalle, no solo en listado.

5. `modules/equipo.js` y `core/config.js`
   - persistencia del esquema moderno multirol;
   - `roles[]`, rol default/activo, módulos extra/restringidos, scopes y países;
   - confirmación reforzada cuando se amplía acceso.

6. `core/ciclo.js`, `modules/cliente360.js`, `modules/cobros.js`, `modules/renovaciones.js`, `modules/siniestros.js`
   - gates por registro y país;
   - eliminación de defaults inseguros de asesor;
   - acciones directas y lotes sometidos a alcance.

7. `core/credential-vault.js` y `modules/aseguradoras.js`
   - resolución por `credentialRef` mediante proveedor intercambiable;
   - no revelar la referencia como si fuera el secreto;
   - temporizador de revelado y auditoría de intentos;
   - cuentas bancarias separadas de credenciales.

8. `modules/finanzas.js`
   - elimina copy técnico visible (`sin hardcode`).

9. `docs/legacy/`
   - reubica paquetes Claude antiguos y standalone `NO-USAR` fuera de la documentación operativa principal.

## 5. Contratos de la rama que el ZIP no sustituye

### Mantener mientras se integra en propietario

1. `core/session-multirol-visibility-v20260716.js`
   - conserva identidad de asesor al cambiar rol;
   - limita selector a roles asignados;
   - visibilidad efectiva base + extras - restringidos.

2. `core/client-canonical-view-projection-v20260716.js`
   - proyecta los campos importados de los 414 clientes al contrato visual;
   - no escribe ni reimporta.

3. `modules/aseguradoras-frontend-projection-v20260716.js`
   - orden GT/CO;
   - conocimiento mapeado/persistido/validado/habilitado como estados distintos;
   - proyección de datos reales sobre el renderer canónico.

4. `modules/aseguradoras-candidate-actions.js`
   - acciones de la ficha requeridas por la candidata y el gate A&S.

5. backend LAB, Auth LAB, store Firestore, reglas y gate conjunto.

Estos componentes no deben retirarse hasta que exista equivalencia demostrada en archivos propietarios y el gate conjunto permanezca verde.

## 6. Conflicto contractual a resolver antes del empalme

La rama viva y la candidata usan contratos de alcance diferentes:

```txt
rama: Orbit.access
candidata: Orbit.accessScope
```

`Orbit.access` contiene funciones adicionales ya usadas por el cierre CRM:

```txt
canView/filter
prepareManual
deriveClientState
duplicateCandidates
audit/correction
scopedStore/withScope
```

La candidata aporta gates nuevos por registro/país y fail-closed.

Decisión:

```txt
NO reemplazar core/access-scope.js.
Consolidar ambos contratos en un solo propietario compatible,
manteniendo aliases temporales únicamente durante la transición.
```

Criterio de retiro del alias: todos los módulos y pruebas deben usar el contrato canónico sin perder las funciones del cierre CRM ni los gates nuevos de Claude.

## 7. Overlays que pueden retirarse después de integrar propietario

La rama actualmente implementa en `core/pwa.js` responsabilidades que no pertenecen a PWA:

- carga de `empalme-v1251-runtime.js`;
- instalación adicional del gate legal;
- instalación adicional del menú móvil;
- carga dinámica de multirol y proyecciones A&S;
- carga del importador inicial LAB.

Primer retiro permitido:

```txt
legal idempotente de PWA -> retirar después de integrar core/legal.js
navegación móvil de PWA -> retirar después de integrar core/router.js
```

No retirar todavía desde PWA:

```txt
multirol
proyección cliente
proyección aseguradoras
acciones candidatas
carga inicial LAB
```

Antes deben trasladarse a un bootstrap explícito y verificarse con el gate.

## 8. Hallazgos que regresan a Claude

### P0 documental

`README.md` declara base v1.251, pero `CHANGELOG.md` llega a v1.255. Debe unificarse la versión de entrega.

### P0 de UI no técnica

El barrido encontró textos potencialmente visibles que no deben llegar al cliente final:

```txt
"Pendiente de backend"
"simulación LAB"
"No se pudo cargar la simulación LAB"
```

Deben sustituirse por estados no técnicos, por ejemplo:

```txt
Pendiente de conexión segura
Servicio temporalmente no disponible
No se pudo completar la prueba de conexión
```

### P1 de evidencia

`docs/EVIDENCIA-ASEGURADORAS-2026-07-14.md` reconoce que no verificó los viewports exactos de Dirección desktop, Operativo tablet y Asesor móvil. No cierra el gate conjunto actual.

### P1 de documentación histórica

Los documentos antiguos que recomiendan reemplazar carpetas completas o trabajar con `main`/GitHub Pages deben permanecer en `docs/legacy` y no guiar la migración actual.

## 9. Academia

Cambios que deben incorporarse a Academia:

- cambio de rol limitado a roles asignados;
- alcance de datos independiente de visibilidad;
- país permitido por usuario;
- confirmación reforzada al ampliar acceso;
- credenciales por referencia y conexión segura;
- diferencia entre banco operativo y credencial;
- menú móvil y gate legal como comportamiento único;
- plantilla de Comparativo configurable por tenant/aseguradora.

## 10. Estado del Bloque 0

```txt
Inventario ZIP: CERRADO
Comparación contra candidata canónica: CERRADA
Validación sintáctica/referencias: CERRADA
Clasificación inicial de deltas: CERRADA
Manifiesto único: CREADO
Matriz archivo por archivo contra rama: EN CURSO
Empalme selectivo propietario: PENDIENTE
Retiro de overlays: PENDIENTE
Gate conjunto: PENDIENTE BLOQUE 1
```

## 11. Siguiente acción exacta

```txt
1. consolidar Orbit.access + Orbit.accessScope sin regresión;
2. integrar core/legal.js y core/router.js de la candidata en propietarios;
3. retirar únicamente los overlays legal/móvil de core/pwa.js;
4. ejecutar validadores y gate del slice;
5. continuar con Cliente 360 y Aseguradoras, preservando proyecciones A&S hasta equivalencia.
```

No se cargan datos, no se toca producción, no se hace merge a `main` y no se abre otra auditoría general.
