# Prompt para Claude — candidata acumulativa genérica Orbit 360

Trabaja exclusivamente sobre la última candidata frontend acumulativa que ya conserva el mejor estado aceptado de Orbit 360. Este paquete es un overlay selectivo: no es una plataforma independiente ni autoriza reconstruir el producto desde cero.

## Objetivo

Entregar una nueva candidata frontend única, acumulativa, comercializable, white-label, multi-tenant y responsive que incorpore las mejoras descritas en el paquete sin perder ningún módulo, flujo, diseño, Academia o comportamiento previamente aceptado.

## Reglas no negociables

1. Audita primero el baseline vigente y conserva todo lo que ya funciona.
2. Empalma selectivamente; nunca reemplaces el árbol completo.
3. No entregues un shell reducido, una versión paralela ni módulos aislados.
4. No sobrescribas backend, Auth, Rules, `Orbit.store`, adaptadores Firestore, importadores protegidos ni validadores.
5. No incluyas datos, personas, aseguradoras, archivos, cifras, países, monedas, impuestos o credenciales de un tenant concreto.
6. Todo comportamiento particular debe provenir de configuración del tenant.
7. No muestres copy técnico al cliente.
8. Mantén Chrome Orbit 360 y utiliza la marca del tenant solo en el slot white-label.
9. Conserva responsive para Dirección desktop, Operativo tablet, Asesor móvil y Portal.
10. Reporta cada owner tocado y cada owner preservado.

## Cambios que debe incorporar

### Ops y Leads

- El Asesor sí accede a Ops con alcance `propios`.
- Solo ve clientes, pólizas, gestiones, cotizaciones, inspecciones y emisiones relacionadas con su cartera.
- No ve otros asesores ni controles globales.
- Leads sigue siendo el pipeline comercial y Ops la operación del mismo negocio y de gestiones no comerciales.
- Una oportunidad se proyecta en ambas vistas según etapa, sin duplicarse.
- Mostrar estado, prioridad, vencimiento, próxima acción, notas, resultado, checklist, bitácora y relaciones.
- Mostrar notificación honesta: preparada, pendiente de proveedor o entregada según evidencia.

### Importaciones mensuales

Crear una experiencia integrada en Importar para:

- calendario de recibos;
- pagos reportados;
- reportes de pago de aseguradora;
- estados de cartera;
- planillas de comisiones;
- estados bancarios;
- documentos soporte.

Flujo UX:

```text
Adjuntar → detectar → mapear → normalizar → calidad
→ dry-run → confirmar evidencia → revisar conciliación
→ confirmar aplicación → trazabilidad/rollback
```

La interfaz debe:

- aceptar Excel, CSV, PDF, Word e imagen;
- permitir corregir mappings;
- reutilizar perfiles aprendidos por tenant y fuente;
- mostrar archivo, hoja, fila, bloque, periodo y hash;
- separar listos, requiere validación, omitidos y HOLD;
- impedir que un estado bancario cree cobros o movimientos financieros directamente;
- impedir que una planilla aplique recibos directamente;
- conservar confirmación humana.

### Cobros y Conciliaciones

Mostrar de forma clara y separada:

```text
Pago reportado válido
Conciliación directa
Reconocimiento de aseguradora
Secuencia por planilla
Secuencia por cartera
Pendiente según aseguradora
HOLD
Aplicado al recibo
```

Cada propuesta debe explicar evidencia, confianza, contradicciones y siguiente acción.

### Configuración

Permitir configurar por tenant:

- etapas y transiciones;
- visibilidad Leads/Ops;
- listas y tipos de gestión;
- SLA, prioridades y escalamiento;
- scopes;
- perfiles y sinónimos de importación;
- tolerancias de conciliación;
- reglas inferenciales y HOLD;
- canales de notificación.

### Academia

Actualizar la formación por rol para enseñar:

- Ops del Asesor con alcance propio;
- flujo mensual de importación;
- diferencia entre extracción, evidencia, conciliación y aplicación;
- banco versus cobro versus movimiento financiero;
- calidad, HOLD, confirmación y rollback;
- diferencia entre defecto funcional, contrato de datos, pipeline y validador.

## Entrega obligatoria

Entregar:

1. candidata frontend acumulativa completa;
2. manifiesto de archivos;
3. versión y baseline usados;
4. owners modificados;
5. owners preservados;
6. cambios por módulo;
7. pendientes honestos;
8. confirmación de ausencia de datos reales y secretos;
9. instrucciones de empalme selectivo.

No declares backend activo, notificaciones entregadas o integraciones conectadas si no existe evidencia runtime.
