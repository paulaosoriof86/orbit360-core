# Contrato visual/funcional de referencia SIGA CRM → Orbit 360

Fecha: 2026-07-31  
Fuente privada: `Capturas de Pantalla SIGA CRM.docx`  
SHA-256: `74391388a9c2aec8af2caab9c263482a4b68332ec7727289d90393d73184aac3`  
Páginas: 47  
Clasificación: `TENANT_AYS_ONLY` como referencia de operación + `REPLICABLE_CLAUDE_ACUMULADO` para patrones UX reutilizables.  
Payload/capturas reales en repo: **NO**.

## Regla rectora

SIGA define el **mínimo funcional y de información útil** que el usuario necesita conservar o mejorar. Orbit 360 no debe copiar su interfaz ni sus limitaciones. En particular, que SIGA use modales no autoriza volver a modales en Orbit: el patrón aprobado de Orbit para fichas operativas complejas es **pantalla completa navegable**, responsive y con relaciones integradas.

## Pólizas — contrato mínimo

La lista de Pólizas debe permitir localizar y entender cada póliza sin entrar a la ficha, incluyendo como mínimo:

- número de póliza;
- aseguradora;
- asegurado/cliente;
- ramo / subramo / producto;
- vigencia inicio-fin;
- estado operativo e histórico;
- indicador de documentación cuando corresponda;
- acceso a ficha completa;
- acceso a recibos/pagos y renovaciones cuando aplique;
- filtros por estado, ramo, aseguradora, vendedor/asesor y fechas;
- separación clara entre vigente, por renovar, renovada, cancelada, vencida, no renovada y otros históricos.

### Ficha full-page de Póliza

Debe mostrar, cuando exista en la fuente/contrato, sin `undefined`, `NaN` ni ceros inventados:

**Identificación y vigencia**
- número;
- póliza anterior/renovación cuando exista;
- estado;
- fecha de emisión;
- vigencia inicio-fin;
- vigencia de contrato cuando corresponda;
- tipo de emisión;
- ramo, subramo, tipo/producto;
- aseguradora;
- asesor/vendedor/agente;
- moneda.

**Asegurado / contratante**
- cliente relacionado;
- tipo de persona;
- identificación disponible;
- datos de contacto que correspondan al rol y permisos;
- contratante distinto del asegurado cuando aplique.

**Primas y pago**
- prima neta;
- gastos de expedición/emisión;
- gastos financieros/financiamiento;
- otros/asistencias cuando existan;
- IVA/impuestos;
- prima total;
- frecuencia de pago;
- conducto de pago;
- forma de pago;
- primer recibo y pago subsecuente cuando el dato exista;
- comisiones únicamente cuando existan y el rol tenga permiso.

**Riesgo / bien asegurado**
- concepto;
- bien asegurado;
- suma asegurada cuando exista;
- plan/coberturas;
- comentarios y observaciones de póliza;
- documentos/anexos/endosos relacionados.

**Relaciones**
- vehículo(s) u otros riesgos vinculados;
- recibos esperados;
- cartera activa e histórica exigible;
- pagos reportados pendientes de conciliación;
- cobros aplicados, sin inferirlos desde cartera;
- renovaciones/endosos/historial.

## Vehículos — contrato mínimo

La tarjeta resumida debe mostrar suficiente información para identificar el riesgo: marca, línea/tipo, modelo/año, placa, póliza y estado. Debe tener acceso explícito a **Ver detalle completo**.

La ficha full-page de Vehículo debe poder mostrar, cuando exista:

- marca;
- línea/tipo;
- modelo/año;
- placa;
- número de serie/chasis/VIN;
- número de motor;
- color;
- uso;
- tipo de carga/servicio;
- número de pasajeros;
- tonelaje;
- inciso;
- concepto/descripcion/comentarios;
- suma asegurada;
- plan;
- coberturas, deducibles y observaciones cuando existan;
- póliza, cliente y aseguradora relacionados;
- prima asociada cuando el contrato la soporte.

## Recibos y pagos — contrato mínimo

Debe existir una experiencia full-page o integrada dentro de la ficha full-page, no un modal bloqueante. Debe permitir:

- ver calendario completo por póliza;
- serie/número de recibo;
- inicio/fin de vigencia del recibo;
- fecha límite;
- prima neta;
- gastos/financiamiento/IVA/otros si existen;
- total;
- forma de pago;
- estado;
- distinguir futuro, por vencer, vencido, pago reportado pendiente de conciliación y aplicado;
- filtrar por póliza;
- ver histórico de pagos/renovaciones sin confundirlo con cobro aplicado;
- generar/consultar aviso de pago cuando corresponda.

## Navegación aprobada Orbit 360

1. Cliente 360 → Póliza → **pantalla completa**.
2. Cliente 360 / Póliza → Vehículo → **pantalla completa**.
3. Cliente 360 / Póliza → Recibos y pagos → vista operativa completa e integrada.
4. `Atrás` conserva contexto del cliente/pestaña/filtro.
5. Nunca reintroducir drawer/modal para una ficha completa por empalme de una candidata.

## Rendimiento y responsive

- No recalcular colecciones completas por cada fila de Cliente 360.
- Resúmenes/indexes deben ser reutilizables e invalidados por eventos de store, no por polling o repintado indiscriminado.
- Ninguna selección ordinaria puede provocar `La página no responde`.
- Desktop, tablet y móvil deben conservar títulos, KPIs, tabs, tablas y acciones principales sin solapamiento.
- Tablas anchas pueden usar scroll horizontal controlado; nunca cortar acciones críticas.

## Calidad visual obligatoria

- `undefined`: 0 visible.
- `NaN`: 0 visible.
- IDs técnicos sin significado: 0 visibles salvo que sean identificadores operativos.
- Copy Firebase/backend/LAB/mock/localStorage: 0 visible.
- Un dato ausente se representa como `Pendiente de completar`, `Sin información registrada` o equivalente honesto según contexto; nunca como cero inventado.
- Lista y ficha deben usar el mismo read-model canónico: una póliza no puede aparecer como 0/0 en lista y existir en la ficha.

## Gates que deben preceder la revisión humana

Antes de volver a pedir revisión visual al usuario, la automatización debe probar:

- Cliente 360 carga lista sin freeze;
- conteo de pólizas de una muestra coincide lista ↔ ficha;
- prima anual finita;
- `undefined` y `NaN` ausentes;
- Póliza abre full-page;
- Vehículo abre full-page y muestra aliases canónicos;
- Recibos/Cartera continúan hidratados;
- cambio Dirección/Operativo/Asesor no rompe la ruta;
- cero escrituras durante el gate visual;
- responsive smoke de anchos desktop/tablet/móvil.

## Evidencia visual SIGA utilizada

- páginas 27–30: listado, histórico de pagos/renovaciones y filtros de pólizas;
- páginas 33–35: densidad mínima de la ficha de Póliza, primas y vehículo;
- páginas 36–40: campos de alta/edición de póliza, documentos, vehículo, prima, plan y coberturas;
- páginas 41–45: calendario/histórico de pagos, registro de pago y aviso de pago;
- páginas 13–21: reportes y filtros como referencia de capacidad operativa.

Este documento preserva únicamente el patrón funcional sanitizado. Nombres, teléfonos, correos, números de póliza y demás datos reales observables en las capturas no se reproducen ni se envían a Claude.
