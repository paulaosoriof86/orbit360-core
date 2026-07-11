# PLAN DE RETOMA BACKEND POST-EMPALME v1.197

Fecha: 2026-07-11  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open.

## Objetivo inmediato

Convertir los hooks visuales aceptados en contratos backend seguros, sin tocar producción ni cargar datos reales.

## B1 — Recursos seguros

### Documentos

```txt
documentRef
→ resolver por tenant/rol/scope
→ estado
→ preview temporal
→ descarga temporal
→ URL externa autorizada
→ auditoría
```

Proveedores futuros: Drive/Shared Drives, Storage autorizado y repositorios configurados.

### Credenciales

```txt
credentialRef
→ permiso
→ reautenticación
→ copiar/revelar temporal
→ TTL
→ limpiar
→ auditar sin secreto
```

### Validaciones

- ningún secreto en frontend/store/logs;
- ningún URL privado en seed;
- provider no registrado = pendiente de conexión;
- rol activo, scope y tenant obligatorios;
- errores honestos;
- auditoría sin payload sensible.

## B2 — Integraciones

- Drive OAuth;
- Picker;
- Shared Drives;
- estados configurado/conectado/verificado;
- configuración IA sin key en navegador;
- proveedores externos detrás de backend;
- hooks para documentos en todos los módulos.

## B3 — Auth y permisos

- multirol real;
- scopes;
- extras/restricciones;
- reautenticación;
- último administrador;
- motivo y antes/después;
- pruebas de acceso.

## B4 — Store y persistencia

- mantener API `all/get/where/insert/update/remove/_emit`;
- validar adapter Firestore;
- eliminar persistencias operativas paralelas;
- revisar preferencias;
- pruebas de aislamiento tenant.

## Carril C siguiente

Después de validar B1/B3:

1. dry-run directorios GT/CO;
2. importación sanitizada de aseguradoras;
3. pólizas;
4. documentos por referencia;
5. tarifas/cotizadores;
6. conciliación y demás fuentes separadas.

## Criterio de salida

- contratos registrados;
- validadores verdes;
- estados honestos;
- ningún secreto;
- ningún dato real;
- PR sigue draft;
- sin deploy.
