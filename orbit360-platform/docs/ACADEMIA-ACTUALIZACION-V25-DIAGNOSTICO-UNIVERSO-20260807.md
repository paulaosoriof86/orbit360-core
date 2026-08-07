# Academia Orbit 360 — actualización v25

Fecha: 2026-08-07

## Objetivo pedagógico

Distinguir entre un conteo contractual obsoleto y un dato realmente fuera de contrato sin tocar el producto ni forzar cifras.

## Caso v25

El gate Block1 esperaba 414 clientes / 26 aseguradoras / 7 asesores. v24 observó 430 / 30 / 7 raw y 430 / 25 / 7 efectivos. v25 enseña que un delta numérico no autoriza a borrar, fusionar o excluir filas.

## Regla

1. Recuperar el baseline de procedencia.
2. Probar pertenencia por batch/manifest, no por posición.
3. Separar miembros baseline de registros posteriores.
4. Para cada diferencial emitir solo fingerprint y señales no PII.
5. Si el baseline sigue completo y existen altas posteriores objetivamente trazables, el contrato puede ser `VALIDATOR_STALE`.
6. Si un miembro baseline contradice su estado canónico sin transición trazable, existe `DATA_CONTRACT_FAILURE`.
7. Si falta evidencia para decidir, usar `REQUIERE_VALIDACION`; no inventar una exclusión para alcanzar el número esperado.

## Seguridad

El diagnóstico v25 admite exactamente tres lecturas de colecciones autorizadas, cero escrituras, cero Auth reads, cero Hosting y cero browser. La autorización se consume al finalizar aunque la conclusión sea `REQUIERE_VALIDACION`.

## Roles y Academia

Dirección debe comprender que el gate protege la integridad aunque retrase una visualización. Operativo debe distinguir corrección de contrato vs corrección de dato. Asesor no interviene en la reconciliación maestra.

Clasificación: `ACADEMIA_ACTUALIZAR`.
