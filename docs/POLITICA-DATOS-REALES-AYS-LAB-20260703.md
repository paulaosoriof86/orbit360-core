# Política de datos reales A&S para LAB interno — Orbit 360

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-continuidad-20260703`  
**Objetivo:** permitir uso interno urgente con datos reales vivos sin hardcodear información en el prototipo.

## 1. Aclaración sobre dataset mínimo

El dataset mínimo mencionado en el smoke no significa que A&S tenga pocas aseguradoras, clientes o pólizas. Significa una muestra inicial para validar que el circuito funciona antes de cargar toda la base.

El orden correcto es:

1. validar flujo con pocos registros;
2. corregir errores de mapeo o lógica;
3. cargar base real por bloques;
4. validar importación completa;
5. usar la plataforma con datos vivos.

## 2. Decisión de trabajo

Para A&S se permite avanzar con datos reales en LAB interno controlado si se cumplen estas reglas:

- los datos reales no van en `seed.js`;
- los datos reales no se hardcodean en módulos JS;
- los datos reales no se incluyen en prototipo demo para terceros;
- los datos se guardan en backend/tenant A&S;
- toda importación queda registrada en `import_batches`;
- cada carga genera reporte de creados, actualizados, duplicados, omitidos y por revisar;
- se mantiene respaldo del archivo fuente;
- se evita cargar producción pública hasta tener seguridad y permisos validados.

Ruta backend:

```txt
tenants/alianzas-soluciones/{coleccion}/{docId}
```

## 3. Diferencia entre ambientes

### Prototipo Claude

- Solo datos ficticios.
- Sirve para UX, flujo, módulos, demo comercializable.
- No debe contener base real A&S.

### LAB interno A&S

- Puede usar datos reales o semi-reales autorizados.
- Sirve para empezar operación interna.
- Debe estar aislado por tenant.
- No debe desplegarse como producción pública.

### Producción A&S

- Solo después de validar Auth, permisos, seguridad, respaldo y reglas.
- Usa datos reales definitivos.
- Requiere control de acceso y auditoría.

## 4. Validación manual obligatoria

La plataforma no debe depender solo de importadores. Debe permitir operación manual:

- crear cliente;
- editar cliente;
- crear póliza;
- editar póliza;
- crear cobro/recibo;
- aplicar pago;
- corregir asesor;
- registrar contacto/actividad;
- registrar movimiento financiero real;
- consultar Cliente 360.

Esto debe validarse antes o en paralelo a la importación masiva.

## 5. Validación de importadores obligatoria

Los importadores deben funcionar con los mismos archivos reales o muestras de esos archivos:

- directorios de aseguradoras;
- base CRM actual;
- pólizas;
- cobros efectuados;
- cartera vigente;
- movimientos financieros;
- planillas de comisión;
- facturas;
- vehículos;
- siniestros si aplica.

Cada importador debe permitir:

- preview;
- remapeo de columnas;
- aprobar fila;
- aprobar todo;
- excluir;
- marcar por revisar;
- descargar reporte.

## 6. Orden para pedir archivos a Paula

No se debe pedir todo al tiempo. Se solicita uno por uno según avance:

1. configuración base/usuarios/asesores;
2. directorio aseguradoras;
3. clientes CRM actual;
4. pólizas vigentes/por renovar;
5. cobros/cartera vigente;
6. cobros efectuados/histórico;
7. vehículos/acreedores/documentos;
8. siniestros;
9. planillas de comisión;
10. facturas;
11. movimientos financieros;
12. marketing/contenidos.

## 7. Regla de seguridad para datos sensibles

Antes de producción:

- no exponer documentos o datos sensibles sin Auth;
- no publicar enlaces abiertos;
- no subir a rama de prototipo;
- no convertir datos reales en demo;
- registrar quién importó y cuándo.

## 8. Estado

**Estado:** ACTIVO.  
**Uso:** regla obligatoria para continuar migración A&S y explicar diferencia entre smoke mínimo, LAB real y prototipo demo.
