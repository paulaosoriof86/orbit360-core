# Implementación P0.10 — configuración tenant de aseguradoras, aliases y perfiles financieros

Fecha: 2026-07-10  
Módulo: Aseguradoras → Fuentes → Cotizador → Comparativo  
Estado: `IMPLEMENTADO_EN_CONTRATO / CONFIG_AYS_REGISTRADA / EMPALME_RUNTIME_PENDIENTE / SIN_HABILITACION`

## 1. Necesidad

Las fuentes reales utilizan nombres legales, marcas, nombres bancarios, abreviaturas y nombres de uso común. La plataforma debe asociarlos a una sola aseguradora sin pedir IDs manuales y sin hardcodear las decisiones de A&S en el core reusable.

Además, algunos componentes financieros son específicos de una aseguradora y tenant. Deben vivir en configuración versionada, con evidencia y segundo gate, no en una fórmula global.

## 2. Decisiones A&S cerradas

### Aseguradora Rural / Banrural

- entidad canónica: `Aseguradora Rural`;
- nombre visible: `Aseguradora Rural (Banrural)`;
- `Banrural` es alias de uso común;
- Autos y Gastos Médicos se asocian a la misma aseguradora;
- no se crean dos fichas.

### Seguros Columna

- `Cotizador VA 2026 V1.4.xlsx` corresponde a Seguros Columna;
- no queda en validación de identidad;
- sus reglas y presentación sí permanecen pendientes de revisión documental.

### Aseguradora Guatemalteca

Para vehículos en A&S:

```text
Gastos de emisión = 5% de la prima neta
IVA = 12% del subtotal gravable previo al impuesto
```

La asistencia y otros componentes continúan derivados de cada fuente/producto. No forman parte de una constante global.

## 3. Arquitectura

### Core reusable

```text
orbit360-platform/core/tenant-insurer-config-p10.js
```

Responsabilidades:

- registrar configuraciones por tenant;
- normalizar aseguradoras;
- resolver alias, nombres, pistas de archivo e IDs;
- preferir IDs del directorio;
- usar IDs internos estables si todavía no existe vínculo de directorio;
- resolver perfiles financieros por país/producto/vehículo/plan;
- aplicar componentes de forma aditiva;
- impedir duplicados de IVA/gastos;
- conservar cero escritura y cero habilitación.

El core no contiene nombres, aliases, porcentajes ni reglas de A&S.

### Configuración A&S

```text
orbit360-platform/data/tenant-alianzas-soluciones-insurers-p10.js
```

Contiene solamente configuración operativa no sensible:

- claves canónicas;
- IDs internos estables;
- nombres visibles;
- aliases;
- pistas de nombres de archivo;
- perfiles financieros confirmados;
- referencias de evidencia sin payload.

No contiene:

- contactos;
- correos;
- teléfonos;
- cuentas bancarias;
- usuarios o contraseñas;
- URLs de acceso;
- datos de clientes;
- tablas tarifarias completas.

### Adapter de lote

```text
orbit360-platform/core/tenant-source-batch-adapter-p10.js
```

Convierte fuentes sin ID manual en fuentes listas para P0.9d:

```text
nombre/alias/archivo
→ resolución tenant
→ directorio
→ aseguradoraId
→ clave canónica
→ lote documental
```

Una fuente desconocida se bloquea. No se inventa una aseguradora.

## 4. Estrategia de IDs

Orden de resolución:

1. ID existente del directorio del tenant.
2. ID interno estable de configuración.
3. bloqueo si existe ambigüedad o no hay coincidencia.

Los IDs internos se mantienen invisibles para el usuario normal. Cuando el directorio ya tiene la entidad, el ID del directorio prevalece.

## 5. Perfil financiero AseGuate

El perfil agrega únicamente componentes faltantes:

### Gastos de emisión

```text
tipo: issuance_expense
calculationType: rate
rate: 0.05
formulaModel.base: base_premium
```

### IVA

```text
tipo: tax
calculationType: rate
rate: 0.12
formulaModel.base: subtotal_before_tax
```

La base `subtotal_before_tax` permite incluir los componentes gravables anteriores al IVA, como prima neta, gasto de emisión y asistencia cuando la fuente la clasifica como gravable.

## 6. Comprobación con cotizaciones ejemplo

### Microbús

