# Registro — migración clientes Siga CRM

Fecha: 2026-07-09  
Proyecto: Orbit 360 A&S  
Fuente real: `Contratantes Datos de Contacto 2026-07-08.xlsx`  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.

## Contexto

Paula envió la primera fuente real de clientes exportada desde Siga CRM. Indicó reglas críticas para que la migración no sea solo para A&S, sino reusable para futuros tenants desde la plataforma:

```txt
- importador inteligente;
- mapeo de sinónimos;
- dry-run;
- calidad de datos;
- edición rápida de asesor;
- notificación/listado para asesores;
- deduplicación exacta y probable;
- estado activo/inactivo derivado de pólizas;
- no importar campos irrelevantes;
- multi-tenant y multi-país;
- normalización geográfica;
- terminología adecuada GT/CO.
```

## Archivos creados

```txt
orbit360-platform/docs/AUDITORIA-FUENTE-CLIENTES-SIGA-CRM-20260709.md
orbit360-platform/docs/CONTRATO-IMPORTADOR-CLIENTES-MULTITENANT-SIGA-CRM-20260709.md
orbit360-platform/docs/REQUERIMIENTOS-UX-CLIENTES-CALIDAD-DATOS-ASESORES-20260709.md
orbit360-platform/docs/REGISTRO-MIGRACION-CLIENTES-SIGA-CRM-20260709.md
```

## Resultado de lectura inicial

```txt
Hojas: 1
Hoja: Worksheet
Rango usado: A1:AD441
Registros: 440
Columnas: 30
```

## Hallazgos clave

```txt
- 417 personas individuales/naturales.
- 23 personas jurídicas.
- 30 registros sin vendedor/asesor.
- 413 registros sin correo principal.
- 173 registros sin WhatsApp.
- 168 registros sin ningún teléfono usable considerando WhatsApp/teléfono/contacto principal.
- 8 grupos duplicados exactos normalizados, 16 registros involucrados.
- El estado exportado por Siga CRM no debe definir estado operativo final.
```

## Decisiones tomadas

```txt
- Esta fuente sí se usará como clientes.
- No se escribe todavía en producción.
- Se debe preparar dry-run.
- Datos faltantes alimentan calidad de datos.
- Asesor debe ser editable rápido desde listado.
- Cliente activo/inactivo se calculará después de importar pólizas.
- Campos irrelevantes como grupos/subgrupos se omiten salvo confirmación.
```

## Preguntas pendientes a Paula

```txt
1. ¿Qué significa C.O en vendedor?
2. ¿Grupos/SubGrupos tienen utilidad real o se omiten?
3. ¿Puesto se conserva como ocupación/cargo opcional?
4. ¿Lista oficial inicial de asesores activos?
5. ¿Vendedor vacío queda en validación o se asigna temporalmente a Paula?
```

## Próxima acción

Preparar dry-run de clientes:

```txt
crear / actualizar / omitir / requiere validación
calidad de datos
asesor normalizado
duplicados exactos/probables
campos ignorados
preguntas de mapeo
```

## Estado

Primera fuente real de clientes recibida, leída, auditada y documentada. Pendiente dry-run.