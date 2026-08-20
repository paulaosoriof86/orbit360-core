# Academia — Actualización F2 Request10 · diferencia entre defecto funcional y VALIDATOR_STALE

Fecha: 2026-08-20.

## Aprendizaje obligatorio
Request10 enseña por qué Orbit 360 no debe convertir automáticamente un timeout del validador en defecto funcional. El runner informó que Pólizas no estaba visible, pero la evidencia capturada en ese mismo instante mostraba contenido renderizado, dimensiones no nulas y visibilidad CSS activa. El producto quedó congelado y se corrigió el validador.

### Patrón reusable
1. Ejecutar el gate canónico antes de browser/secrets.
2. Si una prueba falla, conservar vista, rol, ruta, hash, estado DOM, authStage y geometría.
3. Contrastar el veredicto con la evidencia capturada.
4. Si el criterio del validador contradice esa evidencia, clasificar `VALIDATOR_STALE` y congelar producto.
5. No perder checks ya aprobados: cross-tenant y write-guard deben conservarse aunque falle una etapa posterior.
6. Una autorización runtime es de un solo uso; Request10 quedó consumido y Request11 requiere autorización fresca.

### Roles y seguridad
La prueba seguía la matriz Dirección desktop / Operativo tablet / Asesor móvil. El bloqueo ocurrió en Dirección → Pólizas. Antes de esa matriz ya habían pasado los controles de aislamiento cross-tenant y bloqueo local de escrituras. La integridad before/after quedó idéntica y no hubo writes.

### Estado de enseñanza
- Defecto funcional demostrado en Pólizas: no.
- Validador obsoleto/inconsistente: sí, corregido source-only.
- Candidata reconstruida: no.
- Datos A&S modificados: no.
- Próxima frontera: Request11 sobre la misma candidata exacta `9387820198`, únicamente con autorización fresca.
