# Lógica de negocio (especificación)

> Reglas que la plataforma debe cumplir. Son **genéricas y parametrizables por proyecto**: la versión comercial no codifica un cliente, sino que extrae estas reglas en la **configuración del proyecto** (la "capa inteligente"). El primer ejercicio de personalización será **T&A Consultores**.

---

## 1. Proyecto = unidad de adaptación

Cada proyecto guarda su configuración y **reconfigura toda la plataforma**:

| Parámetro | Ejemplos | Impacta |
|---|---|---|
| `countries` + `currency` | GT→Q, HN→L | Dashboard, finanzas, scope de shopper |
| `scenarios` | "Compra estándar", "Estreno"… | Cuestionarios, ficha de visita |
| `canales` / `formato` | App, Taquilla / "Mi Cine" | Ficha de visita, filtros |
| `honorario` / `boleto` / `comboAmt` | por país | Honorarios, liquidaciones, finanzas |
| `restriccion` | "no visitar la misma sucursal en 2 meses" | Validación de postulación |
| `cuestionario.modo` | `interna` / `externa` / `link` | Vista del shopper para llenar |
| `pago` | `diasPago`, `logica` | Estado y **fecha estimada** de liquidación |
| `hrMap` | fuente + columnas→campos | Importación / lectura de Hoja de Ruta |
| `conocimiento` | base de conocimiento para IA | Soporte IA, generación de cuestionarios |
| `geoloc` | on/off | Check-in en la visita |

**Creación de proyecto inteligente (pendiente, P2):** un wizard donde se cargan instructivos y HR, y la IA propone escenarios, cuestionarios, restricciones y mapeo de columnas. Al guardar, dashboard/KPIs/reglas quedan listos.

---

## 2. Origen de las Visitas Disponibles

Las visitas **se derivan de la Hoja de Ruta (HR)** del proyecto, que puede ser:
1. **Online** — HR externa en Google Sheets/Excel online; la plataforma la **lee y detecta cambios**.
2. **Importada** — se sube un archivo; se mapea con `hrMap` (columnas → campos).
3. **Interna** — creada en la plataforma.

**Colaboración sin login:** si el equipo trabaja la HR en Sheets/Excel online, la plataforma sincroniza en ambos sentidos (detecta cambios externos y refleja en la HR los movimientos hechos en plataforma).

**Automatización (Make):** cuando un shopper marca fecha / realizada / cuestionario, un webhook a **Make** actualiza la HR externa y dispara WhatsApp/notificaciones. (pendiente P2)

---

## 3. Ficha de postulación / visita (adaptable)

La ficha que ve el shopper se arma desde el escenario y muestra los **puntos sensibles del proyecto**:
- Resumen del proyecto/escenario, Proyecto, Ronda, Formato, Quincena, Franja, Canal.
- Combo/reembolso y Honorario desglosado.
- **Restricción** del proyecto (ej. recencia de 2 meses).
- **Disponible a partir de** (fecha desde la que puede realizarse) y **franja requerida**.

**Postulación:** el shopper **propone una fecha**, validada contra:
- ≥ "Disponible a partir de".
- Franja correcta (Semana = lun–vie, Fin de semana = sáb–dom).
- Restricción de recencia (declaración + control).

La fecha propuesta queda **pendiente de autorización**; se **autoriza y gestiona desde Gestión de Postulaciones**. Si la asignación viene de HR o manual (no por postulación), el shopper **agenda** la fecha después.

---

## 4. Flujo de la visita del shopper (por proyecto)

```
asignada → ver instructivo/documentos → certificarse (1 vez por proyecto)
  → agendar (si no vino con fecha de postulación)
  → [reprogramación / cancelación / reasignación]  (solicitud → autorización)
  → marcar REALIZADA (con fecha)
  → cuestionario (interno en plataforma  |  externo  |  link por visita)
  → marcar cuestionario completo  (automático si es interno)
  → submitida → validada → liquidada
  → recertificación / actualización si el proyecto lo pide
```

