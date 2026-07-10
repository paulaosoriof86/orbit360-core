# CONTROL MAESTRO ACUMULADO — CLAUDE / BACKEND REPLICABLE / UX / ACADEMIA

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama obligatoria: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## 0. Propósito y jerarquía

Este documento corrige la fragmentación acumulada entre matrices, addenda, paquetes, bitácoras y pendientes Claude creados durante múltiples sesiones.

Desde esta fecha es el **índice y control vivo obligatorio** para trasladar a Claude todo cambio reusable que nazca en backend, seguridad, datos, importadores, reglas operativas, UX, manuales o Academia.

No reemplaza los contratos técnicos ni los documentos maestros. Los referencia y consolida en una única matriz de control.

Regla:

```txt
Ningún bloque backend reusable puede darse por documentado para Claude solo porque exista una bitácora técnica.
Debe aparecer también en este control maestro con:
- patrón reusable;
- módulos UX afectados;
- estado visual/prototipo;
- impacto Academia;
- estado de envío a Claude;
- condición de cierre.
```

## 1. Fuentes históricas que este control consolida

Como mínimo:

- `ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md`
- `MATRIZ-ACUMULADA-PENDIENTES-CLAUDE-20260706.md`
- `PATRONES-REPLICABLES-FUTUROS-TENANTS-ORBIT360-V1330-20260708.md`
- `PAQUETE-CLAUDE-ACUMULADO-POST-EQUIPO-CONFIG-M5-V1330-20260708.md`
- addenda de Portal/Cobros/Cliente360/Documentos/Storage/Roles/Equipo/Config/Academia
- registros P0 de pólizas, cartera, comisiones, banco, dry-run, confirmación y escritura controlada
- contratos de multirol, permisos, scopes, clientes, documentos, conciliaciones y fuentes separadas
- auditorías y pendientes Cotizador/Comparativo/Aseguradoras
- registro acumulado del importador transversal y Clientes P0 del 2026-07-09.

## 2. Regla de actualización por bloque

Cada bloque futuro debe agregar o actualizar una fila de la matriz maestra y responder:

```txt
Fecha:
Carril:
Módulo/regla:
Cambio backend/local:
Patrón reusable:
¿Aplica a Claude/prototipo?: Sí/No
UX requerida:
Academia requerida:
Manual/operación requerida:
Archivos fuente:
Estado backend:
Estado prototipo:
Estado Academia:
Estado enviado a Claude:
Condición de cierre:
```

Estados permitidos:

```txt
DOCUMENTADO
IMPLEMENTADO_BACKEND
PENDIENTE_PROTOTIPO
PENDIENTE_ACADEMIA
LISTO_PARA_CLAUDE
ENVIADO_A_CLAUDE
ATENDIDO_PARCIAL
CERRADO_VALIDADO
NO_APLICA_CLAUDE
```

## 3. Matriz maestra acumulada por dominio

### 3.1 SaaS, tenant y white-label

Patrones acumulados:

- A&S es primer tenant, no fork.
- Toda personalización vive en `Orbit.tenant`/configuración.
- Marca Orbit 360 en chrome; logo cliente solo slot white-label.
- Países, monedas, impuestos, glosario, módulos, aseguradoras, tarifas, integraciones y Academia son configurables.
- No hardcodear usuarios, clientes, pólizas, aseguradoras, tarifas o datos A&S.

Claude/UX:

- componentes deben reaccionar a tenant, país, moneda, rol activo y módulos habilitados;
- no incorporar marca A&S fuera de configuración;
- mantener UI comercializable para próximos intermediarios.

Academia:

- ruta Dirección/Superadmin: configuración tenant y white-label;
- explicar diferencia entre plataforma base y configuración del cliente.

Estado: `DOCUMENTADO / PENDIENTE_VALIDACION_TRANSVERSAL`.

### 3.2 Contrato Orbit.store y backend protegido

Patrones acumulados:

- módulos usan exclusivamente `Orbit.store`;
- API: `all/get/where/insert/update/remove/_emit`;
- módulos no usan almacenamiento operativo directo;
- adapter backend puede cambiar sin reescribir módulos;
- archivos LAB/Auth/store/importa/tools protegidos.

Claude/UX:

- ningún módulo nuevo debe depender de Firebase, Firestore, localStorage o API externa directa;
- no reemplazar archivos protegidos ni `index.html` híbrido.

Academia:

- solo enseñar operación y seguridad, no detalles internos ni secretos.

Estado: `IMPLEMENTADO_BACKEND / REGLA_PERMANENTE_CLAUDE`.

