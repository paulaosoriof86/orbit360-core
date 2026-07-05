# Paquete Claude — Bloque pólizas, recibos, cartera y conciliación

**Fecha:** 2026-07-04  
**Proyecto:** Orbit 360 A&S  
**Rama backend activa:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge, sin deploy  
**Base candidata activa Claude:** `Prototype Development Request - 2026-07-04T152321.882.zip`  
**Estado:** complemento acumulado para auditoría del próximo candidato Claude.

---

## 0. Actualización post auditoría de la candidata activa

Después de auditar archivos reales de `Prototype Development Request - 2026-07-04T152321.882.zip`, se confirma que la candidata activa ya resolvió varios puntos que antes estaban como pendientes:

- importador con fuentes separadas;
- país/moneda sin default operativo peligroso en rutas principales;
- trazabilidad por hoja/fila/bloque/periodo;
- estado bancario hacia `conciliacionBanco`;
- documentos hacia `parchesPendientes`;
- planillas de comisión en `IMPORT_MAP`;
- Academia ampliada v1.118-v1.123.

Por tanto, el próximo trabajo de Claude debe **conservar** esos avances y enfocarse en los pendientes restantes documentados en:

```txt
orbit360-platform/docs/AUDITORIA-FORENSE-CANDIDATO-ACTIVO-CLAUDE-20260704-152321.md
orbit360-platform/docs/PAQUETE-COMPLETO-CLAUDE-ACTUALIZADO-POST-AUDITORIA-20260704.md
```

---

## 1. Regla inicial

Claude debe trabajar solo frontend/prototipo/documentación frontend. No debe tocar backend protegido ni entregar ZIP que reemplace backend LAB.

Debe leer primero:

- `DOCUMENTO-MAESTRO-CONSOLIDADO-ORBIT360-AYS-20260704.md`.
- `ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md`.
- `orbit360-platform/docs/CONTRATO-POLIZAS-RECIBOS-CARTERA-CONCILIACION-AYS-20260704.md`.
- `orbit360-platform/docs/NOTA-PARA-CLAUDE-AVANCES-BACKEND-MIENTRAS-CORRIGE-CANDIDATO-20260704.md`.

---

## 2. Áreas obligatorias a revisar en el candidato

- `core/importa.js`.
- `modules/importar.js`.
- `modules/polizas.js`.
- `modules/cobros.js`.
- `modules/cliente360.js`.
- `modules/portal.js`.
- `modules/comisiones.js`.
- `modules/finanzas.js`.
- `modules/notificaciones.js`.
- `modules/academia.js`.
- `data/seed.js` solo con datos ficticios.

---

## 3. Pólizas

El candidato debe mostrar claramente:

- prima neta;
- gastos;
- IVA/impuestos;
- prima total;
- país;
- moneda;
- estado;
- recibos generados;
- fuente de importación;
- estado de validación.

Regla:

```txt
Vigente / Por renovar => generan cartera.
Cancelada / Vencida / Anulada / Rechazada => histórico.
```

No mostrar pólizas históricas como cartera activa.

---

## 4. Cobros y cartera

Cartera activa debe ser solo:

```txt
recibos pendientes de pólizas vigentes o por renovar del año actual
```

Debe mostrar:

- pendiente;
- vencido;
- reportado por cliente;
- en revisión;
- pagado;
- conciliado;
- soporte/factura;
- origen de aplicación;
- estado de conciliación.

No sumar monedas en crudo ni usar GTQ fijo para vistas mixtas.

---

## 5. Cliente360 y Portal Cliente

Cliente360 debe mostrar trazabilidad:

- póliza relacionada;
- recibo/cuota;
- prima neta/gastos/IVA/total;
- factura o soporte adjunto;
- estado de pago;
- estado de conciliación;
- origen de aplicación;
- fuente/archivo/hoja/fila si viene de importación;
- historial de cambios;
- usuario/proceso que aplicó o validó.

Portal Cliente debe mostrar:

