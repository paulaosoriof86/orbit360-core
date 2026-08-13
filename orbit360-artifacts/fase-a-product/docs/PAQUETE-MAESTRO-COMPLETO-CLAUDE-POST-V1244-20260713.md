# Paquete maestro completo Claude post-v1.244

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy.

## Base obligatoria

- Candidata: `Prototype Development Request - 2026-07-13T232122.515.zip`
- Versión física auditada: v1.244
- SHA-256 candidata: `0430604dd3c279cb56e2bae40db41602e8d4135749136bcb74521243fbb51b16`

## Paquete acumulado

- Archivo: `PAQUETE-MAESTRO-COMPLETO-CLAUDE-ORBIT360-POST-V1244-20260713.zip`
- SHA-256: `b79b748b2cf277c479404ed6277370ab308be47e6f5ff7be289616694905bdb9`
- Archivos internos: 16
- Matriz: 34 elementos cerrado/parcial/abierto.

Este paquete reemplaza todos los paquetes Claude anteriores. Incluye:

1. baseline y cierres que no deben repetirse;
2. auditoría física v1.244;
3. P0 completos;
4. P1/P2 por módulo;
5. fixes locales y patrones backend reutilizables traducidos a prototipo;
6. Academia profunda por rol;
7. fuentes reales, migración e importadores;
8. estado modular y plan de trabajo;
9. documentación y evidencia;
10. archivos protegidos y prohibiciones;
11. checklist y prompt maestro.

## Orden Claude

1. Sesión/identidad/router fail-closed.
2. Persistencia multirol y scopes modernos.
3. Gate de datos en listas, detalles y mutaciones.
4. Confirmación reforzada y auditoría.
5. Bancos operativos separados de credenciales.
6. Credenciales por referencia/proveedor.
7. Aseguradoras 15/15.
8. Cotizador/Comparativo.
9. Ops/Leads y CRM.
10. Academia, documentación y evidencia.

## Restricción

Claude no toca backend protegido, Auth, Firestore, reglas, Hosting, secretos, imports reales ni datos reales. La siguiente candidata debe ser v1.245 o superior e incremental.
