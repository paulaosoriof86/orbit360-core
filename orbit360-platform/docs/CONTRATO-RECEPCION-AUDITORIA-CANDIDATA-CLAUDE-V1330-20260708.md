# Contrato de recepción y auditoría — candidata Claude v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Mientras Claude trabaja la candidata frontend/prototipo/Academia, dejar listo el contrato backend de recepción para evitar empalmes inseguros, reprocesos o pérdida de metodología.

Este contrato aplica a cualquier ZIP/candidata que entregue Claude después del paquete integral v1330.

## Principio

Toda candidata Claude es una mini-release. No se acepta ni se empalma por resumen. Se auditan archivos reales.

## Baseline vivo antes de auditar

Antes de revisar la candidata, confirmar:

```txt
repo = paulaosoriof86/orbit360-core
rama = ays/backend-tenant-lab-v99-20260703
PR = #5 draft/open
merge = no autorizado
deploy = no autorizado
main = no tocar
producción = no tocar
datos reales = no subir
```

## Fuentes obligatorias a leer

```txt
DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
paquete_claude_v1330_integral_orbit360_ays_20260708.zip o su carpeta equivalente
```

## Archivos protegidos

La candidata Claude debe rechazarse o aislarse si modifica/reemplaza:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

Nota: `index.html` solo se acepta si la integración es inevitable y pasa revisión manual explícita. Por defecto, bloquear cambios directos.

## Auditoría mínima

1. Extraer ZIP/candidata en carpeta aislada.
2. Inventariar archivos.
3. Comparar contra baseline vivo.
4. Revisar cambios en `modules/`, `core/`, `styles/`, `data/seed.js`, `docs/`.
5. Detectar protegidos.
6. Detectar datos reales, secretos, base64, bytes, URLs públicas y credenciales.
7. Detectar copy técnico visible.
8. Validar JavaScript.
9. Revisar rutas y navegación.
10. Revisar Portal/Cobros/Cliente360/Documentos/M5/Equipo/Config/Academia.
11. Documentar mejoras, regresiones, pendientes y riesgos.
12. Solo empalmar si hay plan/preview/diff/revisión manual.

## Criterios de rechazo

Rechazar candidata si:

- pisa backend protegido;
- contiene datos reales o secretos;
- incluye base64/bytes/URLs públicas de documentos;
- usa `localStorage` operativo;
- muestra `backend`, `Firebase`, `Firestore`, `LAB`, `mock`, `demo`, `smoke`, `credenciales` en UI cliente;
- dice pago aplicado cuando solo hay soporte reportado;
- actualiza cliente/póliza desde documento sin diff;
- omite Academia profunda;
- trae lógica CXOrbia/T&A/mystery shopping;
- rompe navegación o módulos existentes.

## Criterios de aceptación

Aceptar para empalme controlado si:

- backend protegido intacto;
- JS sin errores de sintaxis;
- estados honestos;
- Portal/Cobros/Cliente360 cumplen contrato documental;
- Academia actualizada por rol;
- no datos reales ni secretos;
- documentación/changelog incluidos;
- se puede empalmar aditivamente.

## Empalme permitido

Solo bajo pipeline:

```txt
preflight
inventario
comparación
plan
preview
diff
revisión manual
node --check
contrato backend LAB
smoke visual cuando aplique
commit controlado
```

No merge, no deploy, no main.

## Estado

Contrato de recepción listo para cuando llegue la candidata Claude.