# Ledger acumulativo Claude — baseline reusable / no regresión

Fecha: 2026-07-31  
Proyecto: Orbit 360  
Objetivo: que ninguna futura candidata Claude revierta patrones ya aprobados aunque un fix haya sido entregado en otra sesión o documento.

## Regla de uso

Este ledger es **acumulativo**, no una lista de novedades. Toda candidata Claude futura debe auditarse contra estas reglas y conservarlas. Si una regla ya fue enviada antes, se vuelve a incluir como constraint de no regresión cuando el módulo tocado pueda afectarla.

Nunca enviar a Claude:
- datos reales;
- hashes/manifiestos de fuentes A&S;
- secretos/credenciales;
- adaptadores Firestore LAB/productivo;
- `data/store.js` y owners de store protegidos;
- `core/backend-lab-*`;
- `core/auth.js` salvo bloque explícitamente autorizado;
- `core/importa.js`;
- `firestore.rules`;
- herramientas protegidas de escritura/migración.

## Baseline reusable obligatorio

### Shell / white-label
- Chrome Orbit 360 estable.
- Marca del tenant solo en slot white-label/configuración.
- Cero hardcode A&S en módulos genéricos.
- Cero copy técnico en UI cliente.
- Fondo oscuro → texto blanco.
- Manrope / Source Sans 3 / JetBrains Mono según rol tipográfico vigente.

### Responsive
`REPLICABLE_CLAUDE_ACUMULADO`

- Desktop, tablet y móvil son contratos de primera clase.
- Títulos no se desbordan al reducir ventana.
- KPIs y tabs se reorganizan sin solapamiento.
- Tablas anchas usan scroll controlado sin perder acciones.
- Menú móvil funcional.
- Ninguna candidata puede declarar terminado un módulo desktop-only.

### Cliente 360
`REPLICABLE_CLAUDE_ACUMULADO`

- Lista y ficha usan el mismo read-model canónico.
- Conteos de Pólizas/Cartera deben coincidir lista ↔ ficha.
- No usar parche visual para convertir un dato incorrecto en estado aparentemente honesto.
- Relaciones vacías se muestran honestamente.
- Ficha integral con tabs operativas.
- `NaN`, `undefined` o ceros inventados: prohibidos.
- Resumen por cliente debe ser indexado/memoizado; evitar recorridos completos por cada fila.
- Cambio de snapshots/store invalida índices de forma controlada, no mediante repintados indiscriminados.

### Pólizas
`REPLICABLE_CLAUDE_ACUMULADO`

- **Ficha completa en pantalla completa; nunca drawer/modal como sustituto.**
- Navegación conserva contexto de Cliente 360.
- Lista presenta información suficiente para identificar y gestionar la póliza.
- Ficha muestra todo dato útil disponible del contrato: identificación, vigencias, aseguradora, ramo/subramo/producto, asesor, estado, primas, forma/conducto/frecuencia, riesgo/bien, documentos, recibos, vehículo y relaciones.
- Prima debe usar aliases canónicos `primaTotal`/`primaNeta`; no depender de un campo legacy `prima`.
- Ausencia de dato → copy honesto, no `undefined`/`NaN`.
- Estado histórico no genera comportamiento de cartera activa.

Referencia reusable sanitizada: `CONTRATO-VISUAL-FUNCIONAL-SIGA-CRM-ORBIT360-20260731.md`.

### Vehículos
`REPLICABLE_CLAUDE_ACUMULADO`

- Tarjeta frontal con identificación suficiente: marca, línea/tipo, modelo/año, placa, póliza y estado.
- Acción explícita `Ver detalle completo`.
- Ficha full-page con placa, año, marca, línea, chasis/VIN, motor, uso, color, inciso, concepto, descripción/comentarios y campos de riesgo/plan disponibles.
- Consumir aliases canónicos (`placaNormalizada`, `anioModelo`, `chasisFuente`, `motorFuente`, etc.) sin exigir nombres legacy.
- Relación con Póliza/Cliente/Aseguradora visible y consistente.

### Recibos / Cartera
`REPLICABLE_CLAUDE_ACUMULADO`

- Mantener calendario activo separado de histórica exigible.
- `pago_reportado` sigue pendiente de conciliación; nunca convertirlo visualmente en cobro aplicado.
- Cobros aplicados son otra fuente/colección.
- Filtro por póliza.
- Estados comprensibles: futuro, por vencer, vencido, pago reportado por conciliar, requiere validación cuando aplique.
- Vista operativa completa; no modal bloqueante.
- Recibos deben mostrar desglose disponible y relación con póliza/riesgo.

### Navegación de fichas complejas
`REPLICABLE_CLAUDE_INMEDIATO`

