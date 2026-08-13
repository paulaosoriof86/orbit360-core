# HOTFIX — Honestidad Marketing y Reportes v1330

Fecha: 2026-07-07
Proyecto: Orbit 360 A&S
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5 draft/open

## Alcance

Se aplicaron correcciones de honestidad operativa en Marketing y Reportes después del empalme v1330.

No hubo merge, deploy, main ni producción. No se cargaron datos reales. No se modificaron archivos backend protegidos.

## Archivos modificados

- orbit360-platform/modules/marketing.js
- orbit360-platform/modules/reportes.js

Commits:

- 0f12f1c742a36a43be61122ba6bad18a8a199465 — fix(ays): marketing honestidad ia publicaciones v1330
- 17afa5d8ada41b078cd84db092ace68420c8cb0d — fix(ays): reportes honestidad programacion moneda v1330

## Marketing

Problema corregido:

- Cuando IA no estaba disponible, el módulo usaba una plantilla local, pero el contenido quedaba marcado como generado con IA.
- Programar publicaciones o crear piezas podía interpretarse como ejecución real aunque el proveedor externo no estuviera activo.

Cambios aplicados:

- Se separó generación con IA real de sugerencia por plantilla local.
- El contenido creado por fallback ahora dice “Borrador sugerido por plantilla”.
- El contenido creado con proveedor IA disponible mantiene “Borrador generado con IA”.
- Los avisos de pieza y programación aclaran que la ejecución real requiere integración activa.
- Reprogramar atrasados ya no sugiere publicación real confirmada.

Validación ejecutada antes de subir:

- node --check /mnt/data/marketing_new.js — OK

Impacto Claude / Academia:

- Claude debe conservar la diferencia entre plantilla local, IA conectada y proveedor externo activo.
- Academia Marketing debe explicar que idea, borrador, programación local y publicación real son estados distintos.

## Reportes

Problemas corregidos:

- Programar reporte afirmaba envío por correo configurado.
- Los resúmenes agrupados podían sumar importes en vista multipaís.
- Siniestros y cancelaciones usaban moneda global en lugar de moneda por cliente, póliza o reclamo.

Cambios aplicados:

- La programación queda como preparada en Orbit; envío real queda pendiente de integración de correo activa.
- En vista “Todos los países”, los resúmenes no suman importes monetarios.
- La UI muestra aviso de monedas separadas y pide filtrar por país para sumar.
- Siniestros y cancelaciones resuelven moneda por fila.
- El análisis automático evita sumar importes en vista multipaís.

Validación ejecutada antes de subir:

- node --check /mnt/data/reportes_new.js — OK

Impacto Claude / Academia:

- Claude debe evitar KPIs o resúmenes que mezclen GTQ y COP.
- Academia Dirección/Finanzas debe enseñar a filtrar por país antes de interpretar totales financieros.
- Programar reporte no equivale a correo enviado.

## Estado posterior

PR #5 sigue abierto y draft. Último head confirmado:

17afa5d8ada41b078cd84db092ace68420c8cb0d

## Pendiente principal

Cliente360 sigue pendiente por seguridad técnica del conector. Requiere parche local/Codex para:

- Cambiar “Enviar comparativo al cliente” por “Preparar comparativo para cliente”.
- Abrir compositor Correo con window.__orbitCompose.
- Evitar prometer Drive si el conector no está activo.
- Revisar acciones de correo en siniestros para que preparen comunicación sin afirmar envío.

## Próxima validación recomendada

- node --check orbit360-platform/modules/calidad.js
- node --check orbit360-platform/modules/marketing.js
- node --check orbit360-platform/modules/reportes.js
- node --check orbit360-platform/modules/cliente360.js
- node tools/orbit360-validar-backend-lab-contrato.mjs
