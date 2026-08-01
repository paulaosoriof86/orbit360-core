# ACADEMIA — VALIDATOR_STALE, MAPAS CON MERGE Y RELACIONES DE COBROS

**Fecha:** 2026-08-01  
**Clasificación:** `ACADEMIA_ACTUALIZAR`

## Aprendizaje principal

Una verificación posterior no debe declarar un defecto funcional cuando la relación operativa es correcta y el único desacuerdo proviene de una comparación inadecuada del validador.

En el cierre post-Cobros se comprobó que:

- cobro, recibo y póliza estaban correctamente relacionados;
- autorización e idempotencia coincidían;
- no existían `finmovs`;
- la póliza histórica no fue reactivada;
- el falso negativo estaba en la comparación exacta de un mapa anidado actualizado con `merge`.

## Conceptos por enseñar

### Defecto funcional

Existe cuando el producto o el dato real incumple la regla de negocio.

### `VALIDATOR_STALE`

Existe cuando el producto cumple, pero el instrumento de validación usa una expectativa antigua, incompleta o incompatible con el mecanismo real de persistencia.

### Comparación recursiva por subconjunto

Cuando una operación conserva metadatos válidos adicionales, el validador debe comprobar que todos los campos contractuales esperados estén presentes y correctos, sin exigir que el objeto completo sea idéntico si el contrato no prohíbe campos adicionales.

## Caso práctico

Un recibo debe contener dentro de `conciliacion` el estado, método, origen y referencia previstos. Firestore conserva además metadatos previos válidos. El resultado correcto es:

```text
campos contractuales: coinciden
metadatos adicionales válidos: permitidos
relación del recibo: válida
resultado: PASS
```

No corresponde modificar el recibo para que se parezca al validador.

## Controles que no deben relajarse

- IDs y relaciones;
- autorización;
- idempotencia;
- estado de conciliación;
- prohibición de reactivar póliza;
- prohibición de crear `finmov`;
- conteos finales;
- cero escrituras en pruebas read-only;
- bloqueo de replay.

## Evaluación sugerida

La persona debe clasificar correctamente estos escenarios:

1. El cobro apunta a otro recibo: `DATA_CONTRACT_FAILURE` o defecto funcional según origen.
2. El recibo conserva un metadato adicional permitido: no es defecto.
3. El validador exige igualdad total sin que el contrato la exija: `VALIDATOR_STALE`.
4. La prueba read-only crea un documento: `SECURITY_FAILURE`.
5. El cobro crea automáticamente un `finmov`: incumplimiento del contrato de dominio.

## Roles impactados

- Dirección / Superadmin / IT: clasificación y gates;
- Operativo / Cobros: estados y relaciones;
- Finanzas: separación entre cobro y movimiento financiero;
- Asesor: lectura simplificada de estados, sin detalle técnico.
