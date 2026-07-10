# ADDENDUM CONTROL MAESTRO — CLAUDE / UX / ACADEMIA — P0.4 EXCEL

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Carril: B con traducción obligatoria a A y preparación de C.

## Registro maestro obligatorio

```txt
Fecha: 2026-07-10
Carril: B / preparación A-C
Módulo/regla: Aseguradoras — fuentes Excel de tarifas, reglas, catálogos, salida e impresión
Cambio backend/local: contrato documental + adapter estructural Excel + versionado + dry-run
Patrón reusable: un libro puede cumplir múltiples funciones y varias fuentes pueden cubrir una misma aseguradora/producto
¿Aplica a Claude/prototipo?: Sí
UX requerida: inventario por libro/hoja/capacidad, corrección humana, diff de versión y estados honestos
Academia requerida: mantenimiento de fuentes, clasificación, validación, seguridad, versionado y relación con Cotizador/Comparativo
Manual/operación requerida: cargar/reemplazar versión, revisar advertencias, confirmar roles de hojas y capacidades
Archivos fuente: document-source-contract-p04.js; excel-workbook-adapter-p04.js
Estado backend: IMPLEMENTADO_BACKEND / CI_PENDIENTE_CONFIRMACION
Estado prototipo: PENDIENTE_PROTOTIPO
Estado Academia: PENDIENTE_ACADEMIA
Estado enviado a Claude: NO_ENVIADO
Condición de cierre: parser real + primer inventario sanitizado + UX + smoke visual + confirmación de versión
```

## 1. Patrón que Claude debe conservar

Claude no debe diseñar una pantalla que reduzca el flujo a:

```txt
Subir Excel → Importar tarifas
```

La UI debe reconocer que un libro puede contener:

- formulario de cotización;
- tarifas;
- reglas;
- recargos;
- impuestos/gastos;
- catálogos y listas desplegables;
- condiciones/beneficios/exclusiones;
- hoja de salida;
- área de impresión;
- casos de prueba;
- cálculos internos.

Cada capacidad se presenta como **propuesta por validar**.

## 2. UX mínima en Aseguradoras

Dentro de la ficha de una aseguradora debe existir una sección consolidada de conocimiento, sin redundar el directorio:

```txt
Fuentes y conocimiento
├─ Documentos
├─ Cotizadores y tarifarios
├─ Productos y planes
├─ Reglas propuestas
├─ Presentación e impresión
├─ Casos de prueba
└─ Versiones y validaciones
```

No crear zonas duplicadas de “documentos”, “tarifas” y “entrenamiento” dispersas en distintas partes de la ficha.

## 3. Wizard de carga

Pasos esperados:

1. Aseguradora.
2. País.
3. Ramo/producto.
4. Segmento/riesgo/vehículo/uso/plan, cuando aplique.
5. Tipo declarado de fuente o “Detectar”.
6. Archivo o referencia Drive.
7. Inventario estructural.
8. Clasificación propuesta de hojas.
9. Capacidades propuestas.
10. Advertencias.
11. Comparación con versión anterior.
12. Confirmación de inventario.

La confirmación de inventario no equivale a aprobar tarifas.

## 4. Vista de inventario del libro

Debe mostrar por hoja:

- nombre;
- visible/oculta/muy oculta;
- rol propuesto;
- rango usado;
- fórmulas;
- validaciones;
- rangos nombrados;
- impresión;
- advertencias;
- botón para corregir el rol.

Roles desplegables:

```txt
Entrada
Tarifas
Reglas de cálculo
Salida de cotización
Catálogos
Condiciones y beneficios
Instrucciones
Cálculo interno
Otra
```

Debe incluir “Otro / Requiere validación” y evitar texto libre cuando exista catálogo.

## 5. Capacidades propuestas

La UI debe permitir confirmar o rechazar separadamente:

- contiene tarifas;
- contiene reglas;
- contiene formulario;
- contiene hoja de salida;
- contiene área de impresión;
- contiene presentación;
- contiene catálogos;
- contiene condiciones/beneficios;
- sirve como caso de prueba.

Estado inicial:

```txt
Requiere validación
```

No usar “Activo”, “Oficial” o “Validado” por defecto.

## 6. Varias fuentes por producto

La UX debe permitir:

- varios libros por aseguradora;
- un libro por autos y otro por motos;
- diferentes libros por país;
- diferentes planes;
- cotizaciones y pólizas ejemplo múltiples;
- condiciones y circulares múltiples;
- versiones históricas.

No mostrar un único slot de archivo por aseguradora.

