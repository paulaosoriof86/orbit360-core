# Academia Orbit 360 — actualización onboarding, Cobros, Ops y Leads

Fecha: 2026-08-04  
Clasificación: `ACADEMIA_ACTUALIZAR`  
Aplicación: reusable para cualquier tenant.

## Objetivo

Enseñar el funcionamiento real del producto y evitar que los usuarios confundan registros, estados o acciones preparadas con operaciones ya confirmadas por backend o proveedor.

## Ruta Dirección / Administrador del tenant

### Equipo y acceso

- Crear una persona en Equipo no equivale automáticamente a habilitar acceso.
- Configurar roles, rol predeterminado, países, scopes y módulos.
- Crear o vincular identidad y membership desde la plataforma.
- Comprender estados Pendiente, Habilitando, Invitado, Activo, Bloqueado y Requiere atención.
- Exigir motivo para cambios de alcance.
- Aplicar confirmación reforzada cuando un usuario pasa a `todos`.
- Revisar bitácora antes/después y actor.

### Configuración de Ops/Leads

- Definir etapas, transiciones y visibilidad por tablero.
- Configurar listas, prioridades, SLA, cadencias, tipos de gestión y canales.
- Definir qué roles crean, asignan, resuelven, reabren o archivan.
- Establecer preferencias de notificación y proveedores reales.
- Revisar cuellos de botella, vencimientos y conversiones.

### Cobros y conciliación

- Diferenciar pago reportado, conciliado y aplicado.
- Revisar evidencia directa e inferida.
- Confirmar aplicaciones únicamente con contraparte suficiente.
- Mantener reversos y contradicciones en HOLD.
- Auditar archivo/hoja/fila, póliza, vigencia, cuota, moneda y periodo.

## Ruta Operativo

### Gestiones

- Crear una gestión desde Ops o Cliente 360.
- Asignarla al responsable correcto.
- Vincular cliente, póliza, negocio y aseguradora.
- Completar checklist y resultado.
- Resolver o reabrir sin borrar historia.
- Reconocer solicitudes originadas en Portal.
- Confirmar qué notificación quedó preparada y cuál fue entregada.

### Ciclo comercial

- Cotizando aparece simultáneamente en Leads y Ops.
- Al enviar propuesta deja de requerir ejecución en Ops y continúa en Leads.
- Al pasar a inspección o emisión vuelve a Ops sin crear otro negocio.
- La emisión no crea póliza hasta recibir número y documento reales.

### Cobros

- Un pago de la plataforma es válido aunque aún esté pendiente de cruce.
- Una planilla positiva de aseguradora puede conciliar la cuota incluida.
- Una secuencia continua puede conciliar cuotas anteriores.
- Un estado completo de cartera puede demostrar que cuotas anteriores ya fueron reconocidas.
- Banco aislado o ausencia aislada no son suficientes.

## Ruta Asesor

- Ver únicamente clientes, negocios y gestiones dentro del scope activo.
- Consultar en Leads las gestiones operativas que le fueron asignadas.
- Completar datos faltantes permitidos sin modificar información crítica.
- Dar seguimiento a propuestas y negociaciones.
- Consultar etapas espejo de inspección y emisión.
- Crear una gestión de corrección cuando falta cliente/póliza o está asignado a otro asesor.
- No aplicar cobros, modificar finmovs ni validar documentos sin permiso.

## Ruta Cliente / Portal

- Solicitar gestión vinculada a una póliza o de carácter general.
- Consultar que la solicitud fue recibida.
- Ver respuestas durables en el Portal.
- Reportar un pago sin que el sistema afirme conciliación inmediata.
- Recibir confirmación cuando la revisión y aplicación hayan terminado.
- Consultar notificaciones y estado de sus gestiones.

## Casos prácticos obligatorios

### Caso 1 — cuota 5 en planilla

La aseguradora reconoce la cuota 5 y el calendario de la vigencia contiene cuotas 1 a 5 sin contradicción.

Resultado esperado:

```text
cuota 5 → conciliada por reconocimiento de aseguradora
cuotas 1–4 → conciliadas por secuencia de planilla
```

### Caso 2 — primera pendiente en cartera

Un estado completo de cartera muestra como primera pendiente la cuota 5 y contiene de forma continua las cuotas 5 en adelante.

Resultado esperado:

```text
cuotas 1–4 → conciliadas por secuencia de cartera
cuota 5 en adelante → pendientes según aseguradora
```

### Caso 3 — reverso

Una planilla presenta una línea negativa o una reversión.

Resultado esperado:

```text
HOLD_REQUIERE_VALIDACION
```

No se compensa silenciosamente ni se crea un cobro negativo automático.

### Caso 4 — gestión desde Portal

El cliente solicita una copia o modificación.

Resultado esperado:

```text
Portal → gestión durable → Ops → responsable → respuesta → notificación durable → Portal
```

### Caso 5 — propuesta a emisión

El asesor envía la propuesta y el cliente acepta.

Resultado esperado:

```text
Cotizando: Leads + Ops
Propuesta/Negociación: Leads
Inspección/Emisión: Leads + Ops
Emitida: cierre + póliza real solo con número/documento
```

## Seguridad y gates

- Antes de runtime se valida el contrato del gate.
- Un fallo del validador no se clasifica automáticamente como defecto funcional.
- Dos fallos de la misma etapa obligan a detener reintentos y diagnosticar causa raíz.
- Las pruebas deben usar snapshot antes/después, idempotencia, trazabilidad y rollback.
- Las evidencias compartidas deben estar sanitizadas.

## Evaluación sugerida

1. Clasificar diez ejemplos entre reportado, conciliado, aplicado y HOLD.
2. Construir un flujo Ops/Leads sin duplicar el negocio.
3. Detectar una notificación preparada pero no entregada.
4. Configurar un rol Asesor con scope propios.
5. Explicar la diferencia entre `FUNCTIONAL_DEFECT`, `DATA_CONTRACT_FAILURE`, `PIPELINE_MECHANISM_FAILURE` y `VALIDATOR_STALE`.
