# NOTA RECTORA — REBRANDING FUTURO A GRAVICENTRA, NO BLOQUEANTE

Fecha: 2026-07-30  
Proyecto actual: Orbit 360 / A&S  
Decisión estratégica provisional: marca visible futura `GRAVICENTRA`

## 1. Regla principal

Esta decisión NO detiene, reordena ni amplía el alcance productivo actual. La prioridad continúa siendo cerrar Fase A y salir a producción lo antes posible sin regresiones.

Hasta el bloque formal de rebranding:

- NO modificar backend;
- NO modificar contratos;
- NO modificar colecciones;
- NO modificar tenant IDs;
- NO modificar Firebase/proyectos/recursos;
- NO modificar rutas técnicas;
- NO renombrar repositorio ni rama;
- NO renombrar identificadores técnicos, claves, namespaces o APIs;
- NO mezclar branding con validaciones funcionales, migración o gates actuales.

## 2. Decisión registrada

La marca visible/pública prevista pasa provisionalmente de `Orbit 360` a `GRAVICENTRA`.

Hasta que se ejecute el bloque controlado, `Orbit 360` continúa siendo el nombre técnico/operativo usado por el repositorio, código, contratos, documentación histórica y validaciones en curso. Esto evita riesgo innecesario durante la ruta crítica.

## 3. Momento recomendado

El rebranding debe ejecutarse en el **último punto técnicamente seguro antes del lanzamiento público/productivo definitivo**, cuando:

1. Fase A funcional esté cerrada o en su release candidate final;
2. no exista un gate funcional/de datos abierto;
3. no se esté ejecutando migración o reconciliación;
4. exista una ventana aislada para regresión visual y funcional;
5. el cambio no obligue a modificar identificadores técnicos.

No debe adelantarse mientras M6/Pólizas u otro bloque crítico esté abierto.

## 4. Procedimiento obligatorio del bloque de rebranding

Antes de cualquier cambio se hará inventario read-only de todas las referencias visibles a `Orbit 360`, incluyendo al menos:

- login;
- header/topbar;
- títulos y subtítulos;
- navegación;
- textos legales visibles;
- emails/plantillas visibles;
- documentos exportables e impresión;
- PWA/manifest/nombre visible;
- favicon/logos/assets;
- metadatos HTML visibles/públicos;
- Academia visible al usuario;
- Portal;
- Cotizador/Comparativo;
- reportes;
- mensajes de error y estados de UI;
- textos responsive desktop/tablet/móvil;
- cualquier referencia pública indexable.

Luego se clasificará cada referencia como:

- `VISIBLE_REBRAND_NOW`;
- `TECHNICAL_KEEP_ORBIT`;
- `HISTORICAL_DOC_KEEP`;
- `LEGAL_REVIEW_REQUIRED`;
- `ASSET_REPLACE`;
- `PUBLIC_METADATA_REPLACE`.

Solo después del inventario se propondrá el diff controlado.

## 5. Alcance previsto

El bloque buscará cambiar exclusivamente marca pública/visible y assets relacionados, conservando la arquitectura y contratos técnicos salvo decisión expresa posterior.

Objetivo: **regresión cero**.

Debe probar al menos:

- login;
- Dirección desktop;
- Operativo tablet;
- Asesor móvil;
- Cliente 360;
- Aseguradoras;
- Pólizas y módulos ya cerrados para ese momento;
- Portal/Cotizador/Comparativo si ya forman parte de la release;
- impresiones/exportables visibles;
- PWA/metadata pública cuando aplique.

## 6. Regla de aviso

Cuando el flujo productivo llegue al punto descrito en la sección 3, el asistente debe señalar explícitamente:

`PUNTO SEGURO DE REBRANDING GRAVICENTRA ALCANZADO`.

En ese momento se solicitará/recibirá la instrucción frontend correspondiente y se ejecutará el inventario antes de modificar nada.

## 7. Estado actual

- decisión: REGISTRADA;
- ejecución: DIFERIDA;
- bloqueante de producción: NO;
- cambios técnicos realizados por esta nota: NINGUNO;
- siguiente acción productiva: continuar plan vigente sin reordenamiento.

## 8. Clasificación

`REPLICABLE_CLAUDE_ACUMULADO` para patrón de rebranding aislado; el nombre/decisión de marca se trata como decisión estratégica del producto y no se mezcla con backend protegido ni datos A&S.