```text
Prima neta:        1,800.00
Asistencia:          350.00
Gasto emisión:        90.00
IVA:                 268.80
Total:             2,508.80
```

### Automóvil

```text
Prima neta:        2,500.00
Asistencia:          350.00
Gasto emisión:       125.00
IVA:                 357.00
Total:             3,332.00
```

Los ejemplos confirman la composición financiera. Todavía se exige validar el mapeo del bloque tarifario, la variante, la fuente y el financiamiento antes de habilitar.

## 7. Lote de once fuentes

P0.10 resuelve:

```text
11 fuentes
→ 6 aseguradoras
→ 8 Excel
→ 3 PDF
```

Agrupaciones:

- Seguros BAM: Vehículos y Salud.
- Bantrab: Autos y Motos.
- Seguros Columna: Vehículos.
- Aseguradora Guatemalteca: tarifario, automóvil PDF y microbús PDF.
- Aseguradora Rural (Banrural): Autos y Gastos Médicos.
- Seguros Universales: Riesgo Plus PDF.

La usuaria no debe asignar IDs ni crear referencias backend manualmente.

## 8. Referencias autorizadas

`fileRef` es una referencia lógica creada por backend al cargar o seleccionar un archivo. No es una ruta local ni un dato que deba digitarse.

Ejemplos de esquema:

```text
drive://tenant/documento
upload://tenant/documento
backend-ref://tenant/documento
```

El resolver P0.9d valida tenant, aseguradora, documento, propósito, tarea y vencimiento. Las rutas locales y credenciales no llegan al frontend ni al store.

## 9. Empalme seguro

Se actualizó:

```text
tools/orbit360-integrar-aseguradoras-knowledge-p09-index.mjs
```

Orden añadido:

```text
core/tenant-insurer-config-p10.js
data/tenant-alianzas-soluciones-insurers-p10.js
core/tenant-source-batch-adapter-p10.js
```

Los tres scripts cargan antes del registry/runtime de Aseguradoras.

El integrador continúa:

- en dry-run por defecto;
- con validación UTF-8;
- con backup y rollback en `--apply`;
- sin commit, push o deploy;
- sin tocar backend protegido.

`--apply` no se ejecutó.

## 10. Smokes

```text
tools/orbit360-test-tenant-insurer-config-p10.mjs
tools/orbit360-test-tenant-source-batch-adapter-p10.mjs
tools/orbit360-test-integrar-aseguradoras-knowledge-p09-index.mjs
.github/workflows/orbit360-tenant-insurer-config-p10-smoke.yml
```

Cubren:

- Banrural/Rural como una sola entidad;
- Autos y Salud bajo la misma aseguradora;
- Columna sin ambigüedad;
- resolución por nombre, archivo, ID de directorio e ID interno;
- 5% de gasto sobre prima neta;
- 12% de IVA sobre subtotal gravable;
- reproducción de los dos totales de ejemplo;
- cero duplicación de IVA/gastos;
- aislamiento de otro tenant;
- once fuentes y seis aseguradoras;
- 8 Excel y 3 PDF;
- fuente desconocida bloqueada;
- cero escritura/habilitación;
- orden de scripts.

## 11. Seguridad

- configuración tenant separada del core;
- sin secretos o PII;
- sin `Orbit.store` directo;
- sin red;
- sin almacenamiento local;
- sin activación automática;
- evidencia versionada;
- segundo gate obligatorio.

## 12. Impacto

### Aseguradoras

La ficha podrá mostrar nombre legal y alias, agrupar las fuentes correctas y evitar duplicados.

### Cotizador

Las reglas podrán recibir perfiles financieros específicos por tenant/aseguradora antes de reconciliarse.

### Comparativo

Consumirá propuestas normalizadas sin confundir nombres comerciales con entidades distintas.

### Otros tenants

Registran su propio archivo de configuración con sus aliases y perfiles. No heredan A&S.

## 13. Pendientes

- ejecutar el workflow visible;
- aplicar el integrador en un checkout validado;
- conectar el directorio real al adapter;
- generar fileRefs reales desde Drive/upload;
- persistir la primera fuente en Firestore LAB;
- construir reglas reales AseGuate con P0.10;
- persistir binding y ejecutar segundo gate;
- smoke visual;
- UX final con Claude.
