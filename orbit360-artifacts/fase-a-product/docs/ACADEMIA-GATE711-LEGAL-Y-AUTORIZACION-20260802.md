# Academia — Gate 7.11: Legal diferido y autorización vigente

Fecha: 2026-08-02

## Objetivo

Distinguir un defecto funcional de un validador obsoleto durante una revisión read-only de Orbit 360.

## Caso 1 — Legal diferido

El modal Legal puede aparecer después de Auth y de la hidratación inicial. Que todavía no esté visible no significa que ya fue aceptado.

Orden correcto:

1. autenticar identidad existente;
2. hidratar `Orbit.store`;
3. esperar al propietario Legal;
4. aceptar una sola vez;
5. comprobar que el modal desapareció;
6. instalar el write guard;
7. navegar por los módulos.

Riesgo: instalar el write guard antes de cerrar Legal puede convertir una aceptación válida en un intento de escritura bloqueado y puede dejar un overlay cubriendo el contenido.

## Caso 2 — Autorización vigente

Un gate no debe exigir una frase histórica específica. Debe comprobar que:

- lifecycle y request declaran la misma referencia;
- la referencia no está vacía;
- existe autorización explícita;
- la ejecución permitida es una;
- la autorización no fue consumida;
- el bloque no se fragmenta en microautorizaciones.

## Clasificación

- Producto correcto + selector/orden antiguo: `VALIDATOR_STALE`.
- Variable escrita y leída en el mismo paso: `PIPELINE_MECHANISM_FAILURE`.
- Autorización histórica hardcodeada: `VALIDATOR_STALE / PIPELINE_MECHANISM_FAILURE`.

## Regla STOP_RETRY

Si la misma etapa falla dos veces:

- detener reintentos;
- congelar producto;
- no crear otro request;
- no leer secretos;
- no abrir navegador;
- corregir el mecanismo;
- exigir PASS estático antes de reabrir.

## Evidencia esperada

- `GATE711_AUTHORIZATION_BINDING_STATIC_PASS`;
- `GATE711_LEGAL_DEFERRED_ORDER_STATIC_PASS`;
- `GO_GATE_CONTRACT`;
- cero escrituras;
- cero deploy;
- cero producción.
