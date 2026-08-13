# Cierre estático — Cola controlada de propuestas de Cobros

Fecha: 2026-08-01  
Tenant: `alianzas-soluciones`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## Veredicto

`COBROS_CONTROLLED_PROPOSAL_QUEUE_STATIC_READY`

```text
gate: block10.5-cobros-proposal-queue-static-v20260801
run: 30706101103
artifact: 8820364372
digest: sha256:3d2cd9a04aaeff779bb7a8d01e73dc1c614842353d4b6420a7109e25b1072a85
checks: 55/55 PASS
```

La matriz real del gate 10.4 contiene 70 casos de evidencia de pago:

- 68 pagos reportados en CRM;
- 2 pagos de aseguradora sin contraparte CRM.

La cola no aplica pagos. Ordena los casos por nivel de preparación y conserva diff, idempotencia y rollback.

## Distribución

| Cola | Casos | Puede pasar a autorización |
|---|---:|---|
| Evidencia directa lista | 4 | Sí |
| Evidencia directa con recibo histórico | 1 | Sí, con confirmación reforzada |
| Revisión temporal con póliza presente | 24 | No todavía |
| Validación por desaparición completa | 7 | No |
| HOLD de fuente o contrato de datos | 32 | No |
| Pago de aseguradora sin CRM | 2 | No |
| **Total** | **70** | **5** |

## Qué significa “listo para autorización”

No significa escrito ni aplicado. Significa que la identidad de la obligación y la evidencia directa alcanzan el umbral para presentar un diff a Dirección.

Los cinco casos conservan:

- estado anterior sin cobro aplicado;
- cambio propuesto;
- fuentes exactas;
- llave de idempotencia;
- snapshot obligatorio antes de una futura escritura;
- estrategia de reversión;
- bloqueo de `finmovs`;
- prohibición de reactivar pólizas.

El caso de recibo histórico exige confirmación reforzada porque propone crear el requerimiento histórico y aplicar el pago en una operación controlada futura.

## Casos temporales

Los 24 casos donde desaparece el recibo, pero la póliza sigue apareciendo, son evidencia fuerte de clearing. Permanecen en revisión porque la ausencia no equivale por sí sola a un cobro.

Los siete casos donde desaparece toda la póliza requieren validación adicional; pueden representar pago, ajuste, exclusión del reporte o cambio de vigencia.

## HOLD

Los 34 HOLD incluyen:

- tres recibos históricos sin contraparte;
- una diferencia de monto;
- una identidad insuficiente;
- un conflicto corroborado por comisión;
- un recibo que sigue pendiente después del pago reportado;
- catorce pagos posteriores al corte de la fuente disponible;
- once pagos sin contraparte identificada;
- dos pagos de aseguradora sin registro CRM.

No se solicitarán fuentes de forma masiva. Cada solicitud futura deberá indicar caso, aseguradora, periodo, fuente ya disponible y evidencia exacta que falta.

## Causa raíz del primer intento

El primer run, `30706025529`, no ejecutó la validación de la cola. El predecesor 10.4 rechazó el bootstrap porque esperaba literalmente la versión `20260801.3`, aunque la incorporación aditiva de la cola lo había elevado correctamente a `20260801.4`.

Clasificación: `VALIDATOR_STALE`.

Se corrigió el validador de la matriz para comprobar la capacidad requerida y una versión mínima, no una versión exacta. No se modificó la matriz ni la cola. La segunda y última ejecución pasó 55/55.

## Controles

```text
diff por propuesta: sí
idempotencia por propuesta: sí
duplicados de idempotencia: 0
snapshot pre-write: obligatorio
rollback por propuesta: sí
filas fuente: inmutables
autoaplicación: no
reactivación de póliza: no
finmovs: no
```

## Seguridad

```text
filas reales de la cola en repo: 0
PII: 0
números de póliza: 0
montos reales: 0
cobros writes: 0
finmovs writes: 0
Firestore writes: 0
browser: 0
deploy: 0
production: untouched
```

## Siguiente acción exacta

Los cinco casos de evidencia directa pueden convertirse en un paquete privado de autorización con diff sanitizado:

- cuatro cobros vinculados a recibos canónicos existentes;
- un cobro que requiere crear primero el recibo histórico exigible, sin reactivar la póliza.

Preparar el paquete no autoriza la escritura. Toda escritura requerirá una autorización explícita posterior y un gate independiente de ejecución atómica.
