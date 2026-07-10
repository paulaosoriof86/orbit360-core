# PAQUETE SÚPER ACUMULADO PARA CLAUDE — EN CONSTRUCCIÓN

Fecha de corte: 2026-07-10  
Proyecto: Orbit 360 A&S  
Estado: **acumulando; todavía no entregar a Claude**.

## 1. Baseline obligatoria

Última candidata Claude recibida y aceptada como punto de continuidad:

```txt
Prototype Development Request - 2026-07-08T183042.881.zip
SHA256: 94cff830c387aa94e7278ba78dd7b2c15be2e863840dc947bb687ea979c50add
```

Claude debe trabajar sobre esa candidata o sobre una sucesora auditada formalmente. No debe volver a una versión anterior ni reconstruir módulos desde cero.

## 2. Propósito de este archivo

Este archivo es el índice súper acumulado de todo lo que deberá atender la próxima candidata de Claude:

- mejoras UX;
- estados honestos;
- patrones backend reusables traducidos al prototipo;
- reglas multi-tenant;
- permisos y rol activo;
- importadores;
- conocimiento documental de aseguradoras;
- Cotizador/Comparativo;
- Academia;
- hotfixes locales que no deben perderse;
- restricciones de empalme;
- smoke visual requerido.

No incluye secretos, datos reales, rutas privadas, credenciales, tasas reales ni lógica exclusiva protegida.

## 3. Momento correcto para solicitar nueva candidata

No solicitar a Claude solo porque haya pasado tiempo.

Solicitar cuando estén cerrados estos mínimos:

1. bootstrap/runtime Aseguradoras estable;
2. bridge documental same-origin conectado;
3. primer preview real desde la plataforma;
4. primer dry-run real training;
5. historial metadata-only visible después de recarga;
6. read model estable;
7. estados y permisos confirmados;
8. frontera visual Aseguradoras/Cotizador/Comparativo definida;
9. lista de hotfixes locales y archivos protegidos actualizada;
10. smoke visual del flujo base.

En ese momento se debe generar un paquete acumulado completo, no un parche parcial.

## 4. Reglas permanentes del prototipo

### SaaS/tenant

- Orbit 360 es SaaS, white-label y multi-tenant.
- A&S es el primer tenant; no es un fork.
- Marca Orbit 360 en chrome; logo del cliente solo en slot white-label.
- Nada específico de A&S debe hardcodearse en componentes reusables.
- Configuración por tenant: países, monedas, aseguradoras, alias, productos, impuestos, roles, permisos, módulos e integraciones.

### Contrato de datos

- Los módulos usan `Orbit.store`.
- No usan almacenamiento operativo directo.
- No usan Firebase, Firestore, localStorage, mocks, demo o endpoints externos desde componentes.
- La UI no debe mencionar backend, LAB, Firestore, Firebase, smoke o credenciales.

### Estados honestos

Usar lenguaje de usuario:

```txt
Pendiente de conexión
Pendiente de lectura
Requiere validación
Vista previa lista
Referencia pendiente
Documento procesado
Regla propuesta
Presentación propuesta
Binding incompleto
Listo para revisión
Historial guardado
```

No afirmar conectado, enviado, persistido, conciliado o habilitado sin confirmación real.

## 5. Aseguradoras — conocimiento documental acumulado

### Jerarquía visual

```txt
Aseguradora
→ Fuentes/documentos
→ Manifiestos
→ Propuestas
→ Reglas tarifarias
→ Presentaciones
→ Reconciliaciones
→ Bindings
→ Revisiones
→ Historial de lote
```

### Fuentes

La ficha debe mostrar documentos asociados por:

- país/moneda;
- ramo/producto;
- variante/vehículo/plan;
- versión;
- estado;
- evidencia;
- última revisión.

No mostrar rutas locales, enlaces temporales, tokens o hashes técnicos innecesarios.

### Catálogo A&S

El backend tiene once fuentes en seis aseguradoras, pero el prototipo debe ser genérico y recibirlas por configuración.

A&S:

