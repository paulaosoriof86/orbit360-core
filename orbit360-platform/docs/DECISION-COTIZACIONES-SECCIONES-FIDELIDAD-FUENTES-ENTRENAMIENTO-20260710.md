# DECISIÓN MAESTRA — COTIZACIONES POR ASEGURADORA, SECCIONES, FIDELIDAD Y FUENTES DE ENTRENAMIENTO

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main.  
Control acumulado: `CONTROL-MAESTRO-ACUMULADO-CLAUDE-BACKEND-UX-ACADEMIA-ORBIT360-AYS-20260709.md`.

## 0. Decisión ejecutiva

La cotización individual de una aseguradora no puede reducirse a una plantilla genérica de prima, impuestos y coberturas comunes.

En Guatemala, y también en otros países/productos, las aseguradoras presentan información con estructuras propias, por ejemplo:

- Sección I — daños propios, colisión, vuelco, robo u otras coberturas del vehículo;
- Sección II — responsabilidad civil, daños a terceros, bienes y lesiones;
- Sección III — lesiones o gastos médicos de ocupantes;
- coberturas adicionales;
- beneficios adicionales;
- beneficios particulares de la aseguradora;
- servicios y asistencias;
- exclusiones;
- condiciones especiales;
- anexos;
- notas;
- requisitos;
- formas y calendarios de pago;
- otras secciones no estandarizadas.

Las etiquetas, orden, agrupación y contenido pueden variar por aseguradora, país, producto, plan y versión documental.

Por tanto, Orbit 360 debe separar dos capas:

```txt
Capa canónica
→ permite calcular, validar, buscar y comparar valores equivalentes.

Capa de presentación por aseguradora
→ conserva las secciones, títulos, orden, etiquetas, beneficios y campos particulares de la fuente.
```

El Comparativo utilizará principalmente la capa canónica.  
La impresión individual utilizará ambas capas, dando prioridad a la fidelidad de la presentación de la aseguradora dentro de la identidad visual A&S/tenant.

## 1. Evidencia funcional existente en v110

La auditoría de `comparativo_final_v110.html` confirmó que la fuente ya contiene:

- renderers específicos para Sección I, II y III;
- agrupaciones de coberturas adicionales y beneficios;
- esquemas distintos por ramo y país;
- listas de campos diferentes por aseguradora;
- reglas de extracción que obligan a leer todo el documento;
- instrucciones especiales para buscar información en secciones finales, anexos y áreas denominadas `Plus`;
- reglas para beneficios particulares, asistencias, llantas, cristales, chapas, fianzas, anticipos funerarios, anexos y otros campos;
- plantillas y estructuras que no deben perderse al normalizar.

Esta riqueza debe conservarse como conocimiento asociado a `aseguradoraId` de Orbit, no como código monolítico ni como un segundo directorio de aseguradoras.

## 2. Regla de fidelidad

La impresión individual debe:

1. conservar todos los datos materiales de la propuesta original;
2. conservar el orden lógico de secciones de la aseguradora;
3. conservar los títulos y nombres particulares cuando aportan significado;
4. conservar campos no canónicos y beneficios exclusivos;
5. indicar claramente la aseguradora, producto, plan, vigencia y documento fuente;
6. usar la marca A&S/tenant como marco visual;
7. incluir advertencias de documento informativo y condiciones aplicables;
8. permitir consultar el PDF o archivo original;
9. bloquear impresión definitiva si la extracción no ha sido validada;
10. versionar la plantilla por aseguradora/país/producto.

No se busca copiar píxel por píxel el documento de la aseguradora. Se busca una representación fiel, completa, verificable y corporativa.

## 3. Modelo dinámico de secciones

Cada versión de formato debe admitir una lista ordenada de secciones.

Ejemplo conceptual:

```txt
presentacionAseguradora
  aseguradoraId
  país
  ramo
  producto
  plan
  versión
  fuente
  secciones[]
    id
    clave canónica opcional
    título original
    subtítulo original
    orden
    estilo de origen
    campos[]
      etiqueta original
      clave canónica opcional
      valor original
      valor normalizado opcional
      tipo/unidad/moneda
      confianza
      ubicación en la fuente
```

La clave canónica es opcional porque una aseguradora puede presentar un beneficio que todavía no exista en el catálogo común.

