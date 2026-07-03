# Auditoría aseguradoras — diseño, importación manual y Excel GT/CO

**Fecha:** 2026-07-03  
**Rama:** `ays/backend-tenant-lab-v99-20260703`  
**Estado:** revisión funcional/estática; pendiente prueba visual local con navegador.

## 1. Archivos revisados desde el chat

- `Directorio Aseguradoras Guatemala 2026.xlsx`
- `Directorio - Aseguradoras Colombia 2024.xlsx`

## 2. Resultado preliminar de lectura

### Guatemala

- 14 hojas de aseguradoras operativas detectadas.
- Hojas auxiliares excluidas: índice, diagnóstico, T&A y Tech.
- El archivo mezcla datos de aseguradora, contactos, portales/accesos, teléfono, emergencias, web, app, NIT, código y observaciones.

### Colombia

- 16 hojas de aseguradoras/canales detectadas.
- Hoja auxiliar excluida: índice.
- El archivo mezcla aseguradoras, canales tipo Synergias, contactos, claves, accesos, portales, notas y datos de oficina.

## 3. Decisión de migración

No debe migrarse como tabla plana de contactos. La estructura correcta para Orbit es:

```txt
aseguradoras
  contactos[]
  portales[]
  cuentas[]
  facturacion{}
  docs[]
  docsRequeridos[]
  comisiones{}
```

## 4. Revisión del módulo Aseguradoras

La ficha actual cumple funcionalmente con lo pedido:

- tarjeta/directorio por aseguradora;
- vinculación activa/inactiva;
- ficha editable;
- logo;
- accesos/portales;
- Drive/repositorio;
- contactos;
- facturación;
- cuentas;
- documentos;
- comisiones por ramo;
- requisitos por producto;
- importador desde el módulo;
- creación manual de aseguradora.

## 5. Observación visual

La ficha es visualmente buena y más cercana a lo pedido que una tabla plana: usa drawer/modal, encabezado con degradado, logo, secciones separadas y botones de acción.

Pendientes visuales menores:

- mostrar `código/clave` de aseguradora en la ficha;
- separar mejor contactos vs portales/accesos cuando vienen mezclados desde Excel;
- validar visualmente en navegador porque esta revisión fue estática desde código;
- considerar chips por tipo de contacto en modo vista.

## 6. Importación manual

El módulo tiene botón de importación manual y el importador soporta CSV/TXT/Excel/PDF/Word/imagen, con remapeo manual mediante “Iterar / mejorar”.

Pendiente crítico de prueba:

- probar estos dos Excel reales en el importador manual de aseguradoras;
- verificar si el lector detecta correctamente encabezados internos cuando la hoja tiene portada antes de la tabla;
- verificar que los contactos y accesos no queden como aseguradoras separadas.

## 7. Conclusión

Para la migración desde ChatGPT se usará mapeo estructurado por aseguradora. Para la plataforma, el importador manual está habilitado, pero debe probarse con estos Excel reales y, si falla el encabezado interno/multi-hoja, ajustar el importador para directorios de aseguradoras con una lógica específica.
