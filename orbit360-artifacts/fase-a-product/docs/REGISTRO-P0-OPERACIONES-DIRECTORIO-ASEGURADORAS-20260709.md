# REGISTRO P0 — OPERACIONES PROPUESTAS DIRECTORIO ASEGURADORAS

Fecha: 2026-07-09
Carril: C con soporte B
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: implementado aditivo; pendiente CI/smoke visible y dry-run real con archivo.

## Qué parte del plan avanzó

P0.3.1 — convertir directorio de aseguradoras a operaciones propuestas sanitizadas, sin escritura real.

## Archivos agregados/modificados

```txt
orbit360-platform/core/importa-directorio-aseguradoras-p0.js
orbit360-platform/modules/importar.js
tools/orbit360-test-importa-directorio-aseguradoras-p0.mjs
.github/workflows/orbit360-p0-smoke.yml
```

## Qué hace

Crea operaciones propuestas desde filas de directorio de aseguradoras:

```txt
aseguradoras
contactosAseguradora
configuracionCatalogo
gestiones
```

No escribe datos. Las operaciones alimentan `Orbit.importaDryRunP0.buildDryRun` para generar reporte sanitizado.

## Reglas aplicadas

- País GT/CO desde fila o fuente.
- Moneda sugerida por país: GT→GTQ, CO→COP.
- Si falta país, queda `REQUIERE_VALIDACION`.
- Contactos se separan de aseguradora.
- Ramos/productos se proponen como catálogo.
- Notas pasan a gestión.
- Duplicados probables por país + nombre se omiten con warning.
- Accesos/credenciales no se importan.

## Credenciales y accesos

Si la fuente trae columnas o valores de acceso, se descarta el valor real y solo se crea una gestión:

```txt
credentialRef: backend_required
```

Esto deja trazabilidad de que existe un acceso pendiente de configurar en backend, sin exponer secretos ni guardarlos en UI.

## Seguridad

- No toca `store.js`.
- No toca adapter Firestore LAB.
- No toca `core/auth.js`.
- No toca `firestore.rules`.
- No sube datos reales.
- No crea usuarios, roles, permisos, secretos ni credenciales.
- No escribe cartera, cobros, pólizas, finmovs, CxC ni CxP.

## Smoke agregado

```txt
tools/orbit360-test-importa-directorio-aseguradoras-p0.mjs
```

Cubre:

- creación propuesta de aseguradora;
- creación propuesta de contacto;
- creación propuesta de catálogo/ramos;
- transformación de credencial en `credentialRef: backend_required`;
- no filtración de valor sensible en operaciones;
- reporte sanitizado sin correo visible.

## Estado

```txt
IMPLEMENTADO_ADITIVO_PENDIENTE_SMOKE_VISIBLE
```

## Siguiente paso

Conectar el primer dry-run real del directorio a reporte operativo revisable:

```txt
fuente real local
→ filas normalizadas
→ operaciones propuestas
→ reporte sanitizado
→ revisión humana
→ sin escritura real
```
