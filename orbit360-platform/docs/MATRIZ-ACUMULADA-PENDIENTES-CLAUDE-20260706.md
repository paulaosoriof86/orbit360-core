# Matriz acumulada de pendientes Claude — 2026-07-06

**Proyecto:** Orbit 360 A&S  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**PR:** #5 draft, sin merge y sin deploy  
**Objetivo:** evitar paquetes parciales y mantener backlog completo para Claude.

---

## Estado general

El paquete anterior fue acumulado en enfoque P0, pero no era backlog exhaustivo por registro. Esta matriz consolida pendientes de frontend/UX/prototipo/Academia que Claude debe respetar o corregir.

---

## Pendientes por módulo

| Área | Pendiente | Prioridad | Estado v1.144 |
|---|---|---:|---|
| Index | No reemplazar index híbrido backend LAB | P0 | Pendiente. ZIP no conserva scripts LAB |
| Conciliaciones | No usar APLICADA/Aplicadas/listas p backend | P0 | Mejoró en v1.144 |
| Conciliaciones | Validada no es pagada/aplicada | P0 | Mejoró, revisar en v1.145 |
| Cobros | Cambiar Aplicar pago/Pagar por Confirmar cobro | P0 | Pendiente |
| Cobros | Diferenciar reportado, confirmado y conciliado | P0 | Parcial |
| Cliente360 | Retirar Todo aplicado/Aplicar pago | P0 | Pendiente |
| Cliente360 | Usar Sin cobros pendientes/Confirmar cobro | P0 | Pendiente |
| Finanzas | Retirar Aplicado a póliza/pago sin aplicar | P0 | Pendiente |
| Importador | Retirar Pagos no aplicados/Aplicar pagos | P0 | Pendiente |
| Importador | Mostrar revisión/aprobación, no aplicación directa | P0 | Pendiente |
| Configuración | Cambiar metadata de pago aplicado a cobro confirmado | P1 | Pendiente |
| Automatizaciones | Retirar copy técnico visible | P1 | Pendiente |
| Automatizaciones | Mantener Pago reportado pendiente y Pago confirmado | P0 | Parcial |
| Academia plus | Cubrir estados honestos | P0 | Parcial |
| Academia seed | Limpiar cursos base antiguos | P0 | Pendiente |
| Academia | Incluir junio/julio 2026 | P0 | Pendiente |
| Academia | Incluir manifest/catálogo de fuentes | P0 | Pendiente |
| Academia | Banco no es cobro aplicado | P0 | Pendiente explícito |
| Academia | Financiero histórico no crea cartera/cobros/producción | P0 | Pendiente explícito |
| Academia | Documentos soporte solo proponen | P0 | Pendiente explícito |
| Portal | Pago reportado = pendiente de revisión/conciliación | P0 | Debe conservarse |
| Inicio/Dirección | Recaudo confirmado/cobros confirmados | P0 | Debe conservarse |
| Integraciones | Pendiente de conexión/configuración | P0 | Debe conservarse |
| UI general | No mostrar backend/Firebase/Firestore/LAB/mock/demo en UI cliente | P0 | Revisar en cada candidata |
| Moneda | GT=GTQ, CO=COP, no suma cruda | P0 | Debe reflejarse en Academia/copy |
| Fuentes | No mezclar fuentes sin trazabilidad | P0 | Debe reflejarse en Academia/copy |
| Documentos | Soporte solo propone, no escribe entidad directa | P0 | Debe reflejarse en Academia/copy |
| Bitácora | Documentar cambios v1.145 y archivos tocados | P1 | Pendiente v1.145 |

---

## Regla de aceptación

No aceptar candidata Claude si queda cualquiera de estos textos visibles en módulos activos sin justificación interna:

```txt
Pago aplicado
Aplicado a póliza
Todo aplicado
cobros aplicados
recaudo aplicado
Aplicar pago
Aplicar pagos
Pagos no aplicados
pago sin aplicar
listas p/ backend
backend visible en UI
LAB visible en UI cliente
mock/demo visible en UI cliente
```

---

## Regla Academia

Academia debe estar sincronizada en `data/academia-plus.js` y `data/seed.js`. No basta agregar lección nueva si cursos base conservan copy anterior.

---

## Regla index

Claude no debe entregar index que pierda:

```txt
core/backend-lab-loader.js
data/store-firestore-lab.local.js
core/backend-lab-init.js
core/backend-lab-security-guard.js
modules/portal-v1142-copyfix.js
```

---

## Estado

Matriz acumulada creada. Usar como checklist vivo para v1.145 y siguientes.