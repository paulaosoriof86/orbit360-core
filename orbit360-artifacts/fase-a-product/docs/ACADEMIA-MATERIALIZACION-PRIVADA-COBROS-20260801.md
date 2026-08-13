# Academia Orbit 360 — Materialización privada de Cobros

Fecha: 2026-08-01

## Propósito

Enseñar cómo revisar los datos reales de una propuesta sin persistirlos, publicarlos ni confundir la revisión con autorización.

## Dirección

Dirección recibe cinco tarjetas privadas durante una sesión efímera. Puede revisar identidad, recibo, monto, fecha y fuentes, pero la sesión mantiene:

- autorización en pendiente;
- escritura bloqueada;
- caso histórico separado;
- diff y rollback visibles.

La decisión se registra en un bloque posterior y nunca se infiere por abrir o revisar la tarjeta.

## Operativo

Operativo comprueba que cada tarjeta tenga:

- referencia opaca correspondiente;
- al menos dos pruebas de fuente;
- identidad exacta de póliza y recibo;
- moneda, monto y fecha coherentes;
- caso histórico marcado cuando aplique.

Al cerrar la sesión debe ejecutar la destrucción del payload temporal. El resumen sanitizado conserva solo conteos y estados.

## Asesor

El asesor no materializa ni aprueba tarjetas. Puede consultar el resultado operativo autorizado posteriormente o crear una gestión de corrección.

## Secuencia

```text
paquete sanitizado
→ referencias privadas seguras
→ materialización solo en memoria
→ revisión de Dirección
→ destrucción del payload
→ decisión explícita posterior
```

## Errores que deben evitarse

- serializar o registrar datos privados;
- guardar el payload en artifacts;
- interpretar revisión como autorización;
- mezclar el caso histórico con los cuatro recibos existentes;
- solicitar nuevamente una fuente ya registrada sin identificar una ausencia concreta.

## Evidencia

La evidencia sanitizada debe mostrar:

- cinco tarjetas materializadas;
- cuatro directas y una histórica;
- cero duplicados;
- cero autorizaciones;
- cero escrituras;
- payload destruido al finalizar.