Si un campo no tiene equivalencia canónica:

- se conserva;
- se muestra en la cotización individual;
- se puede proponer para enriquecer el catálogo;
- no se descarta ni se fuerza a una categoría incorrecta.

## 4. Secciones estándar sin limitar la fuente

Orbit reconoce como categorías frecuentes:

- datos generales;
- Sección I;
- Sección II;
- Sección III;
- coberturas adicionales;
- beneficios adicionales;
- beneficios particulares;
- exclusiones;
- condiciones;
- formas de pago;
- notas;
- anexos;
- otra.

Estas categorías sirven para búsqueda y agrupación. No obligan a renombrar la sección original ni limitan secciones adicionales.

Ejemplos que deben conservarse como título fuente:

```txt
Coberturas Adicionales Plus
Beneficios exclusivos del plan
Anexos especiales
Servicios incluidos
Condiciones particulares
Limitaciones y exclusiones
```

## 5. Fuentes de conocimiento y presentación

### 5.1 Cotizador Excel con hoja de salida o área de impresión

Es la fuente preferida cuando:

- contiene las tarifas o reglas;
- calcula la prima;
- genera en el mismo libro una cotización completa;
- conserva secciones, textos, beneficios y opciones de pago;
- tiene hoja de resultados o área de impresión.

Este archivo puede servir simultáneamente para:

```txt
tarifas/reglas
+
presentación de la cotización
+
casos de prueba
```

Se debe leer:

- fórmulas;
- tablas auxiliares;
- validaciones/listas;
- hojas ocultas relevantes;
- rangos nombrados;
- macros solo como referencia, sin ejecutarlas de manera insegura;
- hoja de salida;
- área de impresión;
- imágenes/logos si son parte de la presentación;
- textos fijos y secciones.

### 5.2 Cotización PDF oficial

Es fuente primaria para presentación cuando:

- la aseguradora genera la cotización fuera del Excel;
- el Excel no contiene una salida completa;
- existe cotizador en línea;
- solo se conocen las tasas;
- se requiere verificar secciones, exclusiones, notas o beneficios.

### 5.3 Tarifario Excel/PDF

Sirve para reglas o tasas, pero por sí solo no define la presentación individual.

Si no existe hoja de salida ni cotización generada, debe acompañarse de al menos una cotización oficial por país/producto/plan relevante.

### 5.4 Póliza ejemplo y condiciones

Son fuentes complementarias para:

- términos y definiciones;
- coberturas;
- deducibles;
- exclusiones;
- anexos;
- requisitos;
- entrenamiento de lectura.

No deben utilizarse para inventar una cotización que contradiga el formato comercial vigente.

### 5.5 Corrección validada

Las correcciones humanas alimentan el conocimiento, pero:

- no sustituyen el archivo fuente;
- conservan antes/después;
- registran actor, motivo y fecha;
- requieren validación antes de modificar una regla general.

## 6. Caso de fuente tarifaria sin formato de cotización

Cuando una aseguradora entrega únicamente tarifas o tablas, Orbit debe marcar:

```txt
Fuente tarifaria disponible: Sí
Fuente de presentación disponible: No
Requiere cotización ejemplo: Sí
```

Para A&S, el caso informado de Aseguradora Guatemalteca se clasifica inicialmente así:

- existen tarifas;
- esas tarifas sirven para cálculo;
- es necesario aportar una cotización oficial de ejemplo para conocer y validar la presentación completa;
- pueden requerirse varios ejemplos si el formato cambia por producto o plan.

Este dato pertenece a la configuración/fuente A&S, no debe hardcodearse en el core reusable.

## 7. Perfil de entrenamiento por aseguradora

Cada combinación relevante debe tener un perfil de entrenamiento:

```txt
aseguradora
país
ramo
producto
plan o familia de planes
versión
fuentes tarifarias
fuentes de presentación
pólizas ejemplo
condiciones
reglas de extracción
campos conocidos
secciones conocidas
casos de prueba
confianza
estado de validación
```

Estados sugeridos:

```txt
inventario_fuentes
fuentes_incompletas
lectura_pendiente
extracción_en_prueba
requiere_validación
calibrado
validado_habilitado
reemplazado_por_versión
bloqueado
```

## 8. Relación Cotizador / Comparativo

### Cotizador

Debe conservar la presentación individual completa de cada resultado, tanto si proviene de:

