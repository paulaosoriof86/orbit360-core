# IMPLEMENTACIÓN P0.1B — ASEGURADORAS / COBERTURA MULTIFUENTE POR COMBINACIÓN

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy y sin `main`.

## 0. Carril y alcance

Carril principal: B, con traducción obligatoria a A y Academia.

Este bloque continúa el plan aprobado:

```txt
CRM/Clientes cerrado como baseline
→ Aseguradoras como fuente primaria
→ Cotizador
→ Comparativo
→ validación transversal
```

No reabre Clientes, Pólizas, Cobros, Recibos, Cartera, Comisiones ni migraciones ya cerradas.

## 1. Necesidad

La primera versión runtime de fuentes mostraba cada documento por separado y un resumen global por aseguradora. Esa vista era insuficiente porque una aseguradora puede tener:

- múltiples pólizas ejemplo;
- múltiples cotizaciones ejemplo;
- varios cotizadores Excel;
- tarifarios diferentes;
- condiciones, beneficios, circulares y formularios múltiples;
- fuentes distintas para Autos, Motos, Gastos Médicos, Vida u otros productos;
- formatos distintos según segmento, tipo de riesgo, tipo/uso de vehículo, plan y vigencia.

El resumen global podía inducir a interpretar que una aseguradora estaba completa cuando únicamente estaba cubierta una combinación concreta.

## 2. Resultado esperado

La ficha debe responder por cada combinación:

```txt
¿Para qué país y moneda aplica?
¿Para qué ramo y producto?
¿Para qué familia/subtipo/segmento?
¿Para qué tipo de riesgo?
¿Para qué tipo y uso de vehículo?
¿Para qué plan?
¿Cuántas fuentes existen?
¿Cuántas pólizas/cotizaciones/cotizadores hay?
¿Hay tarifas?
¿Hay reglas?
¿Hay presentación?
¿Hay casos de prueba?
¿Falta una cotización ejemplo?
```

## 3. Causa raíz

El modelo original evolucionó como directorio operativo y trataba `aseguradora.docs[]` como una lista casi plana. La auditoría forense de `comparativo_final_v110.html` y las reglas aportadas por Paula demostraron que la suficiencia debe evaluarse por combinación y no por aseguradora completa.

## 4. Archivos modificados

### Runtime

```txt
orbit360-platform/modules/aseguradoras.js
```

### Smoke

```txt
tools/orbit360-test-aseguradoras-fuentes-runtime-p0.mjs
```

### Workflow ya existente que cubre ambos

```txt
.github/workflows/orbit360-cotizador-comparativo-smoke.yml
```

## 5. Implementación

### 5.1 Dimensiones

Cada fuente puede conservar:

```txt
pais
moneda
ramo
producto
familiaProducto
subtipoProducto
segmento
tipoRiesgo
tipoVehiculo
usoVehiculo
plan
```

Se genera una clave de cobertura usando esas dimensiones. Los campos vacíos no autorizan por sí mismos completar combinaciones específicas.

### 5.2 Agrupación

`resumenGrupos()` agrupa todas las fuentes de `aseguradora.docs[]` sin crear una colección paralela.

Cada grupo conserva:

```txt
fuentes[]
cantidad total
cantidades por tipo
cantidad de pólizas ejemplo
cantidad de cotizaciones ejemplo
cantidad de cotizadores Excel
tarifa disponible
reglas disponibles
presentación disponible
casos de prueba
condiciones/beneficios
requiere cotización ejemplo
estado
```

### 5.3 Estados de grupo

```txt
conocimiento_parcial
requiere_cotizacion_ejemplo
presentacion_sin_tarifa
fuentes_completas_requiere_validacion
validado_habilitado
```

`fuentes_completas_requiere_validacion` no significa activación automática. La habilitación sigue requiriendo validación.

### 5.4 Vista runtime

Las tarjetas de Aseguradoras muestran:

- cantidad de fuentes;
- cantidad de combinaciones;
- tarifas y presentación;
- cantidad de grupos que requieren ejemplo.

La ficha incorpora:

```txt
Cobertura de conocimiento por combinación
```

Cada combinación se presenta como bloque desplegable con:

- etiqueta completa;
- cantidad de fuentes;
- badges de tarifa, reglas, presentación y casos;
- estado;
- conteo por tipo documental.

### 5.5 Reducción de errores de digitación

Se incorporaron catálogos sugeridos mediante `datalist` para:

- ramo;
- producto;
- familia;
- subtipo;
- segmento;
- tipo de riesgo;
- tipo de vehículo;
- uso de vehículo;
- plan.

Los valores se derivan de las fuentes existentes y ramos de la aseguradora. Se mantiene la posibilidad de registrar un nuevo valor, que deberá validarse posteriormente.

### 5.6 Compatibilidad

Se conserva:

