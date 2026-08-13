# Ejecución del gate conjunto Cliente 360 + Aseguradoras

Fecha: 2026-07-16

## Baseline ejecutado

- Rama: `ays/backend-tenant-lab-v99-20260703`.
- Gate corregido base: `b1687cf18e40226bacb2a4809e1e0cdb98a63c6f`.
- Tenant LAB: `alianzas-soluciones`.
- Alcance: Cliente 360 y Aseguradoras en una sola sesión autenticada.

## Carril A — frontend

La ejecución valida el renderer canónico del prototipo en Dirección escritorio, Operativo tableta y Asesor móvil. Incluye cláusula legal única, menú móvil completo, lista y ficha de Cliente 360, ficha de Aseguradoras en lectura, orden GT primero y conocimiento mapeado visible.

## Carril B — backend protegido

Esta ejecución no modifica `Orbit.store`, Auth, reglas Firestore, adaptadores LAB ni importadores protegidos. El canal creado por el workflow es temporal y exclusivo de LAB.

## Carril C — datos A&S

Criterios bloqueantes:

- 414 clientes.
- 26 aseguradoras.
- 7 asesores.
- Clientes en estado inicial `pendiente_polizas` cuando todavía no existe fuente de pólizas.
- Sin inferir pólizas, vehículos, cobros, cartera ni movimientos financieros desde la fuente Clientes.
- Conocimiento de Aseguradoras presentado con estado honesto: mapeado, persistido, validado y habilitado son estados distintos.

## Resultado requerido

No se declara cierre hasta obtener un JSON sanitizado con `ok: true`. Un resultado negativo debe convertirse únicamente en la corrección del primer check real fallido. Después del PASS corresponde una sola revisión visual conjunta con información A&S.

Sin producción, sin merge y sin `main`.
