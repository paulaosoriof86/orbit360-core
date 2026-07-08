# Plan de agilización sin exponer a inestabilidad — Orbit 360 A&S v1330

Fecha: 2026-07-07
Rama: `ays/backend-tenant-lab-v99-20260703`
PR: #5 draft/open

## Objetivo

Acelerar la implementación de Orbit 360 A&S sin abrir nuevos riesgos de regresión, pérdida de trazabilidad, mezcla de fuentes, ruptura de backend LAB o carga insegura de datos reales.

## Diagnóstico

El proyecto se ha alargado porque se están cerrando al mismo tiempo:

- prototipo UX;
- backend LAB protegido;
- tenant A&S;
- importadores;
- migración real;
- reglas comerciales;
- integraciones;
- Academia;
- documentación para continuidad;
- pendientes Claude.

La forma segura de acelerar no es aumentar el tamaño de los cambios, sino reducir el tamaño de cada unidad de riesgo.

## Principio operativo

Trabajar en carriles paralelos, pero con gates de salida estrictos.

```txt
Más bloques pequeños cerrables.
Menos reemplazos grandes.
Cero cambios sin verificación.
Cero cargas reales sin dry-run.
```

## Carriles de trabajo

### Carril A — Hotfixes funcionales pequeños

Objetivo: cerrar riesgos operativos concretos en módulos específicos.

Ejemplos ya aplicados:

- Cobros lote: preparar recordatorios, no afirmar envío.
- Aseguradoras: bloquear borrado con vínculos.
- Siniestros: motivo obligatorio en estados finales.
- Cancelaciones: evitar duplicados de recuperación.

Regla:

- Solo tocar un módulo por bloque.
- Reemplazo completo solo si el archivo cabe y se valida sintaxis temporalmente.
- Si el conector bloquea, documentar y no insistir.

### Carril B — Validación / smoke local

Objetivo: convertir cambios aplicados en cambios confiables.

Debe validar:

- `node --check` de módulos tocados.
- Validador backend LAB.
- Revisión de backend protegido.
- Smoke visual/manual en localhost cuando sea posible.

Este carril requiere entorno local controlado o Codex.

### Carril C — Migración por fuentes separadas

Objetivo: preparar datos reales sin escribir a ciegas.

Orden por riesgo:

1. Calendario de contenidos.
2. Directorios de aseguradoras.
3. Financiero histórico.
4. Estados de cuenta de aseguradoras/clientes.
5. Planillas de comisión.
6. Estado bancario.
7. Conciliación final.

Regla:

- Primero dry-run.
- Después reporte.
- Después diff.
- Después confirmación.
- Escritura solo en LAB y por fuente.

### Carril D — Documentación acumulada

Objetivo: no perder metodología ni contexto.

Debe documentar:

- qué se hizo;
- qué quedó pendiente;
- qué se bloqueó;
- impacto Claude/prototipo;
- impacto Academia;
- impacto migración;
- estado real del PR.

### Carril E — Claude/UX/Academia

Claude no entra todavía como carril principal.

Debe entrar cuando:

- base funcional esté estable;
- se necesite UX visual;
- se prepare Academia interactiva;
- se reciba un nuevo candidato ZIP;
- se prepare demo comercializable.

No debe tocar backend protegido, parsers reales, reglas, store ni Auth.

## Qué acelera sin riesgo

### 1. Congelar el alcance del mínimo operativo

No intentar completar todo el SaaS antes de migrar.

Mínimo operativo seguro:

- Cobros honestos.
- Aseguradoras seguras.
- Siniestros con gates.
- Cancelaciones sin duplicados.
- Importador con fuentes separadas.
- Validación local.

Equipo y Configuración siguen siendo importantes, pero si el conector los bloquea, pasan a Codex/local controlado.

### 2. Usar matriz de riesgo por fuente

No empezar migración por cobros ni banco.

Orden recomendado:

- bajo riesgo: calendario marketing;
- medio bajo: directorio aseguradoras;
- medio: financiero histórico;
- alto: cobros/planillas/banco.

### 3. No insistir con archivos bloqueados por el conector

`equipo.js` y `configuracion.js` requieren aplicación por Codex o entorno local seguro.

Intentar forzar reemplazos grandes desde el conector aumenta riesgo y consume tiempo.

### 4. Crear una lista corta de “bloquea uso real”

Bloquea uso real:

- validación local pendiente;
- Equipo gates;
- Configuración gates;
- importación real no ensayada;
- smoke local no ejecutado.

No bloquea seguir documentando/ensayando:

- UX final;
- Academia avanzada;
- integraciones reales;
- demo comercial;
- rediseño visual.

### 5. Separar prototipo de productivo

Mientras no haya validación local y backend real completo:

- no deploy;
- no main;
- no producción;
- no carga real productiva;
- no afirmar integraciones activas;
- no afirmar envíos reales.

## Ruta acelerada recomendada

### Sprint corto 1 — Cierre técnico mínimo

1. Validar localmente módulos ya tocados.
2. Cerrar Equipo con Codex/local, no con conector si bloquea.
3. Cerrar Configuración con Codex/local, no con conector si bloquea.
4. Verificar backend protegido.
5. Documentar smoke.

### Sprint corto 2 — Migración segura inicial

1. Smoke calendario marketing.
2. Smoke directorios aseguradoras GT/CO.
3. Smoke financiero histórico GT/CO.
4. Generar reportes dry-run.
5. No aplicar cobros/banco todavía.

### Sprint corto 3 — Conciliación sensible

1. Planillas comisión junio/julio.
2. Estados cuenta clientes/aseguradoras.
3. Estado bancario.
4. Propuestas conciliación.
5. Aplicación final solo con gate.

## Regla de decisión por bloque

Cada bloque se clasifica así:

```txt
A. Se puede aplicar desde GitHub/conector.
B. Se documenta y espera Codex/local.
C. Se prueba en dry-run sin escribir.
D. Se manda a Claude solo para UX/Academia.
```

Si un bloque cae en B, no se sigue insistiendo por el mismo canal.

## Qué debe hacer Paula para agilizar

La carga manual debe mantenerse mínima.

Lo más útil de Paula es decidir prioridad cuando haya dos caminos:

- cerrar gates Equipo/Configuración con Codex/local; o
- avanzar ensayo de importación de fuentes de bajo riesgo.

No debe pegar PowerShell largo ni seleccionar bloques manuales salvo que sea inevitable.

## Recomendación de orden inmediato

1. Terminar documentación M3 Directorios aseguradoras.
2. Preparar check local único para validar módulos tocados.
3. Cuando Codex esté disponible, pasarle bloque cerrado Equipo/Configuración.
4. Ejecutar smoke de importador con calendario.
5. Luego directorios de aseguradoras.

## Estado actual resumido

Cerrado funcionalmente:

- Cobros lote.
- Aseguradoras borrar/desactivar.
- Siniestros estados finales.
- Cancelaciones anti-duplicado.

Documentado/preparado:

- Importador por fuentes separadas.
- Ensayo M2 calendario.
- Criterios Claude.
- Matrices RBAC/gates.

Pendiente por canal seguro:

- Equipo gates.
- Configuración gates.
- Validación local/smoke.
- Carga real controlada.

## Estado

Documento creado.
No se tocó código funcional.
No se tocó backend protegido.
No se tocó `index.html`.
No merge.
No deploy.
No datos reales.
No secretos.