- Seguros BAM: Vehículos y Salud.
- Bantrab: Autos y Motos.
- Seguros Columna: Vehículos.
- Aseguradora Guatemalteca: tarifario, PDF automóvil, PDF microbús.
- Aseguradora Rural (Banrural): Autos y Gastos Médicos.
- Seguros Universales: PDF Riesgo Plus.

Alias:

- Banrural y Aseguradora Rural son la misma aseguradora.
- Columna corresponde a Seguros Columna.

## 6. Formularios y operación documental

### Formulario administrativo

Debe permitir:

1. elegir `Dry-run` o `Reanudar pendientes`;
2. seleccionar documentos mediante checkboxes;
3. ingresar motivo;
4. generar preview;
5. ver disponibilidad de referencias;
6. ver fingerprint;
7. escribir confirmación reforzada;
8. ejecutar sin persistir conocimiento;
9. revisar resumen;
10. guardar historial por separado.

Nunca pedir:

- IDs manuales;
- rutas;
- enlaces técnicos;
- referencias backend;
- credenciales.

### Confirmaciones

```txt
EJECUTAR DRY-RUN
REANUDAR DRY-RUN
GUARDAR HISTORIAL
```

La persistencia de historial debe exigir doble confirmación.

### Roles

- Dirección/Admin/AdminTenant/SuperAdmin: preview, ejecución e historial.
- Operativo: preview, dry-run y reanudación; no persiste historial global.
- Asesor: bloqueado para operación global.
- La autorización depende del rol activo, no solo de roles asignados.

## 7. Referencias documentales

Patrón reusable:

```txt
archivo autorizado
→ referencia opaca
→ disponibilidad para UI
→ resolución interna backend
→ inspector
```

La UI solo conoce:

```txt
Disponible
Pendiente
No encontrado
Vencido
Requiere validación
```

No conoce la ruta real.

El ticket de ejecución es temporal, ligado a actor/tenant/lote/documentos y de un solo uso después de ejecutar.

## 8. Manifiestos Excel/PDF

### Excel

Mostrar:

- hojas;
- rangos/evidencia;
- fórmulas cacheadas;
- áreas de impresión;
- hechos numéricos;
- reglas propuestas;
- advertencias por referencias externas o errores;
- PII redactada;
- estado de revisión.

### PDF

Mostrar:

- páginas;
- bloques/secciones;
- bounding boxes cuando se abra el visor;
- tablas/imágenes;
- páginas vacías/sparse;
- propuesta de aseguradora/producto;
- PII redactada;
- diferencias entre variantes.

OCR solo debe aparecer como fallback cuando realmente se necesitó, no como promesa automática.

## 9. Reglas, presentación y binding

Separar visualmente:

```txt
Tarifa/regla
Presentación/documento
Reconciliación
Binding
Habilitación
```

Nunca equiparar documento procesado con producto habilitado.

Estados:

```txt
Tarifa solamente
Presentación solamente
Completo, requiere gate
Conflicto, requiere validación
Conocimiento incompleto
Listo para revisión de binding
```

Automóvil y microbús son variantes independientes. Una regla de automóvil no se hereda a microbús.

Universales Riesgo Plus tiene presentación, pero no tarifa validada; debe mostrarse incompleto.

## 10. AseGuate — configuración tenant, no hardcode reusable

La UX debe poder representar perfiles financieros configurables:

```txt
Gasto de emisión: 5% sobre prima neta
IVA GT: 12% sobre subtotal gravable previo al impuesto
```

Estos valores pertenecen a configuración A&S y no al núcleo reusable.

Mostrar componentes separados:

- prima neta;
- asistencia;
- gastos;
- impuestos;
- prima total.

No crear factores ocultos para forzar coincidencias.

## 11. Lote e historial

### Resumen

Mostrar:

- total de fuentes;
- aseguradoras;
- Excel/PDF;
- listas para dry-run;
- sin referencia;
- fallidas;
- persistidas;
- bindings listos/incompletos.

### Historial

Mostrar:

- runs;
- ítems por documento;
- intentos;
- último código/estado;
- diff respecto al run anterior;
- documentos reanudables.