### 3.3 Auth, usuarios, multirol, rol activo y scopes

Patrones acumulados:

- un usuario puede tener múltiples roles;
- rol activo y rol default;
- visibilidad = módulos base + extras - restringidos;
- scope separado: propios/equipo/todos/ninguno;
- países y metas separados del rol;
- cambios sensibles requieren motivo, antes/después, fecha y confirmación reforzada si abren acceso a todos;
- último administrador activo protegido;
- ClientePortal no ve auditoría interna;
- AuditorSoloLectura no ejecuta acciones.

Claude/UX:

- selector de rol activo;
- indicación clara del alcance actual;
- Config/Equipo debe permitir administrar roles, extras, restricciones, scopes, países y estado;
- acciones sensibles con gate y bitácora;
- vistas de asesor limitadas a propios y relacionados.

Academia:

- rutas por rol activo;
- casos de cambio de scope, escalamiento y conflicto de permisos;
- evaluación sobre apertura de acceso a todos.

Estado: `IMPLEMENTADO_CONTRATOS / PENDIENTE_PROTOTIPO_COMPLETO / PENDIENTE_ACADEMIA_PROFUNDA`.

### 3.4 Cliente360, CRM, asesores y calidad de datos

Patrones acumulados:

- clientes por asesor;
- ficha 360 con pólizas, cobros, portal, gestiones, documentos visibles y calidad;
- asesor puede completar faltantes con formato y catálogos;
- asesor no puede borrar, fusionar, reasignar, cambiar estado operativo ni modificar pólizas/cobros/finmovs/documentos validados;
- si no aparece cliente/póliza o está asignado a otro asesor, se crea gestión de corrección;
- calidad debe tener vistas por asesor;
- estado inicial de migración puede ser `pendiente_polizas`;
- estado operativo final se deriva del cruce ya realizado con pólizas.

Claude/UX:

- tablero de calidad por asesor;
- edición guiada de faltantes;
- gestiones de corrección en lugar de acciones destructivas;
- etiquetas claras para temporal, requiere validación, duplicado exacto/probable y pendiente pólizas;
- no reabrir ni recalcular cruces ya cerrados sin nueva fuente o contradicción.

Academia:

- completar datos faltantes;
- diferencia entre corregir dato y cambiar estado operativo;
- duplicados exactos/probables;
- gestión de corrección por asignación incorrecta.

Estado: `MOTOR_CLIENTES_P0_IMPLEMENTADO / WIRE_IMPLEMENTADO / PENDIENTE_SMOKE_Y_UX_COMPLETA`.

### 3.5 Importador inteligente transversal

Patrones acumulados:

- un único hub transversal;
- Excel/CSV/PDF/imagen/documentos variables;
- detección de encabezados y sinónimos;
- propuesta de mapeo editable;
- normalización por país/moneda;
- duplicados exactos y probables;
- calidad de datos;
- dry-run crear/actualizar/omitir/requiere validación;
- trazabilidad archivo/hoja/fila/bloque/país/moneda/periodo;
- confirmación reforzada;
- escritura real bloqueada hasta autorización;
- fuentes separadas y colecciones permitidas/prohibidas;
- documentos soporte solo proponen diffs;
- motores P0 aditivos para clientes, pólizas, cartera, comisiones, banco, aseguradoras, marketing e identidad;
- `core/importa.js` protegido; integración por motores/wires mientras pase smoke.

Claude/UX:

- wizard único por pasos;
- perfilado de fuente;
- mapeo visual corregible;
- vista de descartados e irrelevantes;
- bandeja de validaciones bloqueantes;
- resumen por colección y estado;
- comparador/diff;
- no mostrar nombres internos, backend, LAB o fuente legacy;
- no simular que “importar” ya escribió datos.

Academia:

- fuentes separadas;
- dry-run vs escritura;
- mapeo y corrección;
- trazabilidad;
- duplicados;
- calidad;
- confirmación reforzada;
- seguridad documental.

Estado: `P0_IMPLEMENTADO_ADITIVO / NO_CERRADO_OPERACIONALMENTE`.

Condición de cierre:

1. CI/smokes visibles y aprobados.
2. Orden de carga validado.
3. Smoke visual del hub/drawer.
4. Bandejas mínimas operativas.
5. Scopes y permisos validados.
6. Escritura real sigue bloqueada.

### 3.6 Pólizas, vehículos, renovaciones, recibos y cartera

Patrones acumulados:

