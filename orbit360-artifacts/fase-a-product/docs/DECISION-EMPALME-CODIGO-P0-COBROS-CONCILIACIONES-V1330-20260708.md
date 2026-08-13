# Decisión de empalme de código — P0 Cobros + Conciliaciones v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Decisión

El hotfix P0 de Cobros + Conciliaciones ya fue preparado y validado en entorno aislado. Para cerrar el empalme real hay dos caminos seguros:

## Camino A — Empalme directo de módulos en GitHub

Aplicar reemplazo controlado solo de:

```txt
orbit360-platform/modules/cobros.js
orbit360-platform/modules/conciliaciones.js
```

Condiciones:

- usar como fuente los módulos hotfix validados;
- no tocar `index.html`;
- no tocar backend protegido;
- documentar commit SHA;
- validar sintaxis después.

Este camino es el ideal si el conector permite subir contenido completo de módulos sin truncamiento.

## Camino B — Script local único con backup y validación

Si el conector no permite empalmar módulos completos por tamaño/truncamiento, usar script local único:

```txt
node orbit360-platform/docs/scripts/APLICAR-HOTFIX-P0-COBROS-CONCILIACIONES-V1330.mjs
```

El script debe:

- hacer backup;
- tocar solo Cobros y Conciliaciones;
- aplicar hotfix;
- ejecutar `node --check`;
- generar reporte;
- no commit;
- no push;
- no deploy;
- no tocar backend protegido.

## Restricción clave

No se debe empalmar el ZIP completo. Solo estos módulos y con hotfix P0.

## Estado

Pendiente cerrar con Camino A o Camino B. El bloque ya dejó documentación y validación previa del hotfix.