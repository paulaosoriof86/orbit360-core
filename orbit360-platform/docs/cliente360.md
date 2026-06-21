# Módulo · CRM Cliente 360

> Estado: **NÚCLEO** · archivo: `modules/cliente360.js` · ruta: `#/cliente360`

## Propósito (para no conocedores del sector)
Un intermediario de seguros gestiona, por cada cliente, varias **pólizas** de distintas **aseguradoras**, cada una con sus **cobros** (cuotas), sus **renovaciones** anuales, las **comisiones** que esas pólizas generan, y un **historial** de interacciones. Esa información suele vivir dispersa en hojas de cálculo, correos y portales de cada aseguradora.

**Cliente 360 es el centro operativo del cliente: el "cerebro".** Reúne todo en un lugar y, a la vez, lo **desglosa** por póliza y por cobro, con filtros. Es la base de la que se alimentan los demás módulos.

## Dolor → Solución
| Dolor real | Cómo lo resuelve Cliente 360 |
|---|---|
| Información del cliente dispersa | Ficha única que consolida pólizas, cobros, renovaciones, comisiones e historial |
| No se sabe quién está por vencer | Score de salud + "próximas acciones" + módulo de renovaciones por póliza |
| Cartera vencida invisible | Banda KPI de cartera al día / vencida y bandera de conciliación por cuota |
| Comisiones difíciles de rastrear | Desglose de comisión por periodo, base, % y estado |
| Seguimiento sin memoria | Historial con timeline y registro de interacciones |

## Estructura (master–detail)

### Lista (cartera)
- KPIs: clientes, pólizas activas, prima vigente, por renovar ≤45 días.
- Filtros: búsqueda en vivo (nombre/correo/identificación), tipo, país, segmento, asesor.
- Tabla: cliente, asesor, pólizas (vigentes/total), prima vigente, estado de cartera, **barra de salud**.

### Ficha 360 — el cerebro
- **Encabezado**: nombre, tipo (Persona/Empresa), etiquetas (VIP/Corporativo), identificación, correo, teléfono, ciudad/país, asesor, segmento, canal, antigüedad. **Score de salud** (dial 0–100).
- **Banda KPI**: pólizas vigentes, prima anual, cartera al día, cartera vencida, comisión generada.
- **Desglose** (pestañas):
  1. **Resumen** — próximas acciones (renovación, cobro, cartera vencida), distribución de cartera por ramo, actividad reciente.
  2. **Pólizas** — número, ramo/producto, aseguradora, forma de pago, prima, vigencia, estado.
  3. **Cobros y cartera** — cuota, monto, vencimiento, pago, método, estado y **conciliación** (✓ aplicado / ◷ por conciliar). La doble conciliación pago↔póliza vive en Orbit Finanzas.
  4. **Renovaciones** — línea de tiempo por póliza con días a vencer.
  5. **Comisiones** — periodo, póliza, base, %, comisión, estado (devengada/liquidada).
  6. **Historial** — timeline completo + alta de interacción (persiste en la capa de datos).

## Cálculo del score de salud (demo)
Base 70, suma por pólizas vigentes y segmento Premium, resta fuerte si hay cartera vencida. Acotado a 8–100. Es un placeholder explicable; en producción se parametriza.

## Datos que consume (capa `store`)
`clientes`, `polizas`, `cobros`, `comisiones`, `actividades`, `cancelaciones`, `asesores`, `aseguradoras`.
Agregaciones en `core/queries.js` → `clienteResumen(id)`, `polizasDe`, `cobrosDe`, `comisionesDe`, `actividadesDe`.

## Sincronía con otros módulos
- **Cobros/conciliación** → Orbit Finanzas (doble conciliación).
- **Historial/interacciones** → Insights y Marketing (segmentación).
- **Pólizas/renovaciones** → Inicio (prioridades) y Notificaciones WA.
- **Comisiones** → Finanzas (liquidaciones empresa/asesores).

## Pendiente / siguiente iteración
- Formularios de alta/edición de cliente y póliza.
- Adjuntos documentales por póliza (enlazado con Ingesta documental).
- Filtros guardados y exportación.
