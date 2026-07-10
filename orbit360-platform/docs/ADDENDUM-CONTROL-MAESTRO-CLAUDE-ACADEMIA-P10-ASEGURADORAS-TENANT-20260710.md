# Addendum control maestro Claude/Academia — P0.10 aseguradoras por tenant

Fecha: 2026-07-10  
Estado: `ACUMULADO / NO_ENVIADO_A_CLAUDE / CONTRATO_Y_CONFIG_IMPLEMENTADOS`

## 1. Regla de continuidad

La futura UX debe consumir la resolución de aseguradoras y perfiles financieros P0.10. No debe crear listas paralelas ni hardcodear nombres, aliases o porcentajes en módulos visuales.

## 2. Nombre legal y nombre de uso

La ficha debe poder mostrar:

```text
Nombre legal
Nombre visible
Aliases
País
ID interno técnico oculto
ID de directorio
Estado de vinculación
```

Para A&S:

```text
Nombre legal: Aseguradora Rural
Nombre visible: Aseguradora Rural (Banrural)
Alias principal: Banrural
```

No crear fichas separadas para Banrural y Aseguradora Rural.

## 3. Administración de aliases

Admin/Dirección debe poder:

- agregar alias;
- corregir alias;
- vincular un nombre detectado a una aseguradora existente;
- revisar pistas de nombres de archivo;
- resolver ambigüedades;
- ver antes/después;
- registrar motivo y auditoría.

Operativo puede proponer correcciones, pero no cambiar la identidad global sin autorización.

Asesor solo ve el nombre visible y no administra aliases.

## 4. IDs

- los IDs se generan internamente;
- no se solicitan a la usuaria;
- no se muestran en la operación normal;
- el ID del directorio prevalece cuando existe;
- el ID interno estable evita duplicados mientras se vincula el directorio.

La UX debe mostrar estados humanos como:

```text
Vinculada al directorio
Pendiente de vincular
Coincidencia ambigua
No reconocida
```

## 5. Perfiles financieros por tenant/aseguradora

La futura vista debe permitir administrar, por país/producto/vehículo/plan:

- tipo de componente;
- porcentaje o valor fijo;
- base de cálculo;
- si es gravable;
- evidencia;
- versión;
- fecha y actor de confirmación;
- estado;
- impacto en una cotización de prueba.

No basta con mostrar un campo “IVA” o “gasto” sin su base.

### AseGuate A&S

Representar:

```text
Gastos de emisión: 5% sobre prima neta
IVA: 12% sobre subtotal gravable previo al impuesto
```

La asistencia sigue siendo específica de la fuente/producto. No mostrarla como constante universal del perfil financiero.

## 6. Simulador de validación

La interfaz debe permitir seleccionar una regla propuesta y visualizar:

```text
Prima neta
Asistencia/otros
Gastos de emisión
Subtotal gravable
IVA
Financiamiento
Prima total calculada
Prima total observada
Diferencia
Estado de reconciliación
```

Debe abrir la evidencia correspondiente sin mostrar PII no autorizada.

## 7. Lote documental

La UX del lote debe:

- resolver automáticamente la aseguradora;
- mostrar nombre detectado y nombre canónico;
- agrupar por aseguradora;
- mostrar 11 fuentes / 6 aseguradoras para el lote A&S;
- permitir corregir una resolución antes del dry-run;
- bloquear fuentes desconocidas;
- no pedir IDs;
- no pedir rutas del servidor;
- explicar que `fileRef` se genera al cargar o seleccionar el archivo.

## 8. Estados honestos

Usar:

```text
Aseguradora resuelta
Pendiente de vincular al directorio
Fuente lista para dry-run
Manifiesto generado
Requiere validación
Regla reconciliada
Binding pendiente de gate
Habilitado
```

No usar “activo” o “conectado” antes de confirmación backend.

## 9. Academia profunda

### Asesor

- reconocer el nombre visible de la aseguradora;
- comprender que Banrural es Aseguradora Rural;
- identificar la composición de prima mostrada;
- reportar una asociación incorrecta.

### Operativo

- revisar aseguradora detectada;
- revisar fuente y variante;
- proponer corrección de alias;
- entender diferencia entre referencia lógica y ruta técnica;
- revisar componentes financieros sin habilitarlos.

### Admin/Dirección

- administrar aliases;
- vincular directorio e ID interno;
- revisar base de gasto e IVA;
- comparar cálculo esperado/observado;
- validar evidencia;
- versionar perfil financiero;
- ejecutar segundo gate.

### Evaluaciones

- evitar duplicar Banrural/Rural;
- asignar Cotizador VA a Columna;
- identificar 5% sobre prima neta;
- identificar IVA sobre subtotal gravable;
- detectar doble IVA;
- bloquear fuente desconocida;
- diferenciar persistencia de habilitación.

## 10. Prohibiciones para Claude

- no hardcodear A&S en el core;
- no crear dos aseguradoras por alias;
- no mostrar IDs técnicos como dato principal;
- no pedir al usuario que invente un ID;
- no pedir rutas locales o fileRefs manuales;
- no asumir 5% para todas las aseguradoras;
- no asumir 12% fuera de la configuración aplicable;
- no duplicar IVA/gastos ya presentes;
- no tocar `Orbit.store` directamente;
- no activar Cotizador/Comparativo por coincidencia aritmética;
- no borrar histórico o evidencia.

## 11. Condición para solicitar candidata

Claude se solicitará después de:

1. empalme P0.9/P0.10 validado;
2. primera persistencia Firestore LAB;
3. read model real;
4. primera regla/binding AseGuate revisable;
5. smoke visual del flujo técnico provisional.

Hasta entonces: `NO_ENVIADO_A_CLAUDE`.