Reglas:
- **Certificación**: una vez por proyecto; si no está certificado, no ejecuta. Gate.
- **Cuestionario**: el modo lo define el proyecto (`cuestionario.modo`). Externo/link → botón que abre la plataforma externa o el link propio de la visita + credenciales autogeneradas; al volver, marca "enviado". Interno → se llena en la plataforma y se marca solo.
- **Notificaciones**: cada acción del shopper notifica al equipo; alertas "Drill" cuando hay algo atrasado.
- **HR**: cada movimiento (agenda, realizada, reprogramación) **actualiza la HR** interna o externa.

---

## 5. Sincronía entre módulos (clave)

A medida que cambia el estado de la **visita**, cambia el de la **liquidación** en dos lugares:
- **Beneficios** (panel del shopper) — cuánto y cuándo cobra.
- **Liquidaciones / Dashboard Financiero** (admin).

Estados de liquidación derivados:
```
realizada → "pend. cuestionario"
cuestionario enviado → "pend. validar"
validada → "lista para lote"  (+ fecha estimada de pago = fecha submit + pago.diasPago)
en lote pagado → "pagada"
```
**Fecha estimada de pago** = según `pago.diasPago`/`pago.logica` del proyecto (parametrizable).

---

## 6. Finanzas (reglas)

- **Monedas separadas**: cada país del proyecto mantiene su moneda y **nunca** se suman entre sí (genérico para cualquier país, no solo GT/HN).
- **Movimientos**: ingresos, egresos, **pagos**. Pagar un **lote** genera de una vez los movimientos de egreso de cada shopper del lote (no uno por uno).
- **Cuentas por pagar / por cobrar**: el histórico las refleja y el Dashboard Financiero las muestra.
- **Comparativos mensuales** y controles para decisiones de rentabilidad/honorarios.
- **Reembolsos** (boleto + combo) = flujo de caja, **no** afectan utilidad; se calculan según el programa del proyecto.
- **Importar histórico** de movimientos con vista previa anti-duplicados.
- **Lotes**: al prepararlos se **seleccionan** las visitas/liquidaciones a incluir; las liquidaciones **cambian de estado**.

---

## 7. Usuarios, roles y creación de shoppers

- **Roles** (configurables): Super Admin · Administrativo · Operativo · Shopper. Acceso por módulo, validado en backend en producción.
- **Scope por país**: cada shopper ve solo proyectos de su país.
- **Creación de shoppers** (configurable por cliente): importados / desde hoja de ruta / manual.
- **Patrón de credenciales** auto-generado (ej. `nombre.apellido` en minúsculas sin tildes) — parametrizable.

---

## 8. Marca / white-label / módulos

- **Tema**: plantillas seleccionables (CXOrbia oscuro, **T&A corporativo = Segoe UI + azul `#2196d3` / rojo `#c8232c` + sidebar claro**, etc.) + logo del cliente.
- **Login**: muestra logo y nombre del cliente con la leyenda "**Plataforma desarrollada para … por …**" (no aparenta ser plataforma propia del cliente).
- **Módulos activables/desactivables** por cliente; **nunca se eliminan** (se reactivan cuando se necesiten).

---

## 9. Add-ons comerciales (diferenciadores)

Funcionalidades que ofrecen consultoras grandes y que se comercializan según proyecto:
- **Geolocalización** / check-in en sucursal, validación de ubicación.
- Evidencia con foto + GPS + timestamp.
- App instalable (PWA).
- Generación de cuestionarios/certificaciones con IA.

---

## 10. Paridad con la plataforma actual de T&A (referencia)

Confirmado del sistema actual (para no perder lo que ya funciona bien):
- Cuestionario **externo** (TyA Online / Checker Field) con credenciales `nombre.apellido` → soportado como `cuestionario.modo='externa'`.
- Estados "submitida" / "liquidada" → soportados en el flujo.
- **Base de conocimiento por proyecto** para la IA → campo `conocimiento`.
- Sincronización con HR (hoja de cálculo) → `hrMap` + integración Make.

Lo que **no** tiene la versión actual y la comercial **sí** incorpora: módulo de **Cuestionarios**, **Certificación** estructurada, **temas/white-label**, **módulos activables**, **mapeo HR configurable**, **lógica de pago parametrizable**.
