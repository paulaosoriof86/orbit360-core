# ACTUALIZACIÓN DELTA PARA CLAUDE — CRM v1.201

Fecha: 2026-07-11  
Estado: cambios locales/backend posteriores a candidata Claude v1.197.  
Uso: obligatorio en el siguiente paquete acumulado Claude.

## Regla incremental

Una candidata futura no puede reconstruir CRM desde la candidata v1.197 ni desde memoria. Debe conservar:

```txt
v1.198 scope + altas Cliente360
v1.199b Póliza/Recibos/Recaudo
v1.200b Renovaciones honestas
v1.201 Solicitud de emisión + Endosos en Ops
```

## Patrón nuevo obligatorio

### Propuesta aceptada

```txt
Comparativo
→ Registrar opción aceptada
→ gestión tipada en Ops / Emisiones
→ NO Póliza provisional
→ NO recibos
```

La gestión usa:

```txt
workflowType = issuance_request
```

### Emisión real

Solo se habilita cuando existen:

- documentos completos;
- inspección aprobada cuando aplica;
- número real;
- vigencias reales;
- documento de póliza emitida;
- usuario autorizado.

Entonces usa el motor `Orbit.policyReceipts` para crear Póliza y Recibos.

### Renovación

La nueva póliza se vincula:

```txt
nueva.renuevaDe = anterior.id
anterior.renovadaPor = nueva.id
```

No borrar ni reemplazar la póliza anterior. No cambiar su estado ni anular recibos hasta que exista regla A&S sobre fecha efectiva, gracia y traslape.

La UI de Renovaciones excluye la póliza ya vinculada para no volverla a gestionar.

### Endosos

```txt
Cliente 360
→ Solicitar endoso
→ gestión tipada en Ops / Renovaciones-Modif.
→ aprobación/documento/fecha efectiva
→ aplicar únicamente tipo configurado
```

Usa:

```txt
workflowType = endorsement_request
```

No editar directamente la póliza desde un prototipo para simular un endoso.

## UX que debe aparecer en la próxima candidata

- botón “Registrar opción aceptada” en Comparativo;
- explicación visible de que no crea póliza provisional;
- ficha de Solicitud de emisión dentro de Ops;
- etapas documentos/inspección/emisión;
- alta final con número y documento reales;
- vínculo de la nueva póliza con la anterior;
- acción Renovar encaminada a Cotizador/Comparativo;
- acción Endoso encaminada a Ops;
- ficha de endoso con estado, referencia y documento;
- tipos no configurados sin botón de aplicación;
- pólizas ya renovadas fuera del pipeline pendiente;
- copy “preparado” frente a “enviado” cuando no hay canal conectado.

## Permisos

- Asesor: consultar y solicitar gestión de endoso dentro de su alcance.
- Asesor: no emitir, no aplicar endoso, no modificar Póliza/Recibos.
- Operativo/Admin/Dirección: acciones conforme a extras y restricciones.
- Todo cambio crítico: motivo, antes/después y auditoría.

## Academia obligatoria

La candidata debe enseñar por rol:

- cotización con fuentes reales;
- aceptación;
- solicitud de emisión;
- documentos e inspección;
- número real;
- póliza y recibos;
- vínculo de renovación;
- endosos;
- bloqueos y permisos.

No eliminar cursos/progreso/certificados existentes.

## Archivos locales que Claude no debe sobrescribir

```txt
core/issuance-workflow-v1201.js
core/issuance-workflow-v1201-refinements.js
core/endorsement-workflow-v1201.js
modules/issuance-endosos-v1201-bridge.js
modules/issuance-endosos-v1201-refinements.js
modules/renewals-v1201-issued-filter.js
data/academia-v1201-emision-endosos.js
```

Claude debe traducir su impacto visual y de Academia; no reimplementar backend ni pisar protegidos.

## Pendientes visuales para Claude

- mejorar responsive de formularios largos de emisión/endoso;
- convertir fichas relevantes en página completa cuando corresponda;
- estados vacíos y confirmaciones claras;
- mostrar trazabilidad sin notas técnicas;
- integrar visor documental en la ficha;
- evidencia móvil/tablet/escritorio;
- conservar la ficha principal de Aseguradoras y el cierre de KPI transversal.

## Rechazo automático de candidata futura

Rechazar si:

- crea póliza al aceptar una propuesta;
- inventa número provisional;
- genera recibos antes de emitir;
- crea módulos separados para Emisiones/Inspecciones/Endosos fuera de Ops;
- borra la póliza o vehículo anterior;
- aplica endosos sin aprobación/documento;
- permite al Asesor modificar pólizas;
- vuelve a primas estimadas como oferta de aseguradora;
- afirma envío sin integración conectada;
- elimina los motores v1.198–v1.201.
