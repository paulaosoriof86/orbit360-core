# Academia Orbit 360 — actualización v19 — 2026-08-07

## Qué enseña este cambio
Un módulo puede tener todos sus datos listos y aun así fallar una prueba si el hilo principal queda ocupado construyendo una vista demasiado grande. Eso es distinto de una falla de datos o permisos.

## Diferencia de diagnóstico
- **Defecto funcional:** Cliente 360 intentaba construir 430 filas completas en un solo render síncrono.
- **Validador obsoleto/mal acoplado:** la prueba de hidratación se ejecutaba después de iniciar ese render y no podía observar el estado hasta que el hilo se liberaba.
- **No es DATA_CONTRACT_FAILURE:** las fuentes required estaban listas y la captura mostraba el módulo completo.

## Patrón correcto
1. Validar fuentes required antes de iniciar una navegación costosa.
2. Navegar.
3. Medir render de forma independiente.
4. Presentar una ventana/página acotada y conservar el total completo.
5. Instrumentar las fases para saber si el costo está en resumen, filas, DOM o post-render.
6. No resolver bloqueos de rendimiento aumentando timeouts.

## Aplicación por rol
- Dirección: obtiene cartera completa, pero la primera pantalla carga una porción operable y navega por páginas.
- Operativo: conserva filtros y acceso según sus permisos sin cargar filas innecesarias.
- Asesor: mantiene scopes y deep-links; paginar no amplía visibilidad ni cambia datos.

## Regla reusable
La paginación/ventana de render es una optimización visual read-only. No debe alterar el universo autorizado del store, los scopes ni los cálculos agregados de KPIs.

## Gates
Un gate debe distinguir entre readiness de datos y readiness de render. Si el probe expira pero al recuperar el hilo observa target listo, contenido completo y cero fuentes required faltantes, debe clasificarse como `VALIDATOR_STALE_RENDER_PROBE_BLOCKED`, no como falta de hidratación.
