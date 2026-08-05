# Cierre funcional del Bloque 12 y root fix visual

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Producción/main/merge: no autorizados

## Resultado funcional confirmado

El run LAB `30962756387` ejecutó dentro de Orbit 360 los flujos de Ops/Leads, alcance propio del Asesor, notificaciones, importación mensual recurrente y Cobros/Conciliación.

Resultado sanitizado:

- escenarios funcionales: 18 PASS / 0 FAIL;
- importación mensual: crear lote, dry-run, confirmar evidencia y rollback, PASS;
- Cobros/Conciliación: evidencia directa, planilla, cartera, propuesta y aplicación confirmada, PASS;
- Ops/Leads: oportunidad, transiciones, gestiones, resolución, scope del Asesor y aviso, PASS;
- rollback sintético: exacto;
- tenant real A&S: snapshot before/after idéntico;
- Rules, reimportación real, producción, main y merge: no.

## Primer fallo real restante

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

Código: `VISUAL_SCREENSHOT_FULLPAGE_TIMEOUT`.

La construcción de la candidata visual abrió correctamente Hosting y autenticó una identidad read-only, pero Playwright agotó 30 segundos al intentar una captura `fullPage` de la primera ruta. No existe evidencia de regresión funcional del producto.

## Causa raíz

El arnés visual utilizaba captura de página completa sobre vistas con contenido dinámico, animaciones, elementos sticky y altura variable. Ese mecanismo podía bloquear el cálculo de la superficie de captura aun cuando el módulo ya había renderizado.

## Corrección aplicada

Owner: `tools/orbit360-block12-cumulative-visual-v20260804.mjs`.

- captura limitada al viewport estable de 1440 × 1000;
- animaciones, transiciones, caret y scroll suave desactivados;
- timeout explícito por captura;
- código de fallo identifica la ruta exacta;
- cierre de página y Chromium garantizado en `finally`;
- resultados parciales preservados si una ruta falla.

También se alinea el consolidado del runtime y el gate a contrato `12.0.9`.

## Siguiente ejecución exacta

Una sola continuidad focalizada:

1. ejecutar preflight contractual antes de secretos;
2. desplegar únicamente las cuatro Functions allowlisted y Hosting preview LAB;
3. tomar snapshot read-only A&S;
4. verificar ocho rutas de la candidata acumulativa;
5. comprobar snapshot final idéntico;
6. conservar Functions y preview solo con PASS integral;
7. sin repetir los 18 escenarios ya cerrados;
8. sin crear tenant o usuarios sintéticos;
9. sin Rules, reimportación, producción, main ni merge.

## Impacto Claude / prototipo reusable

- Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.
- Patrón reusable: capturas visuales deterministas con viewport estable y animaciones deshabilitadas.
- No se envían datos A&S, capturas privadas, configuración Firebase ni backend protegido.
- El paquete genérico para Claude no queda bloqueado por esta verificación privada.

## Impacto Academia

- Clasificación: `ACADEMIA_ACTUALIZAR`.
- Enseñar que un runtime funcional PASS puede coexistir con un fallo del arnés visual.
- Reforzar la diferencia entre `FUNCTIONAL_DEFECT` y `PIPELINE_MECHANISM_FAILURE`.
- No cambian los flujos funcionales de Ops/Leads, importación ni Cobros; no se modifica su contenido operativo.
