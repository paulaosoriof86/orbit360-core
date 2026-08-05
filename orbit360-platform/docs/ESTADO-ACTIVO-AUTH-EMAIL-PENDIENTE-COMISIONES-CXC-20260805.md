# ESTADO ACTIVO — AUTH CON IDENTIDAD PENDIENTE + COMISIONES/CxC

Fecha local: 2026-08-05 08:02 GT  
RC: `RC-AYS-LAB-CANONICA-01`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open

## 1. Recuperación de acceso LAB

Gate ejecutado:

```text
block-auth-access-recovery-lab-v20260805
```

Resultado:

```text
STOP_RETRY_CENSUS
DATA_CONTRACT_FAILURE
ADVISOR_PAULA_EMAIL_REQUIRED
```

La falla ocurrió durante el censo read-only, antes de desplegar Functions o escribir Auth/Firestore.

Contadores observados:

```text
Function onboarding desplegada: no
Auth creados: 0
Auth actualizados: 0
memberships creadas: 0
memberships actualizadas: 0
correos enviados: 0
Firestore writes: 0
Auth writes: 0
Hosting/Rules/reimportación: 0
producción/main/merge: 0
```

Causa raíz: el registro configurado de Paula existe, pero no contiene un correo válido en los campos de identidad admitidos. La autorización fue consumida y el request permanece inmutable. No se permite rerun.

Datos candidatos encontrados fuera del runtime, pendientes de decisión explícita de la dueña del tenant:

- `finanzasyadmin@aysseguros.com` — contacto identificado como Paula Osorio - AyS Seguros y referencia histórica más consistente;
- `paula.osorio@aysseguros.com` — contacto existente sin identidad nominativa confirmada;
- otro correo exacto que Paula defina como login oficial.

La corrección siguiente debe actualizar exclusivamente la configuración de identidad de Paula y usar un request/gate nuevo. No se elegirá un correo por inferencia.

## 2. Contrato funcional vinculante de comisiones

La planilla de comisiones es el evento económico primario.

Orden canónico:

```text
planilla confirmada
  → comisión causada
  → CxC contra aseguradora
  → base de liquidación/CxP de asesores
  → evidencia independiente para conciliación de primas

factura A&S posterior
  → vincula número, fecha, valor y soporte fiscal
  → concilia con la CxC existente
  → no origina ni duplica la CxC

pago de la aseguradora a A&S
  → cruza banco + planilla + CxC + factura
  → confirma recaudo financiero
```

Fuente vinculante:

`orbit360-platform/docs/CONTRATO-NEGOCIO-PLANILLA-COMISION-CXC-FACTURA-PAGOS-PORTAL-20260805.md`

Hallazgo sobre el estado vigente:

- el motor actual calcula comisión sobre prima neta recaudada y concilia esperado vs registrado;
- Block 11 creó relaciones de `planillasComisiones`, `comisionesDevengadas` y `conciliacionesComisiones`;
- Finanzas, CxC, CxP y liquidación de asesores permanecieron expresamente inactivas;
- por tanto, el encadenamiento durable requerido se clasifica `FUNCTIONAL_DEFECT` y debe implementarse en un bloque financiero posterior, sin reescribir las planillas ya preservadas.

## 3. Pagos reportados por cliente

El Portal ya contiene una capacidad funcional parcial:

- el cliente puede reportar un pago asociado a una cuota;
- puede adjuntar imagen o PDF;
- se registra una actividad en su expediente;
- se crea una gestión de validación;
- el estado queda pendiente de revisión/conciliación.

Cobros ya contiene estados y acciones para `Reportado por cliente`, `Validar`, `Conciliado` y `Confirmar`.

Brechas pendientes, registradas como no bloqueantes para el acceso:

1. persistencia durable del flujo Portal → propuesta → aprobación;
2. asignación por configuración a Carlos u otro owner operativo, no hardcode;
3. aplicación inteligente al requerimiento elegible más antiguo por cliente/póliza/aseguradora/moneda/monto/fecha;
4. estados aprobar/HOLD/rechazar/aplicado_en_aseguradora con auditoría;
5. factura/documento de aseguradora opcional vinculado al pago, recibo, póliza y expediente visible al cliente;
6. categoría del importador para facturas/documentos de cobro de aseguradora y matching inteligente.

## 4. Bloque 4 continúa

```text
Gate: PASS_COBROS_FULL_REPLAY
Estado: ACTIVE_READ_ONLY_MONTHLY_INTAKE_PARALLEL
```

El STOP de Auth no detiene:

- clasificación read-only de los 365 pagos;
- incorporación sanitizada de nuevas planillas y estados de cuenta;
- preservación de los cinco cobros existentes;
- tratamiento de soportes agregados en HOLD;
- preparación source-only del importador inteligente y del contrato financiero de planillas.

## 5. Próxima frontera

AUTH requiere un dato y una autorización nuevos:

1. Paula define el correo oficial de acceso.
2. Se corrige únicamente la configuración de identidad de Paula.
3. Se prepara un request nuevo, sin reutilizar el consumido.
4. Se valida un gate nuevo antes de secretos.
5. Se ejecuta nuevamente censo → Function onboarding si falta → identidades/memberships → correos → verificación.

Comisiones/Finanzas continúa en source-only hasta contar con su gate de escritura independiente.
