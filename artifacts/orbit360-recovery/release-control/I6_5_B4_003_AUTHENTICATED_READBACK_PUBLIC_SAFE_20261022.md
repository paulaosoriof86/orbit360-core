# Gravicentra Insurance — B4-003 · Síntesis QA depurada (22-oct-2026)

Estado: `READ_ONLY_EVIDENCE / GATE_OPEN / NO_LIVE / NO_B4-004`.

Esta síntesis corresponde al readback autenticado del gate existente I6.5/B4-003. Contiene únicamente hallazgos agregados y decisiones de control que pueden documentarse en el repositorio público. La evidencia técnica completa permanece fuera de esta publicación; no se adjuntan identificadores internos ni extractos de datos operativos.

## Comprobaciones y límites

- La inspección de tres renovaciones QA sintéticas confirmó referencias a clientes padres ausentes. Su grafo observado comprende **3 pólizas, 6 recibos esperados y 6 registros de cartera**, además de tres relaciones con clientes no encontradas. Son registros de prueba: no deben clasificarse como negocio real por su estado visible.
- Un conjunto adicional de fixtures QA de una ejecución cancelada permanece preservado para decisión de limpieza controlada. **No se ejecutó ninguna eliminación.**
- La vista global de Cobros/Cartera consiguió presentar registros en la candidata inspeccionada. Se corrige la observación visual de tabla vacía en esa muestra, **pero la paridad financiera y la conciliación siguen sin certificarse**.
- En Cancelaciones se reprodujo una transición de cifras provisionales durante la hidratación y el cambio de contexto. El cálculo de indicadores se presenta antes de que todas las fuentes estén listas; requiere una guardia de disponibilidad antes de mostrar totales como definitivos.
- La revisión de Equipo, permisos, metas y asignaciones no acreditó todos los flujos administrativos ni la elegibilidad contractual. Las vistas simuladas de rol en una misma sesión **no sustituyen pruebas con identidades independientes**.
- La sesión conservó autenticación y contexto en una recarga observada. No se declara una medición concluyente de rendimiento HTTP ni una validación por todos los roles.

## Seguridad y release

- **P0 abierto:** las reglas vigentes son demasiado amplias para operaciones por rol, país y registro. La candidata restrictiva no fue desplegada porque falta demostrar paridad con todos los consumidores que comparten el entorno.
- Los controles sintéticos del corte reportaron **27/27** y **10/10** casos aprobados. La barrera de seguridad dio PASS como control de bloqueo: **producción sigue bloqueada**. Esas pruebas no equivalen a una UAT multiusuario real.
- Permanecen **seis hallazgos P0 formales** y verificaciones de consistencia financiera, Cliente 360/Pólizas, notificaciones, flujos E2E y controles efectivos de acceso.
- Sin cambios a Firestore, Auth, Rules, datos operativos ni producción como resultado de esta documentación.

## Estado y siguiente secuencia

- Gate: **I6.5/B4-003 ABIERTO**. No autoriza B4-004 ni salida LIVE.
- Avance formal I6 conservado: **50 % (5/10)**. Controles acreditados hacia producción: **20 % (2/10)**.
- Siguiente secuencia dentro del gate: demostrar paridad de reglas y consumidores sin afectar el entorno compartido; corregir la publicación prematura de KPI; completar las pruebas independientes por rol, flujos y notificaciones; reconciliar finanzas y dependencias QA antes de cualquier limpieza expresamente autorizada.

### Alcance de depuración pública

Se omiten deliberadamente IDs físicos de clientes, pólizas, recibos y cartera; identificadores de proyectos o tenants, rutas de Firestore, enlaces de sesiones y previews, identificadores de fixtures y métricas comerciales detalladas. El informe autenticado original **no forma parte de este commit público**.
