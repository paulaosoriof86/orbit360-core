# Academia — Paridad física, semántica y grafo canónico

Fecha: 2026-08-01

## Tres niveles de validación

Una migración completa no se demuestra solo con conteos.

### Paridad física

El documento de origen y el destino tienen el mismo ID y el mismo payload normalizado. Es el nivel exigido para documentos creados mediante migración controlada.

### Paridad semántica

Las envolturas técnicas o de trazabilidad pueden diferir, pero la proyección de negocio, el esquema de negocio y el estado de validación son equivalentes. No debe confundirse una diferencia técnica con un conflicto funcional.

### Integridad del grafo

Cada relación requerida debe resolverse contra padres operativos existentes. La validez individual de un documento no basta cuando sus dependencias están ausentes o son ambiguas.

## Resultado LAB A&S

```text
4,397 payloads físicamente exactos
440 proyecciones semánticamente equivalentes
4,837 esquemas de negocio coincidentes
4,837 estados de validación coincidentes
6,428 grupos de relación resueltos
0 conflictos críticos
0 relaciones bloqueadas
```

## Calidad de datos

`REQUIERE_VALIDACION` no desaparece por migrar un registro. En el corte revalidado se preservaron 2,031 estados pendientes, distribuidos en las siete colecciones.

La plataforma debe mostrar el estado con honestidad y restringir acciones críticas, sin ocultar el registro ni romper sus dependencias.

## Seeds y datos operativos

Los seeds deben mantenerse fuera del universo operativo. Un gate completo debe probar simultáneamente:

- todos los IDs fuente están representados en destino;
- no existen IDs source-only;
- los target-only están contados y clasificados;
- ningún seed aparece entre documentos operativos;
- las relaciones se calculan solo con IDs operativos.

## Multirol y read model

Cambiar la fuente de lectura no cambia permisos. El adapter debe conservar:

- rol activo y rol por defecto;
- scopes propios, equipo, todos o ninguno;
- restricciones de edición de registros pendientes;
- trazabilidad de gestiones de corrección;
- API pública de `Orbit.store`.

## Diferencia metodológica

- Un mismatch físico puede ser aceptable si la equivalencia semántica está demostrada y no hay conflicto crítico.
- Un mismatch de validación nunca debe ocultarse bajo equivalencia semántica.
- Un conteo correcto no compensa relaciones bloqueadas.
- Un gate congelado no se reabre después de corregir la causa mediante gates nuevos; se conserva como evidencia histórica.
