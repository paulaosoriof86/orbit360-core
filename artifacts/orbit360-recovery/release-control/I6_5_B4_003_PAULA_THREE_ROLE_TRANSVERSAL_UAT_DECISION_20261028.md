# Gravicentra Insurance — matriz transversal de Paula y Carlos, 28-oct-2026

**Gate:** I6.5/B4-003 (continuidad, no gate nuevo). **Fuente:** Dirección Paula + lectura autenticada de Preview en Chrome. **Alcance de este registro:** pruebas READ-ONLY de Inicio y decisión de UAT; no hubo escrituras, despliegues ni datos alterados.

## Decisión congelada

1. Dirección exige UAT transversal con **dos identidades independientes**: Paula Osorio y Carlos Castro. Cambiar de rol dentro de un solo UID **no** constituye prueba multi-UID.
2. Paula tiene las **tres vistas confirmadas en UI**: Dirección, Operativo y Asesor. Carlos tiene **Operativo y Asesor** comprobados en pruebas previas. Los permisos efectivos del servidor se deben acreditar por UID, rol y país; no se presuponen solo por un selector visual.
3. Países a cubrir: Guatemala, Colombia y Todos los países cuando la cuenta esté autorizada. Las verificaciones compararán identidades y alcance, sin exigir números iguales a perfiles con permisos diferentes.
4. Los tests PASS históricos se conservan; cada caso nuevo debe comprobar carga final 5/5, relación con fuente canónica, pantalla/dato y resultado tras recarga. Las escrituras, cuando correspondan, únicamente sobre fixtures sintéticos previamente autorizados.
5. Priorización de salida: transporte lector protegido LIVE, Historial por rol/país, Cliente 360↔Cobros, Cronograma durable, Aseguradoras entitlement y smoke de roles/identidades. Otros flujos no acreditados siguen NOT TESTED, sin inventar PASS.
6. La excepción explícita de riesgo de Firestore vigente en Control Plane tras la decisión de Paula del 28-oct no se reabre como bloqueo de reglas; el hallazgo sigue abierto y su mitigación es P0 de postproducción.

## Readback autenticado actual — Preview LAB 40805562769

URL: https://ays-orbit-360-lab--gi-i65-b4-40805562769-e9si0n0l.web.app/

| Identidad visible | Rol en UI | País | Fuentes | Clientes | Pólizas | Cobros confirmados | Cartera vencida | Resultado |
|---|---|---|---|---:|---:|---|---|---|
| Paula Osorio | Operativo | GT | 5/5 | 420 | 1301 | Q 2,744; 5 pagos | Q 216K aprox.; 629 obligaciones/248 con monto | PASS lectura focal |
| Paula Osorio | Operativo | CO | 5/5 | 17 | 124 | COP 0; 0 pagos | COP 9.3M aprox.; 12 obligaciones/4 con monto | PASS lectura focal |
| Paula Osorio | Dirección | CO | 5/5 | 17 | 124 | COP 0; 0 pagos | COP 9.3M aprox.; 12 obligaciones/4 con monto | PASS lectura focal |
| Paula Osorio | Asesor | CO | 5/5 | 17 | 92 | COP 0; 0 pagos | COP 8.2M aprox.; 3 obligaciones/3 con monto | PASS lectura focal |
| Paula Osorio | Asesor | GT | 5/5 | 378 | 1153 | Q 2,306; 3 pagos | Q 164K aprox.; 556 obligaciones/217 con monto | PASS lectura focal |
| Paula Osorio | Dirección | GT/Todos | — | — | — | — | — | NO CERTIFICADO en este recorrido por interrupción de conexión |

**Observación:** valores abreviados de la interfaz no son conciliación contable exacta. No se registran nombres ni identificadores de terceros. La diferencia de alcance entre Asesor y Operativo es observación UI, no certificación de aislamiento backend. Un intento adicional de Dirección/GT quedó inconcluso al interrumpirse Chrome; no se declara FAIL de producto por ese incidente.

## Próximo movimiento

Una sola candidata acumulativa de funciones/Hosting; completar los casos de lectura transversales pendientes con las dos identidades reales, ejecutar pruebas controladas de persistencia sobre fixtures y promover únicamente con artefacto exacto y comprobaciones de LIVE. No reabrir decisiones ni repetir la matriz completa ya leída.

## Addendum técnico focal — pruebas de recuperación y transporte

Evidencia ejecutada localmente en árbol de fuente B4-003, fixtures sintéticos, sin Firebase externo ni escrituras reales. No equivale a UAT real ni a aprobación LIVE:

- `gravicentra-b4-003-role-context-recovery.test.cjs`: **2/2 grupos PASS**. Al cambiar rol, se invalida la caché previa; lectura prioritaria, reintento transitorio acotado, denegación no reintentada, sin fallback Firestore directo.
- `gravicentra-b4-003-operational-write-security-regression.test.cjs`: **30/30 PASS**. Incluye aseguradora del país autorizado permitida; país ajeno o faltante denegado. `releaseAccepted:false` declarado por el propio reporte; no es certificación LIVE.
- `gravicentra-b4-003-scoped-related-reader.test.cjs`: **PASS** en lector protegido, relaciones de historial, filtros de país/rol/tenant, páginas y cuatro colecciones; sin escritura externa.
- `gravicentra-b4-003-cronograma-durable-task.test.cjs`: **4/4 PASS** en simulación. La anterior incidencia de persistencia de Cronograma en Preview **no queda resuelta** por esta prueba local.

**Dependencia técnica aislada para corte LIVE:** el `functions/bootstrap.js` vigente no exporta `b4-003-scoped-policy-callable`. El empaquetador `tools/gravicentra-i6-1-preview-package.mjs` integra ambos nombres en artefacto efímero, pero el ejecutor autorizado despliega exclusivamente `orbit360ScopedPolicyReadPreview`. El frontend LIVE invoca `orbit360ScopedPolicyRead`, cuya disponibilidad en LIVE no está acreditada. Antes del corte se requiere una promoción específica del backend con lectura exacta de función; no basta transportar Hosting. **La excepción temporal de Firestore Rules aceptada por Paula permanece fuera de esta dependencia y no se reabre.**

**Cobertura pendiente:** Dirección/GT, selector Todos, autorización negativa real cruzando Paula/Carlos, ciclo operativo sintético de Cronograma, edición autorizada de Aseguradoras, y flujo LIVE con readback. El último reintento de Chrome fue interrumpido; no se registra como PASS/FAIL del producto.
