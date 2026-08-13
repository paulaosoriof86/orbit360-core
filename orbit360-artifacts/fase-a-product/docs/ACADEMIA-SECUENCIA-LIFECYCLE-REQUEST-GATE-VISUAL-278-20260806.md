# Academia — autorización, lifecycle y request ejecutable

Fecha: 2026-08-06  
Caso: gate visual 2.7.8

## Tres conceptos distintos

### 1. Autorización humana

Define qué riesgo acepta Dirección y bajo cuáles límites. No modifica por sí sola el estado técnico del sistema.

### 2. Activación del lifecycle

Reserva exactamente una ejecución y habilita únicamente las capacidades autorizadas. Debe quedar en un commit propio, auditable y anterior al request.

### 3. Request ejecutable

Es el disparador inmutable de una ejecución. Debe ser el único archivo de su commit y declarar como `parentHead` el SHA exacto del commit de activación.

## Regla operacional

```text
Autorización explícita
→ lifecycle activo en commit padre
→ request exclusivo en commit hijo
→ GO_GATE_CONTRACT
→ secretos y runtime únicamente con PASS
```

Un request no puede activar implícitamente el lifecycle.

## Ejemplo del fallo

El request fue creado mientras el lifecycle conservaba:

```text
authorizationReserved: false
allowedExecutions: 0
executionAuthorized: false
```

El gate debía detenerse y lo hizo en:

```text
authorizationReserved
executionBoundaries
```

Esto es un `PIPELINE_MECHANISM_FAILURE`, no un defecto de la pantalla ni de los datos.

## Prueba reusable

La prueba source-only construye un repositorio temporal y valida dos caminos:

- camino incorrecto: request prematuro → `STOP_GATE_CONTRACT`;
- camino correcto: lifecycle padre + request hijo exclusivo → `GO_GATE_CONTRACT`.

Resultado:

```text
PASS_LIFECYCLE_SEQUENCE_SYNTHETIC
39/39
```

## Aplicación por rol

- Dirección: autoriza el riesgo y revisa los límites, pero no reemplaza el gate técnico.
- Operativo: distingue entre una autorización aprobada, un lifecycle activado y un request consumible.
- Asesor: no obtiene nuevos permisos por la existencia de un request; sus scopes continúan gobernando la interfaz.
- Equipo técnico: no crea el request antes de que exista el commit padre de activación y su evidencia source-only.

## Diferencia clave

```text
Defecto funcional
```

La plataforma no cumple una función esperada.

```text
Validador obsoleto
```

El instrumento exige una condición que ya no corresponde al contrato vigente.

```text
Fallo del pipeline
```

El orden o mecanismo de preparación impide llegar correctamente al gate o al runtime.

En este caso, la plataforma permaneció congelada y el fallo fue de secuencia del pipeline.
