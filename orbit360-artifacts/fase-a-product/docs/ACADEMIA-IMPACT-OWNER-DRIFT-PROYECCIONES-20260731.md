# ACADEMIA — OWNER DRIFT EN PROYECCIONES COMPOSABLES

Fecha: 2026-07-31

## Lección reusable

En una aplicación con owners/wrappers composables, un booleano como `wrapped=true` no demuestra que el wrapper siga siendo el owner efectivo. Solo demuestra que se instaló en algún momento.

Si otro owner legítimo se compone después, una proyección puede quedar desconectada aunque datos, store, backend y permisos estén correctos.

## Patrón correcto

1. Verificar identidad del owner vigente (`currentFunction === registeredOwner`).
2. Si cambió, envolver el owner actual en vez de restaurar una versión anterior.
3. Hacer idempotente la transformación del resultado para evitar doble aplicación en wrappers anidados.
4. Reconciliar ownership en eventos de lifecycle relevantes: navegación, sesión y vista hidratada.
5. Probar explícitamente `late owner composition` con fixture sintético.
6. Distinguir `FUNCTIONAL_DEFECT` de `VALIDATOR_STALE`: si el comportamiento nuevo pasa pero una prueba textual exige una sintaxis anterior equivalente, se congela producto y se corrige el validador.

## Aplicación por rol

- Dirección: entiende por qué un PASS de hidratación no garantiza que la vista final siga conectada al owner correcto.
- Operativo: identifica que una pestaña vacía con datos disponibles puede ser un problema de composición, no necesariamente de migración.
- Asesor: conserva una experiencia estable al cambiar rol/ruta sin duplicar datos o acciones.
- Equipo técnico: usa prueba rojo→verde y STOP_RETRY antes de desplegar otra vez.

## Regla para Academia

Toda proyección reusable que envuelva `Orbit.store`, `Orbit.q`, módulos o renderers debe enseñar y probar:

`OWNER_IDENTITY + IDEMPOTENCE + LIFECYCLE_RECONCILIATION + NO_DOUBLE_APPLICATION`.

No se debe enseñar `wrappedOnce=true` como garantía suficiente de integridad runtime.
