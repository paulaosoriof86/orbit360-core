# Academia Orbit 360 — F2 Pólizas: distinguir timeout de causa raíz funcional

**StateVersion:** `F2-R12-CONSUMED-ROOTFIX-SOURCEONLY-PASS-20260820-02`

## Caso

Request10 y Request12 mostraron Pólizas visible después de un timeout de readiness. El error no debía corregirse aumentando el timeout ni clasificándolo automáticamente como `VALIDATOR_STALE`.

La investigación causal demostró `FUNCTIONAL_DEFECT:F2_PRODUCT_READONLY_GET_FULL_COLLECTION_CLONE_AMPLIFICATION`.

Pólizas pinta hasta 100 filas y resuelve cliente, aseguradora y asesor por fila. En el adaptador productivo read-only, cada `get()` llamaba `all()`, y `all()` clonaba toda la colección con JSON antes de buscar una fila. La prueba source-only calculó 46,300 filas clonadas para 300 lookups, amplificación 154.33x.

## Lección por rol

- Dirección/Operativo/Asesor: un timeout visible no implica necesariamente que la pantalla esté rota; debe diferenciarse carga real de un instrumento de prueba obsoleto.
- Desarrollo/Backend: conservar la API no basta; el coste algorítmico de un adaptador puede cambiar radicalmente aunque `get()` devuelva el mismo dato.
- QA/Gates: si el timeout nominal es 20 s pero la captura posterior solo responde a 64.68 s, medir disponibilidad del event-loop antes de aumentar el timeout.
- Seguridad: optimizar lectura no debe debilitar aislamiento. `find en cache -> clone fila` preserva copia defensiva y mantiene writes bloqueados.
- Migración/datos: el defecto era de lectura/render, no de calidad ni reimportación; por eso no debía tocarse carril C.

## Patrón reutilizable

1. detener retry tras segunda falla de familia;
2. comparar timeout nominal con elapsed total;
3. seguir la cadena UI → helper → query → store;
4. medir amplificación source-only;
5. corregir en owner más bajo y reusable;
6. probar API, aislamiento, write guards y tenant neutrality;
7. marcar candidata anterior como no reutilizable si no contiene el rootfix;
8. sincronizar ledger y pasar continuity invariant antes del siguiente bloque.

Evidencias:
- `f2-polizas-read-amplification-proof-v20260820.json` — causal proof PASS;
- `f2-product-readonly-get-rootfix-sourceonly-v20260820.json` — rootfix contract PASS.

No Request13, deploy ni producción quedan autorizados por esta lección/rootfix.