No guardar ni mostrar referencias, rutas o payloads.

## 12. Cotizador y Comparativo

- Permanecen deshabilitados mientras no exista segundo gate.
- Cotizador automático exige tarifa, presentación, evidencia, país/moneda y reconciliación.
- PDF externo/Comparativo puede avanzar con presentación validada, sin afirmar cálculo automático.
- `comparativo_final_v110.html` debe conservarse como fuente avanzada aislada y configurable.
- No reemplazarlo por un cotizador genérico inferior.

## 13. Multirol y alcance

La UI debe reflejar:

- roles asignados;
- rol activo;
- rol predeterminado;
- selector de vista;
- módulos visibles por rol;
- extras y restringidos;
- scope de datos separado.

Cambiar permisos globales requiere motivo, antes/después y confirmación reforzada cuando abre acceso a todos.

## 14. Academia acumulada

Crear/actualizar rutas por rol para:

- Dirección/AdminTenant;
- Operativo;
- Asesor;
- usuario nuevo.

Lecciones nuevas o actualizadas:

1. Aseguradoras como fuente de conocimiento.
2. Archivo vs referencia vs manifiesto.
3. Dry-run documental.
4. Reanudar pendientes.
5. Regla vs presentación vs binding.
6. Segundo gate.
7. País, moneda e impuestos.
8. Seguridad de rutas y credenciales.
9. Historial y auditoría.
10. Por qué procesar un documento no habilita Cotizador.

Cada lección debe incluir caso práctico, errores frecuentes, rol autorizado, impacto en otros módulos y evidencia de aprendizaje.

## 15. Hotfixes y protecciones que Claude no puede revertir

Claude no debe sobrescribir:

```txt
data/store.js
data/store-firestore-lab.local.js
core/backend-lab-*
core/auth.js
core/importa.js
firestore.rules
tools/orbit360-*
```

Conservar:

- estados honestos de integraciones;
- no persistir contraseñas;
- `credentialRef/backend_required`;
- banco no aplica cobros automáticamente;
- movimientos financieros no crean clientes/pólizas/cartera;
- solo Vigente/Por renovar genera cartera;
- prima neta recaudada para producción/metas/comisiones;
- separación de países y monedas;
- asesor solo ve sus clientes y relacionados.

## 16. Documentos acumulados que forman parte del paquete

Incluir al preparar la entrega final para Claude, como fuentes o síntesis:

```txt
ADDENDUM-MAESTRO-PATRONES-REUTILIZABLES-CLAUDE-BACKEND-ORBIT360-20260707.md
ADENDUM-ACADEMIA-PROFUNDA-INTERACTIVA-ORBIT360-AYS-20260704.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P06-COTIZADORES-REALES-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P07-PDF-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09F-RUNTIME-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09G-LOTE-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09H-HISTORIAL-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09I-ACCIONES-ADMIN-20260710.md
ADDENDUM-CONTROL-MAESTRO-CLAUDE-ACADEMIA-P09J-FORMULARIO-20260710.md
IMPLEMENTACION-P09K-CAPACIDAD-BACKEND-REFERENCIAS-DOCUMENTALES-20260710.md
```

Agregar todo documento posterior P0.9l+ antes de entregar.

## 17. Criterios de auditoría de la futura candidata

La futura candidata deberá compararse contra:

1. última candidata aceptada;
2. hotfixes y baseline del repo;
3. este paquete acumulado;
4. contratos backend vigentes;
5. Academia;
6. seguridad y multi-tenant.

Auditar:

- archivos reales;
- rutas;
- módulos;
- textos técnicos visibles;
- hardcode A&S;
- país/moneda;
- PWA;
- persistencia;
- regresiones;
- smoke visual.

## 18. Estado de entrega a Claude

```txt
Paquete acumulado: activo y creciendo
Última candidata base: fijada
Solicitud a Claude: todavía no
Motivo: falta bridge/runtime real y validación visual
Próxima revisión de necesidad: después de P0.9l y primer dry-run visual real
```
