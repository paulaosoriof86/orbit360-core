# Academia — Validador obsoleto frente a un arnés vigente

Fecha: 2026-08-05

## Caso operativo

Un gate puede fallar aunque el producto no tenga una regresión. En el Microbloque 2.1, el workflow y el arnés visual ya operaban con ocho contextos aislados y URL directa por ruta, pero el preflight seguía buscando tokens del mecanismo anterior.

## Clasificación correcta

```text
VALIDATOR_STALE
```

No corresponde clasificarlo como `FUNCTIONAL_DEFECT`, porque:

- no se abrió navegador;
- no se desplegaron Functions ni Hosting;
- no se leyó Firestore;
- no se observó una ruta del producto;
- el fallo ocurrió comparando el validador contra contratos retirados.

## Diferencia práctica

| Situación | Clasificación |
|---|---|
| La ruta real abre y muestra una operación incorrecta | `FUNCTIONAL_DEFECT` |
| El payload no cumple el modelo canónico | `DATA_CONTRACT_FAILURE` |
| El runner no puede ejecutar su mecanismo | `PIPELINE_MECHANISM_FAILURE` |
| El validador exige una versión retirada | `VALIDATOR_STALE` |
| Se rompe un límite de permisos o secretos | `SECURITY_FAILURE` |

## Regla de acción

Ante `VALIDATOR_STALE`:

1. congelar producto y datos;
2. no usar secretos;
3. corregir motor, lifecycle, registro y workflow como una unidad;
4. preservar la evidencia del producto ya aprobada;
5. reanudar únicamente después de que el contrato vigente sea observable;
6. detener definitivamente si la misma etapa vuelve a fallar.

## Patrón reusable

El arnés visual vigente usa:

```text
un contexto de navegador por ruta
URL directa por ruta
token efímero por ruta
video + frame estático
cero navegación hash acumulativa
```

La evidencia de captura no debe tener autoridad para eliminar una candidata cuya integridad y despliegue de producto ya pasaron. El rollback completo se reserva para fallos de producto, despliegue o integridad.
