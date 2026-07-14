# Delta para Claude y Academia — histórico financiero y movimientos operativos

Fecha: 2026-07-13  
Carril: A  
Estado: documentado para incorporar después de recibir la candidata actualmente en elaboración

## Regla de continuidad

Este delta NO autoriza crear una candidata paralela ni reemplazar la candidata que Claude está construyendo. Debe incorporarse en el siguiente empalme incremental, conservando como base la candidata más reciente auditada.

No contiene datos reales de A&S, nombres de contrapartes, montos, archivos fuente ni secretos.

## Patrón reusable que debe reflejar el prototipo

La plataforma comercializable debe distinguir visual y funcionalmente:

1. **Histórico importado:** registro proveniente de una fuente anterior y conservado con trazabilidad.
2. **Pendiente de revisión:** fila que necesita fecha, categoría, estado o validación individual.
3. **Reconciliado:** periodo cuyos totales coinciden con la fuente, pero que todavía no equivale a movimiento operativo.
4. **Listo para registrar:** movimiento realizado, fechado, no duplicado y aprobado.
5. **Registrado:** movimiento operativo confirmado y auditado.
6. **Omitido por duplicado:** registro ya existente que no debe crearse de nuevo.

## Copia de interfaz permitida

Usar términos de negocio:

- Histórico financiero
- Reconciliado
- Requiere revisión
- Listo para registrar
- Movimiento registrado
- Duplicado omitido
- Saldo de apertura
- Financiamiento recibido
- Devolución de financiamiento
- Pendiente de pago
- Realizado

No mostrar al usuario cliente:

- `financiero_historico`
- `finmovs`
- backend
- Firestore
- localStorage
- mock
- seed
- LAB
- nombres de contratos, colecciones o hashes técnicos

## Reglas visibles

- Guatemala y Colombia se muestran por separado.
- GTQ y COP nunca se suman entre sí.
- Un saldo de apertura no aparece como ingreso del periodo.
- Un financiamiento no aumenta producción ni metas comerciales.
- Un ingreso por comisión no es recaudo de prima del cliente.
- Un movimiento pendiente o parcial no aparece como realizado.
- Los duplicados deben mostrar por qué se omitieron.
- Toda acción de registro debe mostrar resumen antes/después y pedir confirmación.

## Flujo de UX

### Vista Histórico financiero

Debe permitir:

- filtrar por país, moneda, periodo, estado y categoría;
- ver resumen por periodo;
- abrir detalle de trazabilidad en lenguaje de negocio;
- revisar alertas de calidad;
- identificar pendientes de validación;
- seleccionar registros elegibles;
- solicitar registro controlado;
- ver historial de decisiones y reversión cuando corresponda.

### Puerta de registro

Antes de registrar, mostrar:

- cantidad seleccionada;
- país y moneda;
- ingresos y egresos separados;
- financiamientos separados;
- duplicados omitidos;
- pendientes bloqueados;
- resultado esperado;
- motivo obligatorio;
- confirmación explícita.

No usar una acción masiva ciega.

## Roles y scopes

- Dirección/AdminTenant: puede revisar, aprobar registro y solicitar rollback según permisos.
- Operativo: puede revisar y preparar el lote; la aprobación depende de configuración del tenant.
- Asesor: no ve el histórico financiero global salvo permiso extra y scope explícito.
- Cambiar el alcance a “todos” requiere motivo, antes/después y confirmación reforzada.

## Academia

Actualizar el curso existente de Finanzas/Migración; no crear curso duplicado.

Debe enseñar:

1. diferencia entre histórico y operación vigente;
2. país y moneda;
3. realizado, pendiente y parcial;
4. saldo de apertura;
5. financiamiento vs ingreso operativo;
6. comisión vs recaudo de prima;
7. reconciliación mensual;
8. duplicados y trazabilidad;
9. diff y confirmación;
10. auditoría y rollback;
11. permisos por rol y alcance;
12. por qué no se crean clientes, pólizas, cartera o cobros desde movimientos financieros.

Agregar evaluación con casos prácticos, progreso y actualización del certificado existente.

## Criterios de aceptación para Claude

- patrón genérico multi-tenant, sin A&S hardcodeado;
- sin datos reales ni montos reales;
- sin marcas de aseguradoras o contrapartes reales en seed;
- país y moneda configurables;
- responsive desktop/tablet/móvil;
- estados honestos;
- no declarar “registrado” antes de confirmación;
- no exponer copy técnico;
- Academia actualizada sin duplicar curso;
- manifiesto incremental actualizado.

## Pendiente

Incorporar este delta únicamente después de auditar la candidata que Claude está elaborando actualmente. Hasta entonces permanece documentado y no altera el frente de Claude.