- pólizas y detalle;
- recibos pagados y pendientes;
- pagos reportados y su estado;
- soportes adjuntos;
- documentos visibles;
- próximas renovaciones;
- gestiones activas;
- documentos faltantes;
- alertas relevantes.

El cliente reporta pagos; el equipo valida. No decir que quedó aplicado si solo fue reportado.

---

## 6. Importador inteligente

Debe conservar fuentes separadas:

```txt
clientes
aseguradoras
polizas
vehiculos
cobros_realizados
planilla_aseguradora
planilla_comisiones
estado_cuenta_bancario
financiero_historico
siniestros
documentos_soporte
configuracion_catalogo
```

Reglas UX:

- preview obligatorio;
- diff antes de aplicar;
- mostrar archivo/hoja/fila/bloque/periodo/país/moneda;
- si falta país/moneda: `REQUIERE_VALIDACION`;
- no usar defaults peligrosos;
- no crear clientes/pólizas desde financiero histórico;
- no crear cobros desde estado bancario sin conciliación;
- documentos soporte solo proponen datos con confirmación;
- no presentar aplicación real si backend real no está conectado.

---

## 7. Conciliación con aseguradoras y comisiones

Estados de cuenta de aseguradora deben mostrar:

- recibos encontrados;
- recibos faltantes;
- pagos confirmados no aplicados;
- diferencias de monto;
- diferencias de país/moneda;
- registros bloqueados;
- registros que requieren validación.

Planillas de comisiones:

- pueden confirmar pagos/cobros/aplicaciones si la fila real lo indica;
- junio y julio 2026 requieren atención especial porque no están en el archivo financiero revisado;
- si la planilla confirma pago aplicado y Orbit no lo tiene aplicado, debe generar propuesta o validación según confianza;
- no simular tarifas ni pagos;
- distinguir comisión esperada, comisión pagada, retenciones, ajustes, diferencias y periodo.

---

## 8. Finanzas, notificaciones y Academia

Finanzas debe diferenciar:

- `finmovs` histórico/operativo;
- cobros/recaudos;
- cartera;
- comisiones por cobrar a aseguradora;
- comisiones por liquidar a asesores;
- conciliación bancaria.

Notificaciones debe cubrir:

- pago reportado;
- pago en revisión;
- pago aplicado;
- pago conciliado;
- pago confirmado por planilla pero no aplicado;
- recibo faltante;
- póliza importada que requiere validación;
- país/moneda inconsistente;
- comisión diferente;
- liquidación lista.

Academia debe incorporar esta lógica en rutas Administrativo/Operativo, Cliente nuevo y Dirección/Superadmin/IT.

---

## 9. Regresiones prohibidas

- No datos hardcodeados en módulos.
- No textos técnicos visibles al cliente.
- No reemplazar marca Orbit 360 del chrome.
- No hardcodear A&S fuera de configuración tenant/demo aislado.
- No usar GTQ como moneda global fija.
- No asumir Guatemala por defecto para escrituras.
- No mezclar financiero histórico con cartera/cobros.
- No presentar integraciones como activas si no están conectadas.
- No tocar backend protegido.
- No borrar avances de Academia v1.118-v1.123.

---

## 10. Auditoría obligatoria del próximo candidato

Cuando Paula entregue un nuevo candidato, ChatGPT/Codex debe:

1. Confirmar baseline vivo.
2. Extraer inventario del ZIP.
3. Comparar contra `Prototype Development Request - 2026-07-04T152321.882.zip`.
4. Revisar `index.html`, `core/`, `modules/`, `data/seed.js`, `docs/`.
5. Validar sintaxis JS.
6. Buscar textos técnicos visibles.
7. Buscar almacenamiento operativo directo en módulos.
8. Revisar importador inteligente.
9. Revisar país/moneda y defaults peligrosos.
10. Revisar pólizas, cartera, cobros, comisiones, finanzas, portal, Cliente360, notificaciones y Academia.
11. Documentar mejoras, regresiones, pendientes y riesgos.
12. Actualizar pendientes Claude.
13. Empalmar solo con pipeline seguro y sin pisar backend protegido.
