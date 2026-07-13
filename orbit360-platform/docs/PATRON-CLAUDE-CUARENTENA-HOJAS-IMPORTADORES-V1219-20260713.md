# Patrón reusable Claude — cuarentena previa en importadores v1.219

Fecha: 2026-07-13  
Alcance: prototipo comercializable, todos los tenants  
No contiene datos ni configuraciones de A&S

## Regla de producto

Un importador multihoja no debe confiar únicamente en el nombre de cada hoja.

Antes del mapeo debe separar:

```txt
hojas operativas de la entidad
índices y resúmenes
hojas de diagnóstico
hojas de personal interno
hojas técnicas o de configuración
hojas vacías
```

## UX requerida

El dry-run debe mostrar una sección “Hojas excluidas” con:

```txt
nombre de hoja
motivo de exclusión
conteo agregado
```

No debe mostrar el contenido que provocó la exclusión.

Estados recomendados:

```txt
Hoja operativa
Hoja de apoyo excluida
Contenido técnico excluido
Directorio interno excluido
Requiere revisión humana
```

## Contrato compatible con backend

La cuarentena ocurre antes de:

```txt
normalizar entidades
capturar recursos protegidos
crear operaciones
calcular crear/actualizar
aplicar datos
```

El patrón no escribe en almacenamiento y no fusiona entidades.

## Reglas multi-tenant

- Configurable por tipo de fuente.
- No hardcodear nombres de empresas o clientes.
- Combinar detección por nombre y señales de contenido.
- Una hoja operativa con campos de acceso no debe confundirse con una hoja técnica.
- Ante duda, excluir y solicitar revisión; nunca aplicar automáticamente.

## Academia

Actualizar la ruta del importador para enseñar:

1. por qué una hoja se excluye;
2. diferencia entre hoja operativa y hoja técnica;
3. qué información aparece en el dry-run;
4. por qué la exclusión ocurre antes del parser;
5. cómo corregir la fuente y repetir el dry-run.

## Pruebas mínimas

1. Índice excluido por nombre.
2. Hoja técnica renombrada excluida por contenido.
3. Directorio de personal interno excluido.
4. Hoja operativa con contactos y plataforma preservada.
5. Resultado sin valores de la hoja excluida.
6. Parser base recibe únicamente hojas permitidas.

## Impacto Claude / prototipo reutilizable

```txt
Patrón reusable detectado: Sí
Debe compartirse con Claude: Sí
Módulos: Importadores, Aseguradoras, Configuración, Academia
Texto UI: operativo, sin términos de infraestructura
Riesgo si se ignora: mezclar fuentes y presentar operaciones inválidas
```