- llave póliza: número + parte/cliente + aseguradora + vigencia inicio/fin;
- estadoFuenteOriginal separado de estadoOperativoOrbit;
- Renovada puede estar vigente por vigencia real;
- Cancelada afecta vigencia exacta;
- solo vigente/por renovar genera recibos esperados/cartera;
- otros estados son histórico/recuperación;
- vehículos complementan pólizas, no crean pólizas extra;
- forma de pago define recibos esperados;
- recibo esperado no es cobro confirmado;
- cartera de primas no es CxC financiera.

Claude/UX:

- separar vigentes, por renovar, históricas, canceladas y recuperación;
- mostrar vigencia exacta;
- recibos esperados, fuente externa, cartera y conciliación como conceptos distintos;
- no botón que reactive o cobre automáticamente sin gate.

Academia:

- estados de póliza;
- vigencia exacta;
- recibos esperados;
- cartera viva vs histórico;
- renovación activa vs recuperación comercial.

Estado: `MODELO_Y_MOTORES_P0_IMPLEMENTADOS / CRUCES_BASELINE_CERRADOS / PENDIENTE_SMOKE_TRANSVERSAL`.

### 3.7 Cobros, pagos reportados, conciliaciones y banco

Patrones acumulados:

- pago reportado por cliente ≠ confirmado;
- depósito bancario ≠ cobro aplicado;
- estado de cuenta aseguradora ≠ pagado;
- propuesta ≠ validada ≠ aplicada/conciliada;
- validación no escribe automáticamente;
- banco no crea finmov definitivo;
- país/moneda obligatorios;
- motivo y auditoría en validar/rechazar/bloquear/anular;
- anulación con confirmación reforzada;
- soporte metadata-only y visibilidad por rol.

Claude/UX:

- estados honestos;
- separar reportado, en revisión, validado no aplicado, conciliado y rechazado;
- no usar “Aplicar pago” si aún no hay autorización;
- mostrar soporte, país, moneda y trazabilidad;
- bandeja M5 y tablero de conciliación.

Academia:

- ciclo completo de reporte a conciliación;
- casos sin país/moneda;
- prevención de doble aplicación;
- diferencia entre caja, cobro y conciliación.

Estado: `CONTRATOS_Y_MOTORES_IMPLEMENTADOS / UX_PARCIAL / PENDIENTE_SMOKE`.

### 3.8 Comisiones, facturas, CxC, CxP y liquidación de asesores

Patrones acumulados:

- producción/metas/comisiones sobre prima neta recaudada;
- prima neta/gastos/IVA/total separados;
- planilla → comisión devengada;
- factura comisión → CxC comisión;
- banco confirma recaudo mediante conciliación;
- liquidación asesor → CxP asesor;
- pago asesor requiere aprobación;
- primas pendientes no son CxC/CxP financieras;
- factura emitida no es ingreso real.

Claude/UX:

- tableros separados de producción, recaudo, facturación, CxC, CxP y caja;
- flujo visual de conciliación factura-planilla-banco;
- aprobación de liquidación y pago;
- separación por país/moneda/asesor.

Academia:

- ciclo de comisión;
- prima pendiente vs CxC;
- devengado vs facturado vs recaudado vs pagado;
- metas sobre neta recaudada.

Estado: `MOTOR_P0_IMPLEMENTADO / TABLEROS_Y_FLUJO_FINAL_PENDIENTES`.

### 3.9 Documentos, OCR, adjuntos, Storage futuro y parches

Patrones acumulados:

- metadata-only en store;
- no base64/bytes/URLs públicas;
- Storage pendiente no se simula;
- documento no modifica entidad maestra directamente;
- extracción genera propuesta/diff/parche;
- validación humana y auditoría;
- documentos de identidad, dirección, jurídicas, pólizas, facturas, pagos, vehículos, banco y cotizaciones;
- visibilidad por rol y relación;
- estado `pendiente_storage`/equivalente honesto.

Claude/UX:

- visor de documento + extracción propuesta + diff;
- confirmar/rechazar campo por campo;
- estado de lectura/validación/storage;
- documentos visibles para cliente/asesor solo según permisos;
- no presentar OCR como dato definitivo.

Academia:

- lectura documental;
- validación humana;
- seguridad y privacidad;
- documentos que proponen datos para Cliente360, pólizas, cobros y Cotizador.

Estado: `CONTRATOS_COMPLETOS / PROTOTIPO_PARCIAL / BACKEND_STORAGE_REAL_PENDIENTE`.

### 3.10 Portal cliente, invitaciones y acceso

Patrones acumulados:

