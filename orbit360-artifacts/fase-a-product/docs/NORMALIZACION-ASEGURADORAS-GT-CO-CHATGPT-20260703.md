# Normalización aseguradoras GT/CO desde archivos cargados en ChatGPT

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** normalización privada local realizada; datos reales NO subidos al repo.

## Archivos fuente procesados

- `Directorio Aseguradoras Guatemala 2026.xlsx`
- `Directorio - Aseguradoras Colombia 2024.xlsx`

## Resultado de normalización

- Total aseguradoras/canales normalizados: 30.
- Guatemala: 14 aseguradoras.
- Colombia: 16 aseguradoras/canales.
- Contactos estructurados: 241.
- Portales/app/web detectados: 32.
- Filas con posible acceso/clave/portal sensible: detectadas y marcadas, no publicadas.

## Estructura destino

```txt
aseguradoras[]
  contactos[]
  portales[]
  cuentas[]
  facturacion{}
  docs[]
  docsRequeridos[]
  comisiones{}
```

## Regla de seguridad

No se suben datos reales, teléfonos, correos completos, claves ni contraseñas al repositorio.

Las referencias de acceso/clave/portal quedan marcadas para resguardo seguro, no como texto plano público.

## Hallazgo sobre importación manual

El importador manual de Orbit ya tiene botón y soporte para Excel, CSV, PDF, Word e imagen/OCR. Sin embargo, estos dos Excel no son tablas simples: son libros multi-hoja donde cada hoja representa una aseguradora y la tabla de contactos empieza después de una portada con datos generales.

Por eso el importador manual debe tener una lógica específica para `directorio-aseguradoras`:

1. tratar cada hoja como una aseguradora;
2. detectar encabezado interno de contactos;
3. extraer datos generales de la parte superior;
4. agrupar contactos dentro de `contactos[]`;
5. separar portal/app/web en `portales[]`;
6. marcar claves/contraseñas como dato sensible;
7. no crear una aseguradora por cada contacto.

## Estado

- Normalización privada local: realizada.
- Datos reales en repo: no.
- Mejora del importador manual: documentada como necesaria para estos Excel multi-hoja.
- Prueba visual real del módulo Aseguradoras: pendiente en navegador local.
