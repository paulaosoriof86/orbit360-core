# Bitácora cambios backend A&S — Fuentes separadas de migración

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** `#5`  
**Tipo:** metodología de migración / prevalidación LAB  
**Estado:** RESUELTO documentalmente; ABIERTO para archivos futuros.

## Entrada

- **Módulo / área:** Migración real A&S — metodología de fuentes separadas.
- **Síntoma/necesidad:** después de corregir el alcance del archivo financiero histórico, era necesario dejar definido cómo se recibirán y validarán los archivos actualizados separados por entidad.
- **Esperado:** matriz de fuentes, orden de carga, campos mínimos, validaciones, bloqueos y checklist LAB para evitar inferencias equivocadas.
- **Causa raíz:** el workbook financiero contenía una hoja de producción que podía inducir a inferencias cruzadas. La migración real debe operar por archivos separados y actualizados.
- **Archivo/función:** documentación en `MATRIZ-FUENTES-SEPARADAS-MIGRACION-AYS-20260703.md` y `CHECKLIST-PREVALIDACION-LAB-FUENTES-SEPARADAS-AYS-20260703.md`.
- **Fix/mejora aplicada:** se definió orden de fuentes, campos mínimos por fuente, bloqueos antes de LAB y reporte mínimo de dry-run.
- **Impacto en prototipo comercializable:** aplica a prototipo base. El importador debe tener selector de tipo de fuente, bloqueo de inferencias cruzadas, dry-run y reporte de exclusiones antes de importar.
- **Estado:** RESUELTO documentalmente.

## Documentos agregados

```txt
orbit360-platform/docs/MATRIZ-FUENTES-SEPARADAS-MIGRACION-AYS-20260703.md
orbit360-platform/docs/CHECKLIST-PREVALIDACION-LAB-FUENTES-SEPARADAS-AYS-20260703.md
```

## Decisiones documentadas

1. La migración real se hará con archivos separados y actualizados.
2. Clientes, pólizas, cobros realizados, planillas, estados de cuenta, cierres y siniestros tienen flujos distintos.
3. Ningún archivo financiero crea clientes/pólizas/cobros/cartera.
4. Ningún archivo de clientes crea pólizas/cobros automáticamente.
5. Ninguna planilla de aseguradora crea entidades maestras sin validación.
6. Cada archivo requiere dry-run, reporte de exclusiones y decisión listo/bloqueado.

## Pendientes backend

1. Esperar el primer archivo separado cuando Paula lo indique.
2. Procesar cada fuente en bloque independiente.
3. Mantener payloads privados fuera de repo.
4. Preparar dry-run antes de cualquier escritura LAB.
5. Solicitar autorización explícita antes de cualquier carga.

## Pendientes Claude / prototipo base

1. Selector obligatorio de tipo de fuente.
2. Vista previa de columnas detectadas.
3. Mapeo columna → entidad según alcance.
4. Bloqueo de inferencias entre entidades.
5. Reporte de exclusiones y conflictos.
6. Estados listo/requiere validación/excluido/conflicto.
7. Trazabilidad de archivo, hoja, columna, fila y responsable.

## Restricciones cumplidas

- No deploy.
- No merge.
- No main.
- No Firestore.
- No carga LAB.
- No datos reales en repo.
- No secretos.
- No modificación de `data/store.js`.
- No backend LAB protegido modificado.
- No descargables.
