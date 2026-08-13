# BLOQUE — GATE RUNTIME E INVENTARIO LAB DE ASEGURADORAS

Fecha: 2026-07-16  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Estado: sin merge a `main`, sin deploy productivo y sin datos sensibles versionados

## 1. Objetivo

Cerrar el descubrimiento manual repetitivo y convertir la revisión de Aseguradoras en una verificación automática del runtime ensamblado real.

El bloque cubre:

- inventario sanitizado de Firestore LAB;
- conciliación entre las 11 fuentes ya mapeadas y las colecciones operativas;
- inicio de sesión LAB automático;
- aceptación de confidencialidad una sola vez;
- Dirección en escritorio;
- Operativo en tableta;
- Asesor en móvil;
- menú móvil completo y acceso a Cliente 360;
- Guatemala antes de Colombia;
- ficha abierta en modo lectura;
- conocimiento mapeado visible en `Tarifas y conocimiento`;
- evidencia mediante JSON y capturas.

## 2. Carril A — frontend y runtime

Se agregó un gate Playwright que navega el preview LAB como usuario real y valida:

1. El login termina y la aplicación deja el estado `pre-auth`.
2. Existe como máximo una ventana legal.
3. Un solo clic de aceptación elimina la ventana y no reaparece.
4. Dirección escritorio abre el directorio, la ficha y la pestaña de conocimiento.
5. Operativo tableta repite el flujo con su rol activo.
6. Asesor móvil abre el menú hamburguesa y ve más de una opción.
7. Cliente 360 aparece en el menú móvil y cambia la ruta al seleccionarlo.
8. Aseguradoras mantiene Guatemala primero.
9. La ficha abre con `data-mode="read"` y sin botón Guardar.
10. El Asesor no ve botón Editar.
11. La ficha muestra mapeo/conocimiento y no un estado falso de ausencia de fuentes.

Las capturas previstas son:

- `direccion-desktop-aseguradoras.png`;
- `operativo-tablet-aseguradoras.png`;
- `asesor-mobile-menu.png`;
- `asesor-mobile-aseguradoras.png`;
- `failure.png` cuando un gate falla.

## 3. Carril B — backend protegido

Se agregó un lector administrativo de conteos sanitizados. No modifica Firestore.

Colecciones inventariadas:

- `aseguradora_manifiestos`;
- `aseguradora_propuestas`;
- `aseguradora_reglas_tarifarias`;
- `aseguradora_presentaciones`;
- `aseguradora_bindings`;
- `aseguradora_revisiones`;
- `aseguradoras` únicamente para identificación y conteo de documentos.

El inventario no extrae ni publica:

- tasas;
- importes;
- fórmulas completas;
- PII;
- archivos;
- credenciales;
- secretos;
- binarios.

El archivo de salida es:

```text
orbit360-platform/lab-aseguradoras-knowledge-inventory.json
```

Contiene únicamente conteos, estados, relación con aseguradora y gates sanitizados.

## 4. Carril C — información real A&S

El inventario compara el estado LAB contra el resumen sanitizado ya documentado:

- 6 aseguradoras con conocimiento mapeado;
- 11 fuentes;
- 8 Excel;
- 3 PDF;
- 6,357 hechos candidatos registrados en la documentación sanitizada.

Cada aseguradora se clasifica como:

- `DIRECTORY_MATCH_REQUIRED`;
- `MAPPED_NOT_PERSISTED`;
- `PARTIAL_METADATA_ONLY`;
- `OPERATIONAL_COLLECTIONS_PRESENT`.

Esto permite determinar exactamente qué falta sincronizar sin volver a leer o mapear los archivos originales.

## 5. Workflow automático

Se agregó:

```text
.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml
```

El workflow:

1. bloquea rama incorrecta;
2. valida sintaxis JavaScript;
3. ejecuta el validador estático de recuperación frontend/conocimiento;
4. resuelve exclusivamente la cuenta de servicio del proyecto `ays-orbit-360-lab`;
5. sincroniza el usuario LAB;
6. genera el inventario sanitizado;
7. publica un canal temporal LAB de siete días;
8. ejecuta el gate de tres vistas;
9. sube inventario, resultado y capturas como artifact de siete días.

No despliega producción ni modifica reglas Firestore.

## 6. Archivos

### Nuevos

- `tools/orbit360-inventariar-aseguradoras-knowledge-lab-v20260716.mjs`
- `tools/orbit360-gate-runtime-aseguradoras-v20260716-v2.mjs`
- `.github/workflows/orbit360-aseguradoras-runtime-gate-v20260716.yml`
- este documento

### Limpieza

Se eliminó una primera versión defectuosa del gate antes de incorporarla al workflow. La versión activa es únicamente `v2`.

## 7. Validación ejecutada directamente

Se ejecutó `node --check` fuera del repositorio sobre copias exactas de:

- inventario LAB;
- gate runtime Playwright.

Resultado:

```text
PASS_SINTAXIS_INVENTARIO
PASS_SINTAXIS_GATE_RUNTIME
```

El resultado funcional completo depende de GitHub Actions porque requiere:

- cuenta de servicio LAB;
- Firebase Hosting preview;
- usuario LAB;
- navegador Chromium.

A la fecha de este documento el conector todavía no devuelve una ejecución asociada al HEAD, por lo que no se declara PASS runtime antes de leer la evidencia.

## 8. Regla metodológica reforzada

A partir de este bloque, Aseguradoras no puede cerrarse con:

- grep;
- revisión estática aislada;
- manifest de archivos;
- una sola vista;
- confirmación manual sin evidencia previa.

Debe existir un resultado automatizado de:

```text
Dirección escritorio + Operativo tableta + Asesor móvil
```

La revisión de Paula queda reducida a una confirmación visual final sobre capturas y versión ya auditada.

## 9. Claude/prototipo

### Replicable

Claude debe incorporar:

- gate visual multivista como criterio de cierre de módulos;
- menú móvil verificable con navegación completa;
- prueba de lectura vs edición;
- prueba de aceptación legal idempotente;
- orden de país configurable;
- fixture sanitizado de conocimiento para pruebas del prototipo;
- estados visibles de mapeo/sincronización/validación/habilitación.

### No trasladar

- proyecto Firebase;
- secretos;
- cuenta de servicio;
- usuario LAB;
- datos exactos A&S;
- lógica administrativa de inventario Firestore.

## 10. Academia

Agregar una práctica de cierre para Dirección y Operativo:

> Antes de aprobar un módulo, comprobar el flujo en escritorio, tableta y móvil, confirmar que los datos mapeados se proyectan y distinguir un fallo de sincronización de un archivo no procesado.

Agregar una evaluación:

> El archivo fue mapeado, pero las colecciones de reglas y presentación aparecen en cero. ¿Qué corresponde?

Respuesta correcta:

> Revisar el inventario sanitizado, preparar diff de sincronización y validar. No remapear ni habilitar automáticamente.

## 11. Estado y siguiente acción

```text
Carril A: gate automatizado creado; ejecución remota pendiente de evidencia.
Carril B: inventario read-only creado; ejecución remota pendiente.
Carril C: comparación contra 11 fuentes preparada; cero remapeo.
```

Siguiente secuencia:

1. leer el resultado del workflow y sus artifacts;
2. corregir únicamente el primer fallo real, si existe;
3. obtener conteos LAB por aseguradora;
4. generar diff de sincronización de colecciones faltantes;
5. ejecutar la única confirmación visual final;
6. cerrar Aseguradoras;
7. continuar Cotizador/Comparativo sobre la misma fuente canónica;
8. implementar logotipo mediante almacenamiento seguro y `fileRef`.
