# Paquete Claude acumulado — post Equipo/Config + M5 v1330

Fecha: 2026-07-08  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Propósito

Mantener listo el acumulado que debe trasladarse a Claude cuando Paula pida nueva candidata o cuando se decida enviar paquete integral de pendientes, mejoras, replicables backend y Academia.

Este archivo NO contiene secretos, datos reales, payload de clientes, pólizas, estados bancarios ni planillas reales.

## Estado de envío a Claude

Estado actual: `ACUMULANDO`

No enviar todavía como paquete cerrado salvo instrucción de Paula o nueva ventana de capacidad Claude.

Motivo: después de Equipo/Config y M5 aún conviene terminar el siguiente tramo documental/contratos de Documentos + Storage futuro + adjuntos antes de pedir a Claude una candidata grande, porque impacta Portal, Cobros, Cliente360, Operativo y Academia.

## Cambios backend/prototipo reutilizables a incluir

### 1. Equipo y Configuración — gates administrativos

Patrón reusable:

- Crear/editar/inactivar usuario exige motivo.
- Cambiar roles/permisos exige motivo.
- Reset de permisos exige confirmación reforzada.
- No se debe dejar el tenant sin administrador activo.
- Cambio de plan, módulos activos, reset de configuración e integraciones deben quedar auditables.
- La UI cliente no debe mostrar lenguaje técnico como `backend`, `LAB`, `Firebase`, `Firestore`, `mock`, `demo`, `smoke`, `localStorage` o credenciales.

Instrucción para Claude:

- Diseñar los flujos administrativos con modal/gate de motivo, confirmación reforzada cuando aplique y registro visible en bitácora.
- No simular que invitaciones, credenciales, integraciones o canales están activos si no hay backend/proveedor conectado.
- Las pestañas internas Orbit deben estar restringidas por rol.

Academia impactada:

- Ruta Dirección/Superadmin/IT: administración de usuarios, roles, permisos, planes, módulos e integraciones.
- Ruta Administrativo/Operativo: entender qué puede cambiar y cuándo escalar.
- Evaluación sugerida: caso práctico de cambio de permisos con motivo y auditoría.

### 2. M5 Conciliaciones — gates y estados honestos

Patrón reusable:

- Validar, rechazar, bloquear y anular conciliaciones exige motivo.
- Anular exige confirmación reforzada.
- Validar se bloquea si falta país/moneda o existe incoherencia GT/GTQ o CO/COP.
- `VALIDADA` no equivale a pago aplicado.
- Estado de cuenta bancario no crea cobros ni marca pagos como aplicados por sí mismo.
- Conciliación propuesta no crea clientes, pólizas, cobros ni cartera.

Instrucción para Claude:

- Mostrar estados honestos: propuesta, pendiente de conciliación, validada no aplicada, rechazada, bloqueada, anulada, conciliada/aplicada solo cuando corresponda.
- Separar visualmente validación operativa de aplicación contable/cobro.
- Evitar botones o textos que indiquen pago aplicado si solo hay validación.
- Mantener país/moneda visibles en cada registro.

Academia impactada:

- Ruta Cobros/Finanzas: diferencia entre pago reportado, depósito bancario, propuesta de conciliación, validación y pago aplicado.
- Ruta Dirección: control de riesgos de caja, auditoría y cierre mensual.
- Evaluación sugerida: caso de depósito sin país/moneda y caso de conciliación validada que aún no debe aplicarse.

### 3. Metodología de bajo trabajo manual

Patrón reusable:

- ChatGPT/GitHub debe realizar todo lo posible directamente.
- Paula solo ejecuta acciones locales cuando sea indispensable: runtime local, pruebas que dependen del navegador, archivos privados, autorización sensible, deploy o merge.
- No usar bloques PowerShell largos con here-strings o documentación embebida.
- Scripts locales deben ser cortos, versionados y con validación clara.

Instrucción para Claude:

- Entregar candidatas completas, autocontenidas y consistentes, no pedir microacciones a Paula.
- Cuando un cambio toque Academia/manuales, documentarlo dentro del candidato.

## Pendientes Claude acumulados que siguen vivos

- Profundizar Academia por rol, con rutas, progreso, evaluaciones útiles, certificados y actualización por cambios de módulos.
- Mantener manuales sincronizados con Equipo/Config y M5 Conciliaciones.
- Revisar Portal/Cobros/Documentos: pago reportado con soporte debe dejar adjunto visible para operativo/cobros y estado claro para cliente.
- Revisar todos los módulos donde un botón indique envío, conexión, pago, cobro, validación o importación para asegurar copy honesto.
- Mantener UI compatible con `Orbit.store`, sin depender de almacenamiento directo ni nombres técnicos visibles.

## Restricciones para Claude

No tocar ni reemplazar:

```txt
orbit360-platform/data/store.js
orbit360-platform/data/store-firestore-lab.local.js
orbit360-platform/core/backend-lab-loader.js
orbit360-platform/core/backend-lab-init.js
orbit360-platform/core/backend-lab-security-guard.js
orbit360-platform/core/auth.js
orbit360-platform/core/importa.js
firestore.rules
tools/orbit360-*
orbit360-platform/index.html
```

No incluir:

- secretos;
- credenciales;
- tokens;
- datos reales A&S;
- estados bancarios reales;
- planillas reales completas;
- clientes/pólizas reales.

## Criterio para enviar paquete a Claude

Enviar paquete cuando ocurra uno de estos escenarios:

1. Paula indique que Claude tiene capacidad y pide paquete integral.
2. Se cierre el siguiente bloque de Documentos + Storage futuro + adjuntos.
3. Se requiera nueva candidata frontend para consolidar Equipo/Config, M5, Documentos, Portal/Cobros y Academia.
4. La conversación se alargue y se necesite preservar continuidad completa.

## Estado

Paquete acumulado post Equipo/Config + M5 creado. Mantener actualizado en cada bloque reutilizable.