- acceso por invitación/usuario autorizado;
- estado de activación visible;
- cliente ve pólizas, recibos, documentos, gestiones y pagos reportados;
- solicitudes generan gestión, trazabilidad y notificaciones;
- soporte de pago queda pendiente de revisión;
- no exponer auditoría interna ni secretos;
- PWA y estado de conexión honestos.

Claude/UX:

- onboarding cliente;
- estado acceso portal;
- reportar pago con soporte;
- solicitudes y tiempos de respuesta;
- historial visible al cliente separado de auditLog interno.

Academia:

- ruta Cliente nuevo;
- reportar pagos;
- solicitar gestiones;
- privacidad y expectativas de servicio.

Estado: `CONTRATOS_Y_HOTFIXES_P0 / PENDIENTE_VALIDACION_VISUAL_COMPLETA`.

### 3.11 Ops, Leads, gestiones, notificaciones y correo

Patrones acumulados:

- solicitudes de cliente/asesor se convierten en gestiones;
- recuperación comercial crea negocio en Leads; reemisión operativa va a Ops;
- ruteo por tipo, prioridad, país, asesor y responsable;
- notificación preparada ≠ enviada;
- correo preparado ≠ enviado;
- canal configurado ≠ conectado;
- plantillas por tenant y audiencia;
- un solo punto de integración futura.

Claude/UX:

- bandejas y estados honestos;
- botones “Preparar correo/mensaje” cuando no hay proveedor;
- trazabilidad de audiencia/canal;
- evitar promesas de envío real;
- diferenciar actividad, gestión, comunicación preparada y evento automático.

Academia:

- ruteo de gestiones;
- cuándo usar Leads vs Ops;
- estados de comunicación;
- escalamiento y SLA.

Estado: `HOTFIXES_Y_CONTRATOS_AVANZADOS / PENDIENTES_PUNTUALES_DE_COPY_Y_SMOKE`.

### 3.12 Aseguradoras y configuración operativa

Patrones acumulados:

- aseguradora por país/moneda;
- múltiples contactos conservados;
- ramos/productos;
- cuentas y accesos con `credentialRef/backend_required`;
- documentos/drive comercial;
- comisiones, cartera, tarifas y planes;
- desactivar antes que borrar;
- integración con Cotizador/Comparativo;
- directorios reales procesados sin credenciales.

Claude/UX:

- ficha configurable por país;
- contactos múltiples;
- estados de conexión segura;
- cuentas/drive/documentos sin secretos visibles;
- tabs de productos, tarifas, cartera y comisiones;
- acción desactivar con motivo/auditoría.

Academia:

- configuración y mantenimiento de aseguradoras;
- seguridad de accesos;
- relación con Cotizador, Pólizas, Cartera y Comisiones.

Estado: `IMPORTADOR_Y_CONTRATOS_IMPLEMENTADOS / MODULO_Y_SMOKE_PENDIENTES`.

### 3.13 Cotizador y Comparativo

Patrones acumulados:

- módulos core comercializables;
- `comparativo_final_v110.html` es fuente avanzada, no código para copiar directo;
- planes, tarifas, coberturas, deducibles, primas, condiciones y exclusiones por configuración;
- país/moneda obligatorios;
- tarifas oficiales validadas;
- documento puede proponer tarifa, no aprobarla;
- cotización no es emisión;
- integración con Aseguradoras, Cliente360 y expediente.

Claude/UX:

- conservar e integrar avance funcional v110;
- no rehacer desde cero;
- desacoplar Firebase directo y hardcode;
- comparador configurable;
- advertencias y trazabilidad de tarifa;
- guardar propuesta/cotización sin simular emisión.

Academia:

- ruta Asesor: cotizar, comparar, explicar deducibles/coberturas/exclusiones;
- ruta Operativo/Admin: mantener planes y tarifas;
- evaluación con caso práctico.

Estado: `AUDITADO_Y_DOCUMENTADO / INTEGRACION_PROTOTIPO_PENDIENTE / CLAUDE_REQUERIDO_EN_FASE_CORRESPONDIENTE`.

### 3.14 Configuración, Equipo, integraciones y automatizaciones

Patrones acumulados:

- configuración completa por tenant;
- usuarios, roles, módulos, restricciones, scopes, países, metas y estado;
- integraciones configurada ≠ activa;
- secretos fuera del frontend;
- cambios administrativos auditables;
- Make, correo, WhatsApp, Google, Metricool, Mailchimp, Canva, IA y endpoint propio como addons configurables;
- no mostrar activo sin conexión real.

Claude/UX:

- panel de configuración por secciones;
- estados pendiente configuración/pendiente conexión/conectado;
- gates y motivo;
- bitácora visible según rol;
- ocultar vocabulario técnico interno.

Academia:

- Dirección/Superadmin/IT;
- gestión de usuarios y addons;
- seguridad de secretos;
- mantenimiento trimestral.

Estado: `CONTRATOS_Y_GATES_AVANZADOS / PROTOTIPO_PARCIAL`.

### 3.15 Auditoría unificada, acciones sensibles y estados honestos

Patrones acumulados:

- auditLog separado de historial cliente;
- antes/después, actor, fecha, motivo, tenant, severidad/categoría;
- no guardar secretos, bytes o base64;
- confirmación reforzada para acciones críticas;
- estados honestos en toda UI;
- no afirmar envío, aplicación, conexión, conciliación o persistencia no ejecutada.

Claude/UX:

- modales de motivo;
- confirmaciones reforzadas;
- bitácora filtrable;
- textos honestos uniformes;
- auditoría interna restringida.

Academia:

- seguridad, responsabilidad y trazabilidad;
- casos de acciones sensibles.

Estado: `CONTRATO_BACKEND_AVANZADO / VALIDACION_TRANSVERSAL_PENDIENTE`.

### 3.16 Academia profunda

Acumulado obligatorio:

- rutas por rol/vista activa;
- prerequisitos, duración, progreso, evaluaciones, certificados y versiones;
- lecciones conectadas con acciones reales;
- casos y simulaciones;
- actualización continua cuando cambia un módulo;
- manuales y notificaciones;
- multirol, scopes, importador, calidad, gestiones, portal, permisos, documentos, conciliación, Cotizador/Comparativo, migración por fuentes y seguridad.

Estado real:

- documentación y addenda: avanzadas;
- implementación visual profunda: pendiente;
- backend de progreso/certificados: pendiente posterior a Auth/store/documentos reales.

Estado: `DOCUMENTADO_PROFUNDO / IMPLEMENTACION_PENDIENTE`.

## 4. Modificaciones locales/prototipo que Claude debe conocer

Claude debe conservar, replicar o no revertir:

- hotfixes de estados honestos en Portal, Cobros, Conciliaciones, Cliente360, Marketing, Reportes, Correo, Automatizaciones, Siniestros y Cancelaciones;
- gates de Equipo/Configuración y acciones sensibles;
- separación de historial visible vs auditoría interna;
- contratos metadata-only de documentos;
- módulos/wires P0 aditivos del importador;
- Cliente360 Documentos/Parches/Roles;
- visibilidad multirol/scopes;
- no perder scripts LAB/protegidos en index;
- no reintroducir fechas fijas, textos técnicos, datos reales, demo mezclada o estados falsos.

## 5. Qué NO se entrega a Claude

- datos reales A&S;
- payloads de clientes, pólizas, cobros, banco o planillas;
- secretos, tokens o credenciales;
- configuraciones sensibles;
- service accounts;
- lógica interna exclusiva de seguridad;
- archivos backend protegidos para reemplazo;
- rutas privadas.

## 6. Estado de envío a Claude

Estado global actual: `ACUMULANDO — NO ENVIADO COMO PAQUETE INTEGRAL POST-20260709`.

Claude será requerido cuando ocurra uno de estos hitos:

1. Inicio del cierre visual del importador transversal.
2. Integración Aseguradoras ↔ Cotizador/Comparativo.
3. Ajustes visuales multirol/Cliente360/Calidad.
4. Implementación profunda de Academia.
5. Nueva candidata que deba incorporar todos los hotfixes y patrones acumulados.

Al activarse uno de estos hitos, no se debe preparar un paquete parcial desde memoria. Debe generarse desde este control maestro más los contratos fuente vigentes.

## 7. Condición de aceptación de futura candidata Claude

No aceptar candidata si:

- pisa backend protegido;
- pierde hotfixes o módulos existentes;
- reintroduce estados falsos;
- mezcla fuentes;
- hardcodea A&S/datos reales;
- usa Firebase/localStorage directo;
- omite multirol/scopes;
- ignora documentos/diffs;
- rehace Cotizador/Comparativo en lugar de integrar v110;
- no actualiza Academia/manuales;
- no entrega inventario de archivos modificados;
- no incluye criterios de smoke y regresión.

## 8. Próxima actualización obligatoria

Cada bloque futuro debe actualizar este archivo o crear un registro que lo referencie expresamente. Si pasan dos bloques reutilizables sin actualización, activar circuit breaker y corregir antes de continuar.
