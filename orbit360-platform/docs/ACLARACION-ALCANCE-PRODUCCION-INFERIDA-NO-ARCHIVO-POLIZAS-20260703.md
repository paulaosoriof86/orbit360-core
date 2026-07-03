# Aclaración de alcance — producción inferida, no archivo oficial de pólizas

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Estado:** corrección documental de alcance.

## Aclaración principal

Paula no envió un archivo independiente/oficial de pólizas para este bloque.

El análisis previo se realizó sobre el archivo:

```txt
Movimientos Ing y Eg Alianzas Guate y Col 2026.xlsx
```

Específicamente sobre la hoja:

```txt
Listado producción 2025-2026
```

Por lo tanto, lo correcto no es tratarlo como carga oficial de pólizas, sino como:

```txt
producción emitida / registros candidatos de póliza inferidos desde producción
```

## Corrección de interpretación

Los conteos documentados antes deben leerse como entidades candidatas derivadas de producción, no como confirmación de una base oficial de pólizas lista para LAB.

- `clientes deduplicados`: clientes candidatos inferidos desde producción.
- `pólizas finales canónicas`: registros candidatos de póliza inferidos desde producción.
- `aseguradoras referenciadas`: aseguradoras mencionadas en producción, pendientes de homologación final.
- `asesores/vendedores`: vendedores referenciados en producción, pendientes de validación operativa.
- `cobros candidatos`: no son cartera real.

## Regla corregida

No se debe avanzar a carga Firestore LAB de pólizas oficiales con esta fuente únicamente.

Antes de cualquier carga LAB de pólizas se requiere archivo/fuente específica de pólizas o confirmación explícita de Paula de que la hoja `Listado producción 2025-2026` debe usarse como fuente base de pólizas candidatas.

## Estado de lo trabajado

Lo trabajado conserva valor para:

1. detectar estructura de producción;
2. identificar clientes/aseguradoras/asesores referenciados;
3. detectar duplicados y posibles renovaciones;
4. preparar reglas de importación;
5. documentar mejoras para el importador inteligente;
6. anticipar validaciones antes de LAB.

Pero no debe presentarse como migración final de pólizas.

## Manejo de archivos para Paula

Paula no necesita descargables salvo cuando solicite explícitamente paquete actualizado para Claude o paquete de entrega.

Regla operativa corregida:

- El asistente debe documentar directamente en GitHub.
- No debe ofrecer ni priorizar descargables en cada bloque.
- Los archivos privados generados en entorno temporal se usan solo para análisis interno del bloque.
- Los datos reales no se suben al repositorio.
- Si Paula solicita paquete actualizado para Claude, entonces sí se prepara el paquete consolidado con pendientes y modificaciones.

## Próximo flujo correcto de backend

A partir de ahora, los archivos deben pedirse uno a uno según necesidad real del backend.

Fuentes ya revisadas hasta esta aclaración:

1. Directorios de aseguradoras GT/CO.
2. Movimientos ingresos/egresos A&S GT/CO 2026.
3. Hoja `Listado producción 2025-2026` dentro del archivo de movimientos, tratada ahora como producción inferida/candidata, no como archivo oficial de pólizas.

Pendiente: solicitar a Paula únicamente el siguiente archivo necesario cuando sea realmente requerido.

## Restricciones cumplidas y reforzadas

- No deploy.
- No merge.
- No main.
- No escritura Firestore.
- No carga LAB.
- No datos reales en repo.
- No modificación de `data/store.js`.
- No modificación de backend LAB protegido.

## Estado

**ACLARACIÓN DOCUMENTADA.**

El bloque queda corregido conceptualmente: producción inferida desde archivo de movimientos, no archivo oficial de pólizas.
