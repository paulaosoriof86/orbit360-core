# Acumulado reusable para Claude — Macro-2 read-model seguro

**Fecha:** 2026-08-21  
**Clasificación principal:** `REPLICABLE_CLAUDE_ACUMULADO`  
**Exclusión:** `BACKEND_PROTEGIDO_NO_CLAUDE` para la implementación concreta del adaptador productivo `Orbit.store`.

## Patrón reusable permitido

1. Definir helpers compartidos para texto, número, moneda y fecha que rechacen valores no finitos o inválidos y entreguen fallbacks honestos.
2. Separar ausencia de dato de valor numérico cero. El cero solo se usa dentro de un agregado cuando la regla matemática lo exige; la UI muestra ausencia como ausencia.
3. Normalizar los agregados antes de sumar. No permitir que `NaN`/`Infinity` contaminen KPIs, porcentajes o pronósticos.
4. Para relaciones de alta cardinalidad, cargar una colección una vez y construir `Map`/`Set` por llave; evitar N búsquedas o clones completos por entidad.
5. En render, aplicar `canonical read model → fallback → escape` y nunca interpolar directamente un campo operacional que pueda faltar.
6. Probar el patrón con fixtures que incluyan `undefined`, `null`, `NaN`, `Infinity`, `-Infinity`, fecha inválida y relaciones ausentes.
7. El source acceptance debe cubrir todas las rutas consumidoras antes de abrir browser/runtime.

## No enviar a Claude

No incluir credenciales, secretos, datos reales A&S, tenant real, adaptadores Firestore productivos, `core/backend-lab-*`, `core/auth.js`, `core/importa.js`, `firestore.rules` ni herramientas protegidas. El cambio concreto de `data/store-firestore-product-readonly-p0.js` permanece bajo control backend protegido y no forma parte del paquete reusable para Claude.
