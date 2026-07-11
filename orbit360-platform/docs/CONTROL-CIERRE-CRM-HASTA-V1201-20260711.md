# CONTROL DE CIERRE OPERATIVO CRM — HASTA v1.201

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Baseline acumulado obligatorio

```txt
candidata Claude v1.197 empalmada
+ Cliente360/scope v1.198
+ Póliza/Recibos/Recaudo v1.199b
+ Renovaciones v1.200b
+ Solicitud de emisión/Endosos v1.201
+ backend protegido
+ fuentes A&S sanitizadas procesadas
```

## Estado por frente

| Frente | Estado | Pendiente para cierre total |
|---|---|---|
| Cliente360 scope y alta | implementado | smoke visual/dataset sanitizado |
| Póliza alta/actualización | implementado en aplicación | batch/constraint backend + smoke |
| Recibos/cartera | idempotente/no destructivo | transacción durable + smoke |
| Recaudo | separado de `finmovs` | persistencia backend + conciliación autorizada |
| Conciliación | propuesta separada | aplicación bancaria/aseguradora posterior |
| Renovaciones KPI/campaña | corregido | smoke visual |
| Cotizador en renovación | contexto implementado | cierre de fuentes/DTO |
| Comparativo a emisión | solicitud Ops implementada | DTO persistente y v110 |
| Solicitud de emisión | implementada en `gestiones` | Drive real + batch durable |
| Conversión a póliza | número/documento reales | smoke y backend transaccional |
| Vínculo anterior/nueva | implementado | regla de cierre/gracia A&S |
| Endoso vehículo | implementado | smoke y documentos reales |
| Endoso beneficiarios | implementado | formatos/documentos por aseguradora |
| Endoso forma de pago | implementado con guard | reglas de cobros adicionales/devoluciones |
| Datos no financieros del riesgo | allowlist implementada | parametrización tenant |
| Cambio de tomador | bloqueado honestamente | regla legal/operativa GT/CO |
| Portal cliente | scope/visor | Auth cliente real |
| Academia CRM | actualizada hasta v1.201 | evidencia visual/progreso |

## Módulos CRM que todavía no se declaran cerrados

1. Cotizador.
2. Comparativo.
3. Documentos reales/Drive.
4. Cierre programado de renovación.
5. Endosos financieros/complejos.
6. Smoke consolidado responsive.

## Regla de avance

No abrir un rediseño completo de Ops/Leads antes de:

1. cerrar Aseguradoras con directorios GT/CO;
2. cerrar Cotizador y Comparativo con fuentes válidas;
3. ejecutar el smoke CRM consolidado;
4. resolver únicamente las decisiones operativas A&S que bloqueen datos reales.

Ops ya se usa como infraestructura transversal de gestiones para renovaciones, emisiones y modificaciones; no se creará un módulo paralelo.

## Decisiones A&S pendientes

### Renovación

- ¿En la fecha efectiva se anulan todos los recibos no pagados de la póliza anterior, o existe gracia/traslape?
- ¿El estado anterior cambia a `Vencida`, `Renovada` u otro estado histórico canónico?
- ¿Qué ocurre si la nueva póliza inicia después del vencimiento y queda una brecha?

### Endosos

- cambio de tomador/propietario: ¿se reasigna el expediente o se crea una nueva relación/cliente?
- cambios de cobertura/suma/prima: ¿generan recibos adicionales, notas crédito o reemplazo de plan?
- documentos obligatorios por tipo, aseguradora y país.

Estas decisiones no bloquean el inicio del cierre de Aseguradoras y Cotizador/Comparativo; los flujos quedan bloqueados de forma segura donde todavía faltan reglas.

## Siguiente bloque operativo

```txt
Aseguradoras GT/CO sanitizadas
→ identidad/contactos/plataformas/cuentas/productos/documentos
→ vínculo real con pólizas existentes
→ disponibilidad para Cotizador
→ validación visual del directorio/ficha
```

Después:

```txt
Cotizador
→ fuentes default-deny
→ DTO de cotización
→ documentos/ofertas reales
→ Comparativo profundo v110
→ aceptación → Solicitud de emisión v1.201
```

## Restricciones

- no merge/deploy/main;
- no secretos ni payload real en código;
- no contraseñas en frontend;
- no reemplazar protegidos;
- no inventar tarifas/primas/números;
- no simular canales;
- no mezclar monedas;
- no borrar históricos;
- no declarar smoke sin ejecutarlo.
