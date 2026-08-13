# Academia — Cambio de rol, contenido estático e idempotencia

Fecha: 2026-08-02

## Caso real

Una rutina de Academia escuchaba `orbit:session`. Cada cambio de rol volvía a ejecutar cinco mutaciones de contenido estático:

- tres lecciones;
- una evaluación;
- una actualización de configuración.

Con Dirección, Operativo y Asesor se generaban quince intentos.

## Por qué era un defecto funcional

Cambiar el rol activo modifica la vista y los permisos efectivos. No debe volver a sembrar contenido estático que ya existe.

El guard bloqueó todos los intentos, de modo que Firestore permaneció sin cambios. Aun así, el contrato read-only falló porque una capa del producto intentó escribir.

## Correctivo

El contenido operativo de Academia ahora:

1. se aplica al iniciar o cuando aparece un store realmente nuevo;
2. compara cada pieza antes de escribir;
3. actualiza solo los IDs objetivo;
4. no escucha cambios de rol;
5. conserva el contenido 1.232.

## Evidencia

```text
Primera carga: 5 llamadas objetivo
Segundo apply: 0 adicionales
Tres cambios de rol: 0 adicionales
Evento repetido del mismo store: 0 adicionales
```

## Diferencia entre categorías

- `FUNCTIONAL_DEFECT`: la rutina de Academia escribía por una interacción read-only.
- `VALIDATOR_STALE`: un validador buscaba instrucciones dentro de un workflow histórico ya cerrado.
- `DATA_CONTRACT_FAILURE`: el manifiesto acumulativo aún esperaba el digest anterior al root fix.
- `PIPELINE_MECHANISM_FAILURE`: el preparador de identidad ignoraba rutas efímeras explícitas.

Cada categoría exige corregir su owner; no se debe parchear el módulo visible por ensayo y error.

## Regla reusable

Un módulo de contenido estático debe ser idempotente:

```text
mismo store + mismo contenido + mismo evento = cero escrituras adicionales
```

Un store realmente nuevo puede recibir la aplicación inicial, pero las repeticiones deben quedar en cero.

## Rol y permisos

Cambiar entre Dirección, Operativo y Asesor no debe:

- sembrar contenido;
- modificar datos operativos;
- ampliar scopes;
- cambiar aprobación humana;
- generar actividad silenciosa no contratada.
