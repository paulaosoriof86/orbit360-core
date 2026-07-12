# FRONTERA FUNCIONAL — COTIZADOR / COMPARATIVO
## Prototipo Orbit 360 vs tenant Alianzas y Soluciones

Fecha: 2026-07-11  
Repositorio: `paulaosoriof86/orbit360-core`  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open; sin merge ni deploy.

## 1. Corrección de interpretación

El archivo `comparativo_final_v110.html` reúne trabajo entrenado y afinado específicamente para Alianzas y Soluciones. No todo su contenido debe copiarse al prototipo general.

La separación obligatoria es:

```txt
Orbit 360 prototipo comercializable
→ estructura reusable, UX genérica, contratos, configuración y datos ficticios.

Tenant A&S operativo
→ tasas, reglas, links, formatos, entrenamiento, aseguradoras y lógicas exactas de A&S.
```

## 2. Qué debe quedar en el prototipo general

### 2.1 Cotizador reusable

Puede ser más sencillo que el cotizador A&S siempre que sea completo, estable y honesto.

Debe incluir:

- flujo funcional de cotización;
- cliente/prospecto, país, moneda, ramo y riesgo;
- aseguradoras y planes ficticios/configurables;
- soporte para fuentes tarifarias configurables por tenant;
- estado honesto cuando no existe fuente válida;
- registro de cotización recibida;
- prima separada: neta, gastos, impuestos y total;
- transferencia persistente al Comparativo mediante contratos/IDs;
- impresión genérica presentable;
- slots configurables para logo, plantilla y formato por aseguradora;
- responsive y copy no técnico.

No necesita reproducir las tasas, reglas ni formatos exclusivos de A&S.

### 2.2 Comparativo reusable

La experiencia del Comparativo sí es una capacidad comercial generalizable y debe conservar lo mejor de v110:

- misma estructura esencial en pantalla y PDF;
- tarjetas resumen;
- bloque cliente/riesgo;
- tabla profunda por secciones;
- logos de aseguradoras;
- prima total destacada;
- coberturas, límites, deducibles, exclusiones, pagos y vigencias;
- diferencias, ventajas y desventajas;
- recomendación consultiva explicable;
- Replantear por precio, cobertura, equilibrio, deducible, RC y selección manual justificada;
- restablecer recomendación automática;
- impresión/PDF profesional;
- historial y trazabilidad;
- plantillas de comunicación configurables y genéricas.

La lógica visual y de interacción es reusable. Los textos, reglas y cálculos específicos de A&S no lo son.

### 2.3 Aseguradoras reusable

Debe conservar:

- directorio estratégico y operativo;
- fichas completas;
- productos/planes;
- contactos;
- plataformas;
- documentos;
- fuentes tarifarias;
- slots de credenciales y cuentas seguras;
- configuración del Cotizador/Comparativo;
- acciones y permisos.

Todo mediante configuración; nunca con datos reales A&S hardcodeados.

## 3. Qué es exclusivo del tenant A&S

Debe quedar exacto para A&S, pero no pedirse a Claude como contenido del prototipo general:

- tasas seguras entregadas y validadas;
- reglas por aseguradora, producto, plan, país, moneda, vehículo/riesgo y vigencia;
- fórmulas, mínimos, recargos, gastos, impuestos y excepciones reales;
- links y accesos propios de A&S;
- directorios y contactos reales;
- cotizadores y formularios específicos por compañía;
- lógicas extraídas de todos los cotizadores de aseguradoras aportados;
- entrenamiento y conocimiento documental específico de A&S;
- plantillas comerciales A&S;
- textos legales, asesor, registro SIB y datos institucionales aplicables;
- formatos de cotización individual que A&S utiliza por aseguradora;
- configuración exacta GT/CO;
- reglas de habilitación y validación de tarifas reales;
- casos sanitizados de prueba y trazabilidad de fuente.

Esta implementación pertenece a:

```txt
Orbit.tenant = alianzas-soluciones
+ configuración tenant
+ backend protegido
+ documentos/fuentes validadas
+ recursos seguros
+ importadores/dry-run
```

No debe vivir como hardcode en `modules/cotizador.js`, `modules/comparativo.js`, seed ni candidata Claude.

## 4. División de responsabilidades

### Claude — Carril A

Debe trabajar únicamente lo reusable:

- UX genérica del Cotizador;
- experiencia profunda reusable del Comparativo;
- impresión genérica del Cotizador con slots configurables;
- impresión/PDF reusable del Comparativo inspirada en v110;
- Replantear reusable;
- biblioteca genérica de plantillas;
- estados honestos;
- responsive;
- Academia general por rol;
- compatibilidad con contratos y hooks reales.

Claude no debe:

- copiar tasas A&S;
- copiar links o credenciales A&S;
- hardcodear aseguradoras reales;
- reproducir entrenamiento específico de A&S;
- declarar implementado el cotizador A&S exacto;
- inventar datos o fuentes reales.

### ChatGPT/Codex — Carriles B y C

Debe completar la implementación exacta A&S:

- cargar fuentes reales separadas;
- validar tasas y reglas;
- mapear cotizadores por aseguradora;
- configurar tenant A&S;
- conectar documentos, links y recursos seguros;
- aplicar contratos persistentes;
- conservar default-deny;
- validar país/moneda/impuestos;
- probar casos A&S;
- cerrar visual y operativamente Cotizador/Comparativo dentro del tenant;
- mantener backend protegido.

## 5. Criterios de cierre separados

### Prototipo Orbit 360

Se cierra cuando:

- el Cotizador genérico funciona bien con configuración ficticia;
- no simula tarifas reales;
- la impresión es presentable y configurable;
- el Comparativo conserva la experiencia profunda reusable;
- no hay datos ni reglas A&S hardcodeados;
- Academia enseña el flujo general.

### Tenant A&S

Se cierra cuando:

- las tasas y reglas validadas funcionan exactamente;
- cada aseguradora/producto usa su configuración correcta;
- el Cotizador refleja los insumos aportados por A&S;
- el Comparativo conserva pantalla/PDF, Replantear y propuesta consultiva de v110;
- las plantillas A&S funcionan;
- los links y recursos seguros están correctamente asociados;
- existe trazabilidad completa de fuente, versión y validación;
- se completa una validación visual y operativa con casos sanitizados A&S.

## 6. Regla permanente

```txt
Lo reusable se traduce al prototipo.
Lo específico de A&S se implementa en el tenant A&S.
No pedir a Claude que replique contenido A&S que corresponde a configuración, backend, fuentes o entrenamiento del tenant.
No simplificar en A&S aquello que ya fue validado en v110.
```
