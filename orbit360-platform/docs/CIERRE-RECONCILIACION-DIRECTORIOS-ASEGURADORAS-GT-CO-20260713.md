# Cierre de reconciliación — Directorios de Aseguradoras GT/CO

Fecha: 2026-07-13  
Carril: C — datos reales/migración operativa  
Modo: read-only; sin escritura, sin deploy y sin secretos  
Tenant de destino: `alianzas-soluciones`

## Necesidad

Convertir los directorios GT/CO en decisiones de importación trazables antes de cualquier escritura, separando aseguradoras, aliados, contactos, plataformas, cuentas y referencias de credenciales.

## Fuentes

- `Directorio Aseguradoras Guatemala 2026.xlsx`
  - SHA-256: `3fa9a19fbb12aff07ae76c3bcc6d3e5298d7faa0862de08c608f1dd235deddbe`
- `Directorio - Aseguradoras Colombia 2024.xlsx`
  - SHA-256: `db441c548fc681e5f4d3a0c4c21a3f63c86e501bdec59e25e0bd0cff673e5a5f`

## Resultado

### Guatemala

- 14 hojas/entidades del índice.
- 13 aseguradoras perfiladas.
- 1 fuente en cuarentena: `Óle`, sin información operativa suficiente.
- Rural y Privanza comparten el código fuente `2-1727`; ambas quedan en `REQUIERE_VALIDACION`.
- País y moneda: `GT` / `GTQ`.

### Colombia

- 16 hojas de origen.
- 13 aseguradoras canónicas.
- 1 aliado/acceso agrupador: `Synergias`.
- 1 fuente contaminada en cuarentena: hoja `Chubb`.

Decisiones:

1. La hoja `Chub` contiene información de Chubb y es la fuente utilizable para esa entidad.
2. La hoja `Chubb` tiene encabezado `SBS` y una referencia de plataforma Chubb. No es un duplicado simple y no debe fusionarse automáticamente.
3. `Solidaria` y `Solidaria 1.0` representan una sola aseguradora; la segunda aporta contactos, pero contiene bloques heredados de otras compañías que deben excluirse.
4. Synergias se modela como aliado relacionado con varias aseguradoras, no como aseguradora.
5. País y moneda: `CO` / `COP`.

## Secretos

Se detectaron marcadores de usuario, contraseña o clave en las fuentes. No se copió ningún valor a reportes, JSON, repo, seed o store.

Tratamiento:

```text
credentialRef
credentialStatus = backend_required
allowedDestination = secure_credential_provider
valueIncluded = false
```

## Artefactos sanitizados

- `DRY-RUN-CANONICO-CARRILES-B-C-ORBIT360-AYS-20260713.xlsx`
  - SHA-256: `afe52534bde0d0da99554812b391a2c6e9149d527c5fd25f3695d3c72ed50e93`
- `MANIFIESTO-IMPORTACION-SANITIZADO-ASEGURADORAS-GT-CO-20260713.json`
  - SHA-256: `9882279c3173cf38d14f6765519c63dcb62df622e3f7bdee947e2bb8895ae0b6`

Los artefactos permanecen fuera del prototipo comercializable y no habilitan escritura.

## Colecciones destino propuestas

```text
aseguradoras
contactosAseguradora
plataformasAseguradora
cuentasBancariasAseguradora
documentosAseguradora
relacionesAseguradoraAliado
calidadDatos
auditoriaImportaciones
```

## Bloqueos pendientes

- backend productivo y membership multirol;
- reglas productivas;
- extensión controlada del importador para directorios;
- proveedor seguro de credenciales;
- confirmación humana de fusiones/entidades en validación;
- escritura y rollback durable.

## Impacto en Academia/Claude

Traducir solamente los patrones reutilizables:

- diferencia aseguradora/aliado;
- alias y fusiones;
- calidad y `REQUIERE_VALIDACION`;
- fuentes y trazabilidad;
- `credentialRef/backend_required`;
- secretos nunca visibles ni persistidos.

No entregar datos reales ni archivos de migración a Claude.

## Estado

`RECONCILIACION_CERRADA_READ_ONLY`

Siguiente acción: implementar el contrato productivo del Carril B y convertir las entidades aprobables en operaciones dry-run, todavía con `writeAllowed=false`.
