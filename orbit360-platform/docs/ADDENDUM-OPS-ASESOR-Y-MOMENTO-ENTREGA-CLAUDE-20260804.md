# Addendum — Ops para Asesor y momento de entrega a Claude

Fecha: 2026-08-04  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Corrección funcional obligatoria

La regla anterior “el Asesor no accede a Ops y ve sus gestiones desde Leads” queda retirada.

La regla canónica es:

```text
El Asesor sí accede a Orbit Ops.
Su alcance por defecto es propios.
Solo ve negocios, clientes, pólizas, inspecciones, emisiones y gestiones
relacionados con su advisorId y con sus países autorizados.
No ve procesos de otros asesores ni configuración global.
```

Leads sigue siendo el pipeline comercial del Asesor. Ops es su vista operativa para:

- gestiones de clientes actuales;
- aplicaciones o correcciones de pago;
- sustituciones y endosos;
- renovaciones y modificaciones;
- inspecciones;
- emisiones;
- siniestros y solicitudes administrativas;
- calidad o corrección de datos;
- cualquier otra gestión asignada dentro de su cartera.

Una misma oportunidad no se duplica. Se proyecta en Leads y Ops según la etapa y la configuración del tenant.

## 2. Permisos del Asesor en Ops

### Puede

- abrir Ops;
- consultar únicamente su alcance propio;
- revisar estado, prioridad, vencimiento y próxima acción;
- ver notas, resultado, checklist y bitácora;
- abrir relaciones permitidas con cliente, póliza y oportunidad;
- recibir aviso cuando una gestión sea creada, asignada, modificada o resuelta;
- conocer el estado de inspección y emisión;
- consultar el historial de la gestión.

### No puede por defecto

- ver procesos de otros asesores;
- abrir scope equipo o todos;
- administrar listas globales;
- reasignar a otros asesores;
- cambiar configuración del tenant;
- cerrar, archivar o alterar etapas operativas reservadas al equipo;
- modificar pólizas, cobros o conciliaciones validadas;
- eliminar trazabilidad.

Los permisos adicionales se habilitan por configuración y auditoría, nunca por hardcode.

## 3. Notificaciones

El contrato reusable debe generar un evento y un elemento de outbox cuando una gestión propia:

- se crea;
- se asigna o reasigna;
- cambia de estado;
- recibe una nota relevante;
- queda resuelta;
- se reabre;
- entra en atraso o escalamiento.

Al resolverse, el aviso debe incluir como mínimo:

- gestión;
- cliente;
- póliza o negocio relacionado cuando aplique;
- resultado o anotación;
- actor que resolvió;
- fecha;
- enlace a la gestión.

La UI puede mostrar el cambio inmediatamente en sesión, pero solo el outbox y el proveedor confirman entrega durable. No se debe afirmar “enviado” cuando solo se preparó o abrió el canal.

## 4. Implementación source incorporada

Owners:

- `orbit360-platform/modules/ops.js`
- `orbit360-platform/modules/ops-workflows-v1201-bridge.js`
- `orbit360-platform/core/access-scope.js`
- `functions/ops-leads-domain.js`
- `functions/ops-advisor-inbox.js`
- `tools/orbit360-validar-ops-advisor-y-cobros-source-v20260804.mjs`

El frontend elimina la exclusión histórica, aplica `Orbit.access.canView(..., 'ops')`, oculta controles administrativos al Asesor y presenta la ficha de seguimiento en modo protegido.

El backend `ops-advisor-inbox` exige sesión y membership activa, aplica scope propios/equipo/todos/ninguno, y devuelve únicamente gestiones, negocios y avisos autorizados.

## 5. Corrección sobre Claude

No existe un envío automático desde esta conversación hacia Claude.

El proceso real es:

```text
ChatGPT/Codex prepara y valida el paquete descargable.
Paula descarga el paquete.
Paula lo entrega manualmente a Claude.
Claude produce una candidata frontend acumulativa.
ChatGPT/Codex audita y empalma selectivamente contra el baseline vivo.
```

No debe afirmarse que el paquete se envió externamente cuando Paula todavía no lo ha entregado.

## 6. Momento correcto para entregar el próximo paquete

El paquete no debe enviarse antes de incorporar esta corrección porque nacería obsoleto. Tampoco debe esperar hasta después del despliegue productivo, porque eso pausaría el carril frontend.

La compuerta exacta es:

```text
A. PASS de validación source de Ops/Leads/Asesor.
B. Replay inferencial completo de Cobros con conteos corregidos y HOLD reales.
C. Manifiesto de candidata acumulativa sellado con el HEAD vigente.
D. Paquete sanitizado generado desde ese mismo HEAD.
```

Al cerrar A+B+C, se entrega inmediatamente el paquete a Paula para que lo remita a Claude, mientras el backend continúa con activación y pruebas LAB. Así Claude trabaja en paralelo sin detener producción y sin recibir instrucciones que vuelvan a cambiar al día siguiente.

## 7. Regla de candidata Claude

La próxima candidata debe ser acumulativa y contener el mejor estado vigente de todos los módulos frontend aceptados.

Está prohibido:

- devolver un shell reducido;
- crear una versión paralela;
- excluir módulos aceptados;
- reconstruir desde un ZIP antiguo;
- reemplazar owners backend;
- sobrescribir `Orbit.store`, Auth, Rules, importadores protegidos o Functions;
- perder Academia, responsive, multirol, scopes, configuración, Cobros, Ops o Leads.

La candidata debe acompañarse de:

- manifest de archivos;
- versión y HEAD fuente;
- lista de owners tocados;
- lista de owners preservados;
- cambios por módulo;
- pendientes honestos;
- ausencia de datos A&S y secretos.

## 8. Estado

```text
Corrección Asesor→Ops source: implementada
Backend inbox reusable: implementado source-only
Validación automatizada: preparada
Replay operativo de Cobros: pendiente de fuentes montadas
Paquete descargable para Claude: no generado todavía
Momento de generación: inmediatamente después de A+B+C
Deploy/producción: no ejecutados
```
