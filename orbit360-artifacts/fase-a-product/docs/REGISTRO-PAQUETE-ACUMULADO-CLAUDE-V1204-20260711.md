# REGISTRO — PAQUETE ACUMULADO CLAUDE v1.204+

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.

## Baseline de Claude

```txt
Prototype Development Request - 2026-07-11T093254.494.zip
Versión visual: v1.197
SHA256: 8ea0fd79eb80bf8b9da2601e17f4922292087e297773bebfe9530e4745aab1a0
```

## Motivo del paquete

La validación visual del 2026-07-11 reabrió Aseguradoras, Cotizador y Comparativo. La candidata v1.197 y el empalme local v1.198–v1.203 aportan contratos útiles, pero la UX actual perdió la ficha rica anterior de Aseguradoras y mantiene Cotizador/Comparativo demasiado básicos frente a `comparativo_final_v110.html`.

## Alcance exclusivo de Claude

```txt
prototipo/UX
responsive
copy cliente
Academia/manuales
evidencia visual
documentación de candidata
```

Claude no debe tocar ni reimplementar backend protegido, Auth, Firestore, `Orbit.store`, importadores protegidos, herramientas, reglas, OAuth/Drive real, bóveda real, datos reales A&S ni despliegue.

## Prioridad

### P0

1. Recuperar la ficha rica de Aseguradoras dentro de página completa.
2. Nueva/Editar aseguradora con todas las pestañas y draft cancelable.
3. Acciones operativas, KPI, visor, permisos y copy cliente.
4. Cotizador profundo basado en la referencia v110, conservando source gate/default-deny.
5. Comparativo profundo, propuesta recibida estructurada y opción aceptada autocompletada.
6. Responsive 1440/1024/390.
7. Academia y manuales por rol.

### P1

- KPI con detalle transversal;
- visor documental transversal;
- rol activo, extras, restricciones y scope;
- estados honestos;
- equivalencia visual de patrones v1.198–v1.203;
- inventario, diff, regresión y evidencia.

## Patrones locales que Claude debe reflejar, no implementar

```txt
v1.198 Cliente360/scope/Portal
v1.199 Pólizas/Recibos/Recaudo
v1.200 Renovaciones
v1.201 Solicitud de emisión/Endosos/Ops
v1.202 Directorios Aseguradoras GT/CO y recursos seguros
v1.203 Cotizador/Comparativo normalizados y source gate
```

## Entrega exigida

Una sola candidata incremental v1.204 o superior, sobre v1.197, con ZIP completo, inventario, lista de cambios, `node --check`, referencias locales, matriz de regresión, actualización de Academia/manuales, evidencia responsive y declaración honesta de pendientes.

## Rechazo automático

Rechazar si reemplaza protegidos, usa datos reales, mantiene Aseguradoras plana, conserva el alta mínima, deja “Propuesta manual” ambigua, permite aceptar sin propuesta validada, obliga a transcribir campos ya conocidos, inventa tarifas/conexiones/envíos, crea póliza provisional o declara cierre sin evidencia.

El paquete descargable emitido contiene la instrucción maestra completa, matriz, mapa de modificaciones locales, prompt corto, evidencia visual, referencia v110, logo/manual de marca y manifiesto SHA256.