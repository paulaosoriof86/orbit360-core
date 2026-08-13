# Empalme seguro — candidata Orbit 360 v1.251

Fecha: 2026-07-14  
Carril: A + B  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy

## Fuente empalmada

```txt
Prototype Development Request - 2026-07-14T102112.323.zip
SHA-256: 23f2252e1304708b383b91c3d809e9224c733f2f854267b76bd2fca10239ac6c
Versión declarada y verificada: v1.251
```

Comparada contra:

```txt
Prototype Development Request - 2026-07-14T084835.886(1).zip
SHA-256: 965f0c5b643970e7d3150e93235c668c0ca6cd0a23f9f88b357ff392da277b97
Versión: v1.250
```

## Auditoría previa

- 109 archivos en la candidata.
- 58 JavaScript.
- `node --check`: 58/58 PASS.
- Delta v1.250→v1.251: 1 archivo añadido y 12 modificados.
- `data/store.js`, `core/auth.js` y `core/importa.js`: byte-idénticos.
- Sin reglas, loaders LAB, stores protegidos o datos reales modificados.

## Decisión

La candidata v1.251 queda aceptada como nueva referencia incremental. Los ocho P0 devueltos en v1.250 quedaron cerrados de forma suficiente para no bloquear el empalme.

No se aplicó reemplazo bruto porque la rama viva contiene mejoras reutilizables más avanzadas dentro de archivos con el mismo nombre, especialmente:

- `Orbit.access` y altas trazables;
- vault seguro con `credentialRef`;
- bridges CRM, pólizas, cobros, renovaciones, emisión, Ops/Leads, Portal, Aseguradoras y Cotizador/Comparativo;
- backend LAB y contratos productivos read-only;
- importadores y validadores protegidos.

## Método aplicado

Empalme aditivo mediante:

```txt
core/empalme-v1251-runtime.js
```

Activado desde:

```txt
core/pwa.js
```

El puente:

1. endurece la sesión contra identidad inexistente, inactiva o rol no asignado;
2. expone `Orbit.accessScope` fail-closed sin borrar `Orbit.access`;
3. aplica tenant, país, módulo y scope a registros;
4. protege acciones directas públicas de Ops/Leads, Cobros y Siniestros;
5. normaliza números bancarios ficticios completos para el prototipo;
6. mantiene cuentas bancarias separadas de credenciales;
7. conserva todos los contratos y archivos protegidos;
8. no escribe datos reales ni autoriza deploy.

## Validación local del puente

```txt
node --check: PASS
scope propio GT: PASS
registro CO fuera de países asignados: BLOCKED
scope Ops none: BLOCKED
cuenta ficticia enmascarada: normalizada a número ficticio completo
```

## Estado del empalme

```txt
Candidata v1.251: ACEPTADA Y EMPALMADA
Método: aditivo/reversible
Backend protegido: PRESERVADO
Datos reales: SIN ESCRITURAS
Deploy/merge/main: NO
```

## Aplicación a Claude/prototipo

¿Aplica a Claude/prototipo? Sí.

Patrones a conservar en una futura candidata:

- sesión fail-closed;
- “Todos los países” limitado a `countries[]`;
- detalle y mutación vuelven a validar scope;
- bancos operativos visibles/copiar;
- credenciales solo por referencia/proveedor;
- acceso restringido no equivale a ausencia de datos;
- lectura verificada no habilita escritura.

No se necesita enviar un paquete nuevo a Claude ahora. Los pendientes se acumulan en el documento post-v1.251.
