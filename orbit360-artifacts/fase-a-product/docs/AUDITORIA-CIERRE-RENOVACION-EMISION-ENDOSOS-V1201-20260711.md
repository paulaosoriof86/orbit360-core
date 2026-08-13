# AUDITORÍA Y CIERRE OPERATIVO — RENOVACIÓN, EMISIÓN Y ENDOSOS v1.201

Fecha: 2026-07-11  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge, deploy ni producción.  
Carriles: A — UX/Academia; B — contratos/permisos; C — modelo operativo A&S sanitizado.

## 1. Decisión aplicada

Se adopta la alternativa B, pero respetando la arquitectura maestra de Orbit:

```txt
la propuesta aceptada NO crea una colección o módulo paralelo
la propuesta aceptada crea una gestión tipada en Orbit Ops
workflowType = issuance_request
lista Ops = Emisiones
```

Esto permite controlar documentos, inspección, aceptación y emisión sin utilizar la entidad Póliza antes de tiempo.

## 2. Flujo canónico implementado

```txt
Póliza Vigente / Por renovar
→ gestión única de Renovación
→ Cotizador con contexto real
→ Comparativo con ofertas normalizadas
→ decisión confirmada del cliente
→ Solicitud de emisión en Ops
→ documentos completos
→ inspección aprobada, cuando aplica
→ Pendiente de emisión
→ número real + vigencias reales + documento de póliza
→ crear nueva Póliza + Recibos
→ vincular renuevaDe / renovadaPor
```

No se crea una póliza provisional, no se genera cartera antes de emitir y no se inventa un número.

## 3. Solicitud de emisión

Archivo principal:

```txt
core/issuance-workflow-v1201.js
```

La solicitud usa `gestiones` y contiene:

- tenant;
- cliente y asesor;
- aseguradora;
- país y moneda;
- ramo y producto;
- póliza origen, si es renovación;
- gestión de renovación;
- oferta aceptada y su referencia;
- prima desglosada;
- cantidad de pagos;
- documentos;
- checklist;
- bitácora;
- estado de emisión;
- auditoría y `operationId`.

Estados:

```txt
PROPUESTA_ACEPTADA
PENDIENTE_DOCUMENTOS
PENDIENTE_INSPECCION
PENDIENTE_EMISION
EMITIDA
RECHAZADA
CANCELADA
```

La llave idempotente evita solicitudes activas duplicadas para la misma combinación de póliza origen, cliente, aseguradora, ramo, producto y fuente.

## 4. Conversión a póliza

La conversión solo ocurre cuando existen:

- número real de la aseguradora;
- vigencia inicial y final reales;
- documento emitido mediante `documentRef`;
- documentos completos;
- inspección aprobada cuando aplica;
- rol autorizado.

La creación delega en `Orbit.policyReceipts.createPolicy`, por lo que conserva:

- llave canónica de póliza;
- validación tenant/país/moneda/aseguradora;
- prima separada;
- recibos deterministas;
- preservación de pagos;
- recaudo separado de `finmovs`;
- trazabilidad y auditoría.

## 5. Vínculo de renovación

Al emitir:

```txt
nuevaPoliza.renuevaDe = polizaAnterior.id
polizaAnterior.renovadaPor = nuevaPoliza.id
polizaAnterior.renovacionEstado = Renovada
```

La póliza anterior no se borra y su `estado` no se cambia automáticamente. El pipeline de Renovaciones la excluye mediante `renovadaPor`, evitando que vuelva a aparecer como pendiente.

Se bloquea una vigencia nueva que inicie antes de finalizar la póliza anterior:

```txt
traslape_requiere_regla_tenant
```

Permanece pendiente definir la regla A&S sobre recibos pendientes, periodo de gracia y cierre efectivo de la póliza anterior.

## 6. Endosos

Archivo principal:

```txt
core/endorsement-workflow-v1201.js
```

Los endosos se crean como gestiones tipadas:

```txt
workflowType = endorsement_request
lista Ops = Renovaciones / Modif.
```

Tipos iniciales reutilizables:

| Tipo | Aplicación actual |
|---|---|
| Sustitución de vehículo | soportada |
| Inclusión/exclusión de beneficiarios | soportada |
| Cambio de forma/frecuencia de pago | soportada si el motor lo permite |
| Datos no financieros del riesgo | soportada con allowlist |
| Cambio de propietario/tomador | solo gestión; pendiente de regla tenant |

Para aplicar se exige:

- referencia de aprobación de aseguradora;
- documento de endoso;
- fecha efectiva;
- rol autorizado;
- tipo con regla implementada.

La sustitución de vehículo no elimina el anterior: lo marca Histórico y crea el nuevo vínculo.

Un cambio de forma de pago pasa por `policyReceipts.updatePolicy`; si existen pagos incompatibles, continúa bloqueado.