## 7. Tarifario frente a cotizador

Si se detecta tarifa/reglas pero no salida imprimible, mostrar:

```txt
La fuente permite proponer tarifas o reglas, pero falta una cotización ejemplo para validar presentación, secciones y contenido final.
```

La UX debe solicitar una fuente complementaria, no inventar un formato genérico definitivo.

## 8. Impresión

La ficha debe presentar:

- hoja de salida detectada;
- área de impresión;
- orientación;
- tamaño de papel;
- ajuste de páginas;
- encabezado/pie;
- versión;
- estado de validación.

La previsualización visual se implementará cuando exista parser real. Debe conservar estructura y completitud de la aseguradora, con branding del tenant sin eliminar contenido original.

## 9. Versiones

Vista por fuente:

- versión vigente;
- versiones anteriores;
- fecha;
- hash/fingerprint visible de forma amigable;
- cambios detectados;
- fórmulas modificadas;
- impresión modificada;
- hojas agregadas/eliminadas;
- macros/vínculos externos;
- motivo de reemplazo;
- quién confirmó.

Acciones:

```txt
Ver diferencias
Mantener versión actual
Proponer nueva versión
Marcar reemplazada
Bloquear
```

Nunca borrar silenciosamente una versión utilizada para cotizaciones históricas.

## 10. Seguridad y copy

No mostrar en UI cliente:

```txt
backend
worker
parser interno
XLSX library
Firebase
Firestore
LAB
mock
base64
bytes
token
```

Copy permitido:

```txt
Lectura pendiente
Inventario generado
Requiere validación
Archivo protegido
Vínculos externos detectados
Macros detectadas; no se ejecutaron
Versión nueva propuesta
Falta cotización ejemplo
```

## 11. Relación con Cotizador

Cotizador debe consumir únicamente fuentes:

- con país/producto/moneda completos;
- validadas para la combinación;
- con versión vigente;
- con reglas/tarifas aprobadas mediante flujo posterior;
- sin advertencias bloqueantes pendientes.

Inventariar un libro no habilita automáticamente una aseguradora en Cotizador.

## 12. Relación con Comparativo

Comparativo puede usar después:

- secciones;
- coberturas;
- beneficios;
- exclusiones;
- condiciones;
- deducibles;
- presentación;
- casos de prueba.

La extracción de estos campos aún requiere P0.5/PDF y validación semántica.

## 13. IA

La UX no debe presentar la IA como responsable de “aprobar” una tarifa.

Flujo correcto:

```txt
Lectura estructural determinística
→ propuesta semántica asistida
→ evidencia hoja/celda/rango
→ corrección humana
→ prueba
→ validación
→ habilitación
```

El modelo de IA debe ser configurable por tenant/módulo. Claude, OpenAI, Gemini u otro proveedor no se hardcodean en la UI ni en el contrato.

## 14. Academia profunda

### Ruta Dirección/Admin

Lecciones:

1. Tipos de fuente por aseguradora.
2. Diferencia entre tarifario y cotizador.
3. Productos separados.
4. Inventario de hojas.
5. Macros y vínculos externos.
6. Validación de capacidades.
7. Versionado y vigencia.
8. Cuándo una fuente puede habilitarse.

### Ruta Operativo

Lecciones:

1. Cargar o referenciar fuente.
2. Seleccionar país/producto.
3. Revisar advertencias.
4. Corregir clasificación de hoja.
5. Solicitar cotización ejemplo faltante.
6. Escalar cambio de fórmula o impresión.

### Ruta Asesor

El asesor no administra tarifarios ni reglas. Debe aprender:

- cómo identificar versión y fecha de una cotización;
- por qué una aseguradora puede estar “pendiente de validación”;
- por qué no se debe prometer una prima hasta confirmar la cotización.

### Evaluaciones

Casos prácticos:

- tarifario sin hoja de salida;
- cotizador con macros;
- libro de motos cargado como autos;
- nueva versión con fórmulas distintas;
- vínculo externo roto;
- país/moneda faltantes;
- área de impresión modificada.

## 15. Estado para Claude

```txt
LISTO_PARA_INCLUIR_EN_PROXIMO_PAQUETE_CLAUDE
NO_REQUIERE_CLAUDE_TODAVIA
```

Claude se solicita cuando estén disponibles:

- parser real;
- inventario sanitizado de al menos un libro;
- estados y diffs reales;
- requerimientos visuales consolidados de P0.4/P0.5.

Así se evita pedir una UI basada únicamente en supuestos.