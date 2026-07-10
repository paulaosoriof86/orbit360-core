# DRY-RUN P0 — DIRECTORIO DE ASEGURADORAS SANITIZADO

Fecha: 2026-07-09
Carril: C con soporte B
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open
Estado: primer dry-run real sanitizado de bajo riesgo preparado y documentado. No escribe datos.

## 1. Fuentes revisadas

Fuentes locales revisadas en entorno de trabajo, sin subir payload real al repositorio:

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
```

## 2. Motivo de selección

Se eligió Directorio de Aseguradoras como primer dry-run real de bajo riesgo porque:

- alimenta configuración/catálogo;
- no debe crear clientes;
- no debe crear pólizas;
- no debe crear cobros;
- no debe crear cartera;
- no debe crear finmovs;
- permite probar importación multi-país sin impactar operación financiera;
- permite detectar credenciales y forzar `credentialRef/backend_required`.

## 3. Resultado sanitizado por fuente

| País | Archivo | Hojas totales | Hojas operativas estimadas | Filas índice estimadas | Bloques internos detectados | Bloques de acceso detectados | Estado |
|---|---|---:|---:|---:|---:|---:|---|
| GT | Directorio Aseguradoras Guatemala 2026.xlsx | 18 | 14 | 12 | 1 | 1 | Bloqueado parcialmente por credenciales/datos internos. |
| CO | Directorio - Aseguradoras Colombia 2024.xlsx | 17 | 16 | 6 | 1 | 1 | Bloqueado parcialmente por credenciales/datos internos. |

Notas:

- El reporte no incluye nombres, teléfonos, correos, accesos ni contraseñas.
- Las cifras son de control operacional, no payload migratorio.
- La presencia de bloques internos no significa que se descarten aseguradoras/contactos; significa que esos bloques no pueden escribirse directo.

## 4. Contrato P0 aplicado

Tipo de fuente:

```txt
directorio_aseguradoras
```

Colecciones permitidas:

```txt
aseguradoras
contactosAseguradora
configuracionCatalogo
documentos
gestiones
```

Colecciones prohibidas:

```txt
clientes
polizas
cobros
recibosEsperados
carteraPrimas
finmovs
cxcComisiones
cxpAsesores
usuarios
roles
permisos
secrets
credenciales
```

Campos mínimos:

```txt
nombre
pais
```

## 5. Bloqueos detectados

| Bloqueo | Motivo | Acción |
|---|---|---|
| Credenciales reales | La fuente contiene bloques de acceso/sistema. | No importar valores. Usar `credentialRef/backend_required`. |
| Datos internos A&S | La fuente contiene datos internos de empresa/equipo. | No escribir como datos de cliente ni usuario. Requiere revisión de configuración. |
| Contactos personales/equipo | La fuente contiene contactos internos. | Separar de contactos de aseguradora. Revisión humana. |
| País obligatorio | Cada aseguradora/contacto debe quedar con país explícito. | GT/CO explícito; si falta, `REQUIERE_VALIDACION`. |

## 6. Operación propuesta

### Permitido para dry-run

- Crear/actualizar aseguradoras por país.
- Crear/actualizar contactos de aseguradora, si son contactos institucionales.
- Registrar configuración comercial/catálogo por país.
- Registrar gestión de revisión para bloques dudosos.
- Marcar accesos como `credentialRef/backend_required` sin valor secreto.

### Bloqueado

- Escribir contraseñas/usuarios/tokens en UI o data store.
- Crear usuarios de plataforma.
- Crear clientes desde directorio.
- Crear pólizas desde directorio.
- Crear cobros/cartera desde directorio.
- Crear movimientos financieros desde directorio.

## 7. Estado de aprobación

```txt
DRY_RUN_PENDIENTE_REVISION
```

No aprobable automáticamente porque hay bloques de acceso/credenciales que deben quedar excluidos o convertidos en referencias backend.

## 8. Cambios técnicos asociados

Se endureció el builder P0 para:

- soportar `directorio_aseguradoras`;
- soportar `configuracion_catalogo`;
- bloquear colecciones `secrets` y `credenciales`;
- bloquear claves reales detectadas por nombre de campo;
- permitir `credentialRef = backend_required` como referencia segura;
- mantener preview sanitizado.

Archivos relacionados:

```txt
orbit360-platform/core/importa-dryrun-p0.js
tools/orbit360-test-importa-dryrun-p0.mjs
```

## 9. Siguiente paso

P0.3.1 — preparar conversión de directorio a operaciones propuestas:

```txt
fuente directorio
→ filas aseguradora/contacto/config
→ operaciones propuestas sanitizadas
→ bloqueos credenciales
→ reporte dry-run
→ revisión humana
→ sin escritura real
```

Acción manual: no requerida todavía.