## 7. Permisos

- Dirección/Admin/Operativo pueden gestionar emisión y aplicar endosos según restricciones.
- Asesor puede consultar y crear la solicitud de endoso dentro de su alcance.
- Asesor no puede convertir una solicitud en póliza ni aplicar un endoso.
- Los tipos no configurados permanecen como gestión y no mutan la póliza.

## 8. UX conectada

Archivos:

```txt
modules/issuance-endosos-v1201-bridge.js
modules/issuance-endosos-v1201-refinements.js
modules/renewals-v1201-issued-filter.js
```

Se conecta:

- Cotizador → captura contexto de riesgo/renovación;
- Comparativo → Registrar opción aceptada;
- opción aceptada → gestión Ops/Emisiones;
- ficha Ops → etapas y registro de emisión real;
- Cliente 360/Renovar → flujo Renovaciones/Cotizador;
- Cliente 360/Endoso → gestión Ops;
- ficha Ops de endoso → aprobación y aplicación;
- Renovaciones → excluye pólizas ya renovadas.

Copy honesto:

```txt
no crea una póliza provisional
no crea recibos antes de emitir
no representa un envío automático
no aplica tipos sin regla configurada
```

## 9. Academia

Se agregó:

```txt
data/academia-v1201-emision-endosos.js
```

Incluye rutas para Dirección, Operativo y Asesor sobre:

- cotización con fuentes reales;
- decisión del cliente;
- solicitud de emisión;
- documentos e inspección;
- número real;
- vínculo de renovación;
- endosos;
- límites por rol;
- evaluación aplicada.

## 10. Validadores y pruebas agregados

```txt
tools/orbit360-test-issuance-endosos-v1201.mjs
tools/orbit360-validar-emision-endosos-v1201.mjs
```

Cobertura prevista:

- aceptación obligatoria;
- no crear póliza al aceptar;
- idempotencia;
- requisitos de emisión;
- bloqueo por inspección/documentos;
- número/documento reales;
- vínculo anterior/nueva;
- no cambiar estado anterior;
- Asesor bloqueado para aplicar;
- endoso no muta antes de aprobar;
- sustitución no destructiva;
- ausencia de borrado físico.

Estos scripts quedaron versionados. Su ejecución en el repositorio local completo y el smoke visual/navegador siguen pendientes; no se reportan como ejecutados en este bloque.

## 11. Hallazgos que siguen abiertos

### Cotizador/Comparativo

- el DTO canónico de cotización todavía no está persistido de extremo a extremo;
- propuestas PDF/manuales del Comparativo requieren completar referencia al aceptar;
- el motor base aún contiene tasas genéricas/default que no deben confundirse con tarifas A&S validadas;
- falta comparar oferta aceptada contra valores finales emitidos y exigir motivo de variación;
- falta integrar los patrones avanzados de `comparativo_final_v110.html` de forma aislada;
- historial actual de Cotizador/Comparativo todavía depende de preferencias/variables de sesión.

### Renovación

- definir cierre de recibos pendientes de la póliza anterior;
- definir si hay periodo de gracia o traslape permitido;
- definir transición programada del estado de la póliza anterior;
- definir no renovación y recuperación.

### Endosos

- definir cambio de tomador/propietario para persona natural/jurídica y países GT/CO;
- definir cambios de suma/cobertura/prima;
- definir devoluciones o recibos adicionales;
- parametrizar documentos requeridos por aseguradora/ramo/tipo;
- conectar `documentRef` a Drive/backend real.

### Backend durable

- batch/transacción atómica;
- rollback ante fallo parcial;
- constraints server-side;
- validación tenant/rol/scope server-side;
- estado consolidado pending/synced/failed;
- jobs programados para cierre efectivo.

## 12. Estado

```txt
RENOVACION_A_EMISION: IMPLEMENTADA_A_NIVEL_APLICACION
SOLICITUD_EMISION_EN_OPS: IMPLEMENTADA
POLIZA_PROVISIONAL: PROHIBIDA
NUMERO_REAL: OBLIGATORIO
DOCUMENTO_EMITIDO: OBLIGATORIO
VINCULO_RENUEVA_DE_RENOVADA_POR: IMPLEMENTADO
CIERRE_POLIZA_ORIGEN: PENDIENTE_REGLA_AYS
ENDOSOS_SEGUROS_INICIALES: IMPLEMENTADOS
CAMBIO_TOMADOR: BLOQUEADO_HASTA_REGLA
ACADEMIA: ACTUALIZADA
TESTS_VERSIONADOS: SI
TESTS_EJECUTADOS_EN_REPO_COMPLETO: NO
SMOKE_VISUAL: PENDIENTE
DATOS_REALES_ESCRITOS: NO
DEPLOY: NO
MERGE: NO
```
