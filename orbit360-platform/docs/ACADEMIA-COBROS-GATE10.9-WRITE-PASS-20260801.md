# ACADEMIA — COBROS / CONCILIACIÓN — GATE 10.9 WRITE_PASS

**Fecha:** 2026-08-01  
**Clasificación:** `ACADEMIA_ACTUALIZAR`  
**Gate relacionado:** `block10.9-cobros-controlled-write-lab-v20260801`

## Propósito formativo

Convertir el cierre técnico del gate 10.9 en aprendizaje operativo para Dirección, Operativo, Cobros, Finanzas y Superadmin, sin exponer datos reales, secretos ni implementación protegida.

## Contenidos que deben incorporarse

### 1. Pago reportado, cobro confirmado y conciliación

El usuario debe distinguir:

- pago reportado por cliente;
- pago validado por el equipo;
- cobro aplicado al recibo;
- conciliación con fuente de aseguradora o banco;
- movimiento financiero.

Un pago reportado no es todavía un cobro confirmado. Un cobro confirmado tampoco debe crear automáticamente un `finmov` sin el flujo financiero autorizado.

### 2. Caso histórico reforzado

Un recibo de una vigencia reciente vencida puede ser necesario para aplicar correctamente un pago al requerimiento más antiguo. Registrar ese recibo histórico no reactiva la póliza ni convierte la vigencia vencida en cartera activa.

### 3. Controles del gate

Explicar con un caso práctico:

- snapshot previo;
- idempotencia;
- grupo atómico por caso;
- verificación posterior;
- rollback global;
- por qué ningún caso parcial debe quedar aplicado.

### 4. Clasificación de fallos

Incluir la diferencia entre:

- `FUNCTIONAL_DEFECT`;
- `DATA_CONTRACT_FAILURE`;
- `VALIDATOR_STALE`;
- `PIPELINE_MECHANISM_FAILURE`.

El caso 10.9 demostró que una diferencia entre `null` y cadena vacía en el snapshot esperado es un problema del contrato privado de control, no una razón para modificar el recibo canónico ni reimportar datos.

### 5. STOP_RETRY y causa raíz

Cuando la misma etapa falla dos veces:

- no se crea otro parche;
- no se modifica otro módulo;
- no se repite la escritura;
- se congela el producto;
- se diagnostica la capa exacta;
- se reabre únicamente después de una prueba read-only con cero bloqueos.

## Caso práctico sugerido

Un equipo intenta aplicar cinco cobros. Dos se escriben temporalmente, el tercero no coincide con el snapshot esperado y el gate detiene la operación.

Preguntas:

1. ¿Deben conservarse los dos primeros cobros?  
   **Respuesta esperada:** no; el rollback global debe restaurar el baseline.

2. ¿Debe reimportarse la base?  
   **Respuesta esperada:** no; primero se clasifica y diagnostica la divergencia.

3. ¿Una cadena vacía y `null` pueden ser equivalentes sin validación?  
   **Respuesta esperada:** no; el contrato debe preservar el valor canónico exacto o definir explícitamente una normalización.

4. ¿El recibo histórico reactiva la póliza?  
   **Respuesta esperada:** no.

5. ¿El cobro debe crear `finmov` automáticamente?  
   **Respuesta esperada:** no, salvo flujo financiero autorizado y conciliado.

## Evidencia de aprendizaje

La persona debe poder:

- clasificar correctamente un fallo;
- explicar por qué se detiene un reintento;
- reconocer qué colección puede modificarse;
- identificar cuándo corresponde rollback;
- separar Cobros de Finanzas;
- explicar el tratamiento de un recibo histórico.

## Rutas afectadas

- Administrativo / Operativo;
- Dirección / Superadmin / IT;
- Finanzas, según permisos;
- Asesor, en versión simplificada sobre estados visibles;
- Cliente, en versión simplificada sobre pago reportado y estado de revisión.

## Manuales y evaluaciones afectadas

- Manual Maestro — Pólizas, recibos y cobros;
- Manual de Cobros/Conciliación;
- curso operativo de Cobros;
- evaluación de fuentes y conciliación;
- lección transversal de gates y causa raíz para Superadmin/IT.

## Regla de privacidad

Academia no debe incluir:

- IDs reales;
- números de póliza;
- importes;
- nombres de clientes;
- hashes privados;
- secretos;
- rutas internas de backend visibles al usuario final.
