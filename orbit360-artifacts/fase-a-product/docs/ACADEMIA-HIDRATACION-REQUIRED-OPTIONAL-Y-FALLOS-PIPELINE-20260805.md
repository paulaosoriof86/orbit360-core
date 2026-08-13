# Academia — hidratación esencial, fuentes opcionales y fallos de pipeline

## 1. Dependencias esenciales y opcionales

Una dependencia esencial ausente bloquea el módulo para impedir cifras incompletas. Una fuente opcional ausente no debe bloquearlo: la vista continúa disponible y explica su alcance degradado.

## 2. Proyección visual

Cuando una referencia auxiliar no está disponible, puede construirse una proyección visual desde la membresía activa y las relaciones canónicas ya autorizadas. Esta proyección no escribe, no sustituye el catálogo durable, no hardcodea usuarios y no abre datos fuera del scope.

## 3. Clasificación correcta

- `FUNCTIONAL_DEFECT`: el producto ejecuta incorrectamente una función.
- `DATA_CONTRACT_FAILURE`: el producto exige una fuente incompatible con el contrato vivo.
- `VALIDATOR_STALE`: el validador no observa o interpreta correctamente el estado.
- `PIPELINE_MECHANISM_FAILURE`: el gate o producto ni siquiera comienza porque el mecanismo de ejecución no crea el run.

Un fallo de pipeline no debe atribuirse a Auth, datos o interfaz. Tampoco consume una autorización si nunca ejecutó el gate ni accedió a secretos.

## 4. Regla de dos fallos

Cuando la misma familia de mecanismo falla dos veces, se detienen los reintentos. No se crea otro parche ni otro request; se corrige el owner del pipeline.

## 5. Secuencia segura

```text
source PASS
→ registro de gate
→ GO_GATE_CONTRACT
→ credencial
→ backup
→ deploy autorizado
→ precheck
→ matriz
→ PASS o rollback/STOP_RETRY
```

## 6. Aplicación por rol

Dirección, Operativo y Asesor deben recibir una experiencia estable, con scopes correctos, sin KPIs parciales y con estados honestos cuando una fuente opcional no esté disponible.