- tarifa validada;
- cotizador Excel;
- cotizador en línea asistido;
- PDF externo;
- ajuste manual versionado.

### Comparativo

Debe utilizar los valores canónicos equivalentes para construir la tabla por producto.

No debe descartar los campos particulares. Estos pueden aparecer como:

- filas adicionales;
- sección de beneficios diferenciales;
- notas por aseguradora;
- anexos consultables;
- explicación de la recomendación.

Al volver del Comparativo a una propuesta individual, debe seguir disponible la presentación fiel de esa aseguradora.

## 9. Integridad de extracción

La extracción debe recorrer:

- todas las hojas y secciones relevantes del Excel;
- todas las páginas del PDF;
- tablas y texto libre;
- notas y letra pequeña;
- secciones finales;
- anexos;
- beneficios y exclusiones;
- opciones de pago;
- campos particulares.

No se debe considerar exitosa una extracción solo porque encontró prima total y aseguradora.

La validación mínima debe revisar:

- identidad de la aseguradora;
- país y moneda;
- ramo/producto/plan;
- prima neta, gastos, impuestos, asistencia, recargos y total;
- cuotas y forma de pago;
- secciones requeridas por el formato conocido;
- cobertura y deducibles críticos;
- beneficios particulares;
- exclusiones y notas cuando existan;
- coincidencia contra la fuente.

## 10. Smokes obligatorios

1. Conservar títulos y orden de Sección I, II y III.
2. Conservar una sección con nombre particular no canónico.
3. Conservar beneficios que no existen en el catálogo común.
4. Extraer campos canónicos sin eliminar la presentación fuente.
5. Reconocer que un cotizador Excel con hoja de salida sirve para tarifas y presentación.
6. Reconocer que un tarifario sin salida requiere cotización ejemplo.
7. Validar versiones diferentes por aseguradora/producto.
8. Impedir impresión definitiva de una extracción no validada.
9. Conservar el documento original como referencia.
10. No mezclar presentación de una aseguradora con otra.
11. Comparar campos canónicos sin perder campos exclusivos.
12. Generar PDF individual con todas las secciones aplicables.

## 11. Claude / prototipo / UX

Este bloque es acumulativo y obligatorio para Claude.

Claude deberá diseñar posteriormente:

- ficha Aseguradoras con inventario de fuentes;
- indicador `tarifas disponibles / presentación disponible / ejemplo requerido`;
- visor de hojas/áreas de salida del cotizador Excel;
- visor de PDF original;
- editor de propuesta de extracción por sección;
- reordenamiento solo como corrección versionada;
- pantalla de validación y diff;
- preview de cotización individual fiel;
- versión y vigencia de plantilla;
- advertencias por fuente incompleta;
- UX corporativa sin duplicar el directorio.

No debe diseñar un formulario rígido con solo Sección I, II y III. Debe admitir formatos dinámicos y particulares.

## 12. Academia

Rutas requeridas:

### Operativo/Admin/Dirección

- identificar fuentes tarifarias y de presentación;
- cargar cotizador Excel;
- revisar hoja de salida;
- cargar cotización oficial complementaria;
- validar secciones y campos;
- corregir extracción;
- aprobar versión;
- reemplazar versión sin perder histórico.

### Asesor

- interpretar secciones y beneficios;
- diferenciar coberturas comunes y particulares;
- revisar una cotización antes de compartir;
- acceder al documento original;
- usar el Comparativo sin asumir que toda cobertura cabe en una tabla común.

## 13. Estado y siguiente acción

Implementado en este bloque:

- contrato reusable de presentación por aseguradora;
- normalización de secciones dinámicas;
- conservación de títulos, orden y campos particulares;
- perfil de fuentes de entrenamiento;
- detección de tarifario sin ejemplo;
- test sintético;
- workflow dedicado.

Siguiente acción del plan:

1. integrar el inventario de fuentes y documentos en Aseguradoras;
2. preparar adapters para cotizadores Excel y PDFs;
3. solicitar fuentes reales por aseguradora únicamente cuando empiece la calibración;
4. comenzar por aseguradoras con cotizador Excel completo;
5. marcar como pendiente de ejemplo las que solo tengan tasas.

No se reabre CRM ni se modifica todavía la interfaz final de Cotizador/Comparativo.