Patrón transversal para Póliza, Vehículo, Aseguradora, Cliente y futuros objetos complejos:
- ruta propia/ficha full-page;
- breadcrumb/back preserva contexto;
- no recrear drawer/modal al empalmar candidata;
- deep-link estable cuando aplique;
- permisos antes de render;
- estado vacío y error separados.

### Rendimiento frontend
`REPLICABLE_CLAUDE_INMEDIATO`

- Prohibido patrón O(clientes × colecciones completas) en cada render de lista.
- Indexar relaciones por `clienteId`, `polizaId`, etc.
- Memoizar resumen hasta evento de invalidación.
- Evitar observers/polling que disparen ciclos de render.
- Un click/cambio de tab/rol no puede congelar la página.
- Toda candidata que toque Cliente 360/Pólizas/Vehículos debe incluir prueba sintética de rendimiento estructural.

### Multirol / scopes
`REPLICABLE_CLAUDE_ACUMULADO`

- Varios roles, activo/default.
- Visibilidad = base + extras - restringidos.
- Scope propios/equipo/todos/ninguno.
- Asesor solo ve relaciones de sus clientes.
- Cambio de rol no pierde ruta ni produce pantalla vacía.
- Apertura a `todos` requiere motivo/confirmación reforzada donde aplique.

### Legal / navegación
`REPLICABLE_CLAUDE_ACUMULADO`

- Acuerdo legal se resuelve una vez y no debe cubrir el primer click operativo después de autenticación.
- Router/menu/bootstrap se mantienen separados por owner.
- Cambiar rol reconstruye shell sin desalinear hash/ruta.

### Aseguradoras
`REPLICABLE_CLAUDE_ACUMULADO`

- Directorio + ficha + conocimiento.
- Contactos/portales/cuentas bancarias útiles con copy/copy-action cuando corresponda.
- CredentialRef nunca se expone como secreto en UI.
- Integración activa solo si existe conexión real.
- Orden/gates definidos por consumidor.

### Importadores / datos
`REPLICABLE_CLAUDE_ACUMULADO` solo para arquitectura/UX genérica. Backend real protegido.

- detectar encabezados/sinónimos;
- proponer mapping corregible;
- normalizar/deduplicar;
- calidad;
- dry-run crear/actualizar/omitir/requiere validación;
- trazabilidad;
- diff;
- confirmación;
- rollback;
- manifestar fuentes por corte;
- no mezclar dominios (Cobros ≠ cartera ≠ finmovs).

No enviar a Claude archivos reales, hashes ni identidad A&S.

## Nuevos guards derivados de la revisión 2026-07-31

### Guard 1 — Full-page no puede regresar a modal
Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Gate estático debe detectar si una candidata reemplaza rutas full-page de Póliza/Vehículo por drawer/modal.

### Guard 2 — contrato de alias canónico
Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Renderer consume contrato canónico y aliases explícitos; nunca acoplar visualización a nombres históricos únicos.

### Guard 3 — consistencia lista/ficha
Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Una muestra sintética debe probar que `clienteResumen` y ficha usan las mismas relaciones y montos.

### Guard 4 — cero NaN/undefined
Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Gate de UI falla si el HTML visible contiene `NaN`, `undefined`, `null` técnico o placeholder técnico.

### Guard 5 — rendimiento
Clasificación: `REPLICABLE_CLAUDE_INMEDIATO`.

Cliente 360 no debe recalcular `store.all(...)` por colección por cada cliente. Usar índices compartidos.

### Guard 6 — responsive acumulado
Clasificación: `REPLICABLE_CLAUDE_ACUMULADO`.

Revisión desktop/tablet/móvil en toda candidata que toque shell, encabezados, KPIs, tabs o tablas.

### Guard 7 — fuente manifestada
Clasificación para Claude: arquitectura genérica del importador sí; implementación A&S `BACKEND_PROTEGIDO_NO_CLAUDE`.

Una fuente solo entra al pipeline si su identidad está en el manifiesto activo. Duplicado exacto por hash = no reprocesar. Manifiesto abierto = escritura bloqueada.

## Gate previo a empalme de futura candidata Claude

Antes de integrar una candidata:

1. auditar contra baseline vivo + este ledger;
2. identificar archivos protegidos y rechazarlos del empalme;
3. comprobar que no elimina ruta full-page;
4. comprobar que no reinstala modal/drawer para ficha compleja;
5. comprobar responsive;
6. comprobar cero `NaN/undefined`;
7. comprobar contratos canónicos/aliases;
8. comprobar multirol;
9. comprobar que no introduce datos reales/hardcode tenant;
10. empalme selectivo, nunca reemplazo total.

## Estado de sincronización

Este ledger queda como **fuente de constraints para todos los futuros paquetes Claude**. No se considera agotado después de un envío: únicamente se marcan implementaciones/versiones sincronizadas, pero los guards permanecen activos para prevenir reversión.
