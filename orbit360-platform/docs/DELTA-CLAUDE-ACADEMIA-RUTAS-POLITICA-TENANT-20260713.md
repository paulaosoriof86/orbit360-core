# Delta Claude/Academia — política tenant, rol activo y scope

Fecha: 2026-07-13  
Origen: Carril B, contratos productivos reutilizables  
Aplicación: después de recibir y auditar la candidata incremental activa

## ¿Aplica a Claude/prototipo?

Sí. Aplica como patrón UX y Academia; no se comparten rutas internas, reglas, secretos ni datos reales.

## UX reusable

- El usuario ve sus roles asignados y puede seleccionar únicamente uno de ellos como vista activa.
- La interfaz explica que cambiar de vista cambia responsabilidades visibles, no crea permisos.
- La visibilidad de un módulo y el alcance de sus datos se muestran como conceptos diferentes.
- Scopes de lenguaje cliente: `Mis registros`, `Mi equipo`, `Todos`, `Sin acceso`.
- Cuando un asesor no encuentra un cliente o póliza, crea una gestión de corrección; no eleva su propio scope.
- Ampliar acceso requiere motivo, resumen antes/después y confirmación reforzada.
- Credenciales se muestran como conexión segura o acceso temporal auditado, nunca como valor persistido.

## Academia

Actualizar rutas existentes, sin duplicar cursos:

### Dirección / Administración

- tenant, membresía, roles asignados, rol default y rol activo;
- módulos base + extras - restricciones;
- scopes independientes por módulo;
- riesgo de ampliar de `Mis registros` a `Todos`;
- auditoría, motivo, antes/después y rollback.

### Asesor

- por qué ve únicamente sus clientes;
- datos que puede completar;
- datos críticos que no puede cambiar;
- gestión correcta cuando un registro no aparece o está asignado a otra persona;
- protección de documentos y credenciales.

### Operativo

- diferencia entre tener módulo visible y alcance `Todos`;
- resolución de gestiones de corrección;
- cuándo una operación financiera requiere un plan controlado y no una edición directa.

## Estados honestos sugeridos

```txt
Vista activa
Rol no asignado
Sin acceso a este módulo
Alcance limitado a mis registros
Requiere autorización para ampliar acceso
Solicitud de corrección registrada
Conexión segura pendiente
```

No mostrar `Firestore`, `Firebase`, rutas internas, rules, LAB, mocks ni secretos.
