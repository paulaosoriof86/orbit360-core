# CONTROL DE CIERRE — CRM + ASEGURADORAS HASTA v1.202

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Baseline vivo

```txt
candidata Claude v1.197 empalmada
+ Cliente360/scope v1.198
+ Póliza/Recibos/Recaudo v1.199b
+ Renovaciones v1.200b
+ Emisión/Endosos v1.201
+ Directorios Aseguradoras GT/CO v1.202
+ backend protegido
+ documentación y Academia acumuladas
```

## Estado CRM

| Frente | Estado actual | Pendiente principal |
|---|---|---|
| Cliente360/scope/alta | implementado | smoke visual |
| Póliza/Recibos/Recaudo | implementado en aplicación | batch durable + smoke |
| Renovaciones | encaminada a Cotizador | regla A&S de cierre/gracia |
| Solicitud de emisión | implementada en Ops | backend transaccional/Drive |
| Endosos iniciales | implementados con bloqueos | reglas complejas GT/CO |
| Portal/documentos | visor y scope | Auth cliente/Drive real |

## Estado Aseguradoras

| Frente | Estado actual | Pendiente principal |
|---|---|---|
| Directorio/ficha en página | implementado | smoke responsive |
| KPI con detalle | implementado | validar con datos sanitizados |
| Importador GT/CO multihoja | implementado | dry-run visual |
| Fuente separada | implementada | confirmar mapeos |
| Deduplicación/calidad | implementada | resolver 4 bloqueos CO |
| Alta manual | país + dedupe + trazabilidad | smoke |
| Plataformas/contraseñas | credentialRef + bóveda | proveedor backend real |
| Cuentas bancarias | accountRef + ver/copiar temporal | proveedor backend real |
| Documentos | documentRef/visor | Drive real |
| Productos/tarifas | default-deny preservado | fuentes tarifarias reales |
| Academia | actualizada v1.202 | evidencia visual/progreso |

## Fuente real utilizada

```txt
GT: 14 candidatas operativas · 4 hojas soporte excluidas
CO: 16 candidatas · 1 hoja soporte excluida · 4 candidatas bloqueadas
```

No se escribió payload real. El parser se probó contra la estructura real y las pruebas sanitizadas/ficticias pasaron.

## Condición de cierre visual de Aseguradoras

Se requiere una única validación consolidada:

1. abrir Aseguradoras en escritorio y móvil;
2. comprobar KPI y detalle;
3. abrir ficha como página y regresar;
4. revisar origen/calidad;
5. revisar contactos/plataformas/bancos/documentos;
6. abrir importador;
7. cargar GT y CO por separado;
8. verificar conteos/bloqueos sin aplicar;
9. comprobar que “Aplicar” queda deshabilitado en modo local;
10. confirmar que no aparecen valores sensibles.

## Siguiente bloque de desarrollo

Después de esa validación:

```txt
Cotizador
→ inventario de fuentes por aseguradora/producto/país/moneda
→ gate default-deny
→ DTO persistente
→ historial real
→ Comparativo v110 aislado
→ oferta aceptada
→ Solicitud de emisión v1.201
```

En paralelo se documentarán las correcciones visuales observadas en Aseguradoras para Claude, sin detener el Carril B/C.

## Datos que se solicitarán en orden

1. evidencia visual/dry-run de directorios GT/CO;
2. decisión manual sobre las 4 candidatas CO;
3. archivos o catálogos de planes/tarifas/cotizaciones por aseguradora, separados por país;
4. reglas A&S faltantes de renovación/endosos conforme aparezca el bloqueo concreto.

No volver a pedir Clientes, Pólizas, Vehículos, Recibos, Cobros, Cartera o Comisiones ya procesados.

## Restricciones

- no merge/deploy/main;
- no secretos ni datos reales en repo;
- no aplicar directorios en store local;
- no habilitar Cotizador desde el directorio;
- no mezclar monedas;
- no crear módulos paralelos;
- no declarar cierre sin smoke visual;
- no repetir auditorías sin nuevo insumo.