```txt
aseguradora.docs[]
```

Los registros legacy con `nombre` y `cat` siguen normalizándose. No se creó un segundo directorio, una base paralela ni almacenamiento directo.

## 6. Reglas funcionales protegidas

1. Autos/Automóvil no completa Autos/Motocicleta.
2. Gastos Médicos individual no completa familiar.
3. Una cotización PDF aporta presentación y caso de prueba, pero no inventa una tarifa general.
4. Un cotizador Excel puede aportar simultáneamente tarifas, reglas, presentación y casos.
5. Un cotizador sin salida confirmada debe requerir ejemplo propio.
6. Varias pólizas ejemplo de la misma combinación se conservan y cuentan por separado.
7. Varias versiones no se sobrescriben automáticamente.
8. País y moneda forman parte de la clasificación.
9. Una fuente comercial no activa tarifas.
10. La fuente original debe seguir vinculada por Drive/documento/referencia.

## 7. Smoke ampliado

El test cubre:

- compatibilidad de tarifario legacy;
- herencia GT→GTQ;
- tarifario sin presentación;
- cotizador Excel multiuso;
- cotizador sin salida confirmada;
- documento comercial;
- dos pólizas ejemplo para Autos;
- grupo independiente de Motos;
- Gastos Médicos individual;
- Gastos Médicos familiar;
- preservación de dimensiones avanzadas;
- clave de combinación con tipo de vehículo.

La sintaxis y el smoke se ejecutaron localmente antes del commit. GitHub Actions debe verificarse por separado.

## 8. Backend y seguridad

No se modificaron:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
```

El módulo continúa usando exclusivamente `Orbit.store`.

No se cargaron:

- datos reales;
- tarifas reales;
- documentos reales;
- credenciales;
- cuentas bancarias reales;
- secretos.

## 9. Impacto para Claude / prototipo

Estado:

```txt
IMPLEMENTADO_RUNTIME_PARCIAL
DOCUMENTADO_ACUMULATIVO
PENDIENTE_UX_FINAL
NO_ENVIADO_A_CLAUDE
```

Claude debe conservar obligatoriamente:

- Aseguradoras Orbit como única fuente maestra;
- multiplicidad abierta de fuentes;
- agrupación por combinación;
- filtros y catálogos por dimensión;
- conteos por tipo documental;
- separación Autos/Motos/GM individual/GM familiar;
- badges de tarifa, reglas, presentación y casos;
- estado `requiere cotización ejemplo` por combinación;
- fuente original, versión y vigencia;
- posibilidad de abrir el documento o Drive;
- ausencia de un laboratorio o directorio duplicado;
- visual corporativo más claro que el provisional;
- no reducir todo a una póliza o cotización ejemplo.

Claude no debe:

- fusionar fuentes de combinaciones distintas;
- asumir que una aseguradora completa todos sus productos;
- convertir la matriz en un formulario rígido;
- hardcodear nombres A&S en el core reusable;
- reemplazar `modules/aseguradoras.js` por el módulo de v110;
- tocar backend protegido.

## 10. Impacto Academia

### Dirección/Admin/Operativo

Academia debe enseñar:

- clasificar una fuente;
- asignar dimensiones;
- reconocer una combinación incompleta;
- diferenciar tarifa, reglas y presentación;
- interpretar múltiples pólizas/cotizaciones;
- separar Autos y Motos;
- separar productos individuales y familiares;
- conservar versiones;
- validar antes de habilitar.

### Asesor

Debe enseñar:

- revisar qué combinación está cubierta;
- no usar una fuente de otro producto;
- abrir el documento original;
- entender beneficios y condiciones particulares;
- no compartir una extracción no validada.

## 11. Pendientes siguientes

### P0.2 — Accesos y cuentas sensibles

- roles autorizados;
- mostrar/ocultar/copiar;
- backend seguro mediante `credentialRef`;
- auditoría sin guardar el valor;
- cuentas visibles bajo demanda;
- permisos multirol.

### P0.3 — Drive

- carpeta padre de aseguradoras;
- propuesta automática de coincidencia;
- dry-run;
- validación de ambiguos;
- apertura desde ficha;
- sin duplicación inicial en Storage.

### P0.4 — Adapters PDF/Excel

- inventario de hojas, fórmulas, validaciones y rangos;
- lectura del área de impresión;
- lectura completa de PDF;
- extracción de secciones;
- propuesta/diff;
- versionado;
- validación humana.

## 12. Condición de cierre

Cerrado en este bloque:

- runtime actualizado;
- grupos visibles;
- dimensiones editables;
- catálogos sugeridos;
- smoke ampliado;
- backend protegido intacto;
- Claude y Academia documentados.

Pendiente de validación:

- GitHub Actions visible;
- smoke visual en navegador;
- validación de responsive y densidad de la ficha.
