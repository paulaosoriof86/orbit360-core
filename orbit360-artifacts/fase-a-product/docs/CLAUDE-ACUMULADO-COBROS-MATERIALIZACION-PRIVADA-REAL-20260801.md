# Claude acumulado — Materialización privada real de Cobros

Fecha: 2026-08-01  
Clasificación de datos: `SECRETO_DATO_REAL`  
Clasificación del patrón: `REPLICABLE_CLAUDE_ACUMULADO`

## Patrón reusable de privacidad

```text
cola sanitizada
→ referencias opacas
→ resolución privada efímera
→ validación multifuente
→ resumen no sensible
→ destrucción del payload
→ decisión humana separada
→ gate de escritura independiente
```

## Patrón reusable de recuperación de gates

```text
dos fallos en la misma etapa
→ STOP_RETRY
→ clasificar causa
→ congelar producto si VALIDATOR_STALE
→ alinear ownerField y auditField sin renombrar el producto
→ ejecutar validador directamente fuera del workflow
→ exigir PASS completo
→ sincronizar lifecycle, workflow, registro, docs y Academia
→ reabrir el mismo gate solo con autorización
→ cerrar el mismo gate con evidencia completa
```

Aplicación comprobada:

```text
preflight directo: 64/64 PASS
mismo gate 10.8: run 30709607082
cierre: 64/64 PASS
nuevo gateId: no
producto modificado: no
```

Regla: la prueba conductual debe prevalecer sobre búsquedas de tokens literales. Un owner no debe modificarse para imitar un nombre obsoleto del validador.

## Reglas UX reutilizables

- mostrar categoría y nivel de confirmación sin exponer datos en evidencia técnica;
- separar visualmente casos directos e históricos;
- presentar el histórico al final;
- permitir aprobación o rechazo individual;
- advertir que preparar o revisar no equivale a aplicar;
- mostrar snapshot y rollback antes de una futura escritura;
- conservar estados honestos: pendiente, aprobado, rechazado, aplicado y revertido.

## Controles reutilizables

- mínimo dos fuentes por tarjeta;
- referencias e idempotencias únicas;
- datos privados no enumerables;
- serialización sanitizada;
- destrucción del payload del owner y del llamador;
- cero valores privados en repositorio y artifacts;
- autorización y escritura como fronteras distintas;
- operación histórica reforzada y atómica;
- prohibición de reactivar póliza;
- prohibición de crear `finmov` desde cobro;
- evidencia directa completa antes de reabrir un gate detenido.

## No transferir a Claude

- nombres reales;
- números de póliza o recibo;
- montos y fechas reales;
- hashes o filas de fuentes privadas;
- identificadores internos A&S;
- archivos de aseguradora;
- ejecutor backend;
- secretos o credenciales;
- decisiones de autorización.

## Impacto Academia

La candidata debe enseñar por rol la diferencia entre evidencia, materialización, autorización y escritura, y también entre defecto funcional y validador obsoleto.
