# AUDITORÍA FORENSE — Orbit 360 (v1.21)

> Recorrido en vivo de los 28 módulos (eval_js sobre el render real, captura de `window.onerror`).
> Fecha de corrida: sesión v1.21. Caché forzada con `?v1194`.

## Resultado global
- **28/28 módulos renderizan sin error JS** (window.onerror limpio en toda la corrida).
- Todos producen contenido real (>40 chars) y controles interactivos.
- No se detectó ninguna pantalla en blanco ni crash de parser.

## Hallazgo por módulo (contenido renderizado · botones)

| Módulo | Estado | Contenido | Botones | Nota |
|---|---|---|---|---|
| inicio | ✅ | 3484 | 5 | Saludo, metas, KPIs clicables, avance por asesor, prioridades |
| cronograma | ✅ | 1500 | 7 | Vista día/semana/mes + tareas |
| ops | ✅ | 3206 | 8 | Board compuesto, listas con emoji/color |
| leads | ✅ | 4228 | 7 | Pipeline asesor + KPIs |
| aseguradoras | ✅ | 1880 | 5 | Directorio GT/CO, fichas editables |
| cotizador | ✅ | 1707 | 5 | Wizard tipo→cliente→cotizaciones |
| comparativo | ✅ | 950 | 3 | Carga de propuestas multi-aseguradora |
| cliente360 | ✅ | 6030 | 3 | Lista + ficha con tabs (pólizas/recibos/siniestros/correos) |
| polizas | ✅ | 12753 | 2 | Listado profundo + detalle |
| cobros | ✅ | 34171 | 2 | Cartera completa + aplicar pago + conciliación |
| renovaciones | ✅ | 3906 | 5 | Cola por vencimiento + analítica |
| cancelaciones | ✅ | 2752 | 1 | Detalle + acción de recuperación → ficha/Ops |
| siniestros | ✅ | 2581 | 5 | Reclamos + bitácora |
| historial | ✅ | 51368 | 4 | Timeline de interacciones |
| comisiones | ✅ | 1112 | 2 | Listado + detalle |
| finanzas | ✅ | 4411 | 8 | Movimientos, liquidaciones, conciliación, CxC/CxP, análisis IA |
| marketing | ✅ | 3759 | 39 | Calendario con ficha por día, IA, estados/reprogramación |
| academia | ✅ | 2588 | 24 | Cursos, visor a pantalla completa, Manuales in-app, Crear con IA |
| insights | ✅ | 2023 | 9 | KPIs clicables, comparativos, top clientes, análisis crítico |
| portal | ✅ | 909 | 15 | Vista cliente: pólizas/pagos/docs/aprende clicables |
| ia | ✅ | 823 | 10 | Asistente 3 contextos |
| notificaciones | ✅ | 1190 | 3 | Bandeja WA + plantillas |
| automatizaciones | ✅ | 6107 | 16 | Reglas editables + IA multi-proveedor + Comparar modelos |
| equipo | ✅ | 1098 | 1 | Usuarios multi-rol + módulos por usuario |
| configuracion | ✅ | 7022 | 91 | Catálogos, países+tasas, 42 integraciones, planes, marca |
| reportes | ✅ | 3951 | 10 | Exportar CSV/Excel/PDF |
| calidad | ✅ | 2329 | 5 | Edición inline de datos faltantes |
| plantillas | ✅ | 2037 | 22 | Plantillas de mensajes |

## Funciones críticas verificadas en sesiones recientes (con recarga real)
- **KPIs con detalle (modal):** inicio, ficha cliente, pólizas, cobros → desglose de registros, filas clicables. ✅
- **Importador inteligente:** lee CSV/TSV/TXT/Excel/PDF/imagen, mapea por encabezado difuso, crea/actualiza en colecciones reales. Conciliación aplica pagos. Botón Iterar = re-mapeo manual. ✅
- **Pólizas:** recibos según cuotas (suma exacta), cambiar asesor, cambiar forma de pago regenera pendientes. ✅
- **Cancelaciones → ficha cliente + gestión Ops.** ✅
- **Comparativo multi-aseguradora** persistente. ✅
- **Finanzas CxC/CxP autoadministrables** (estado refleja en ingresos/egresos). ✅
- **Equipo multi-rol** + override de módulos por usuario (canSee respeta restricción). ✅
- **IA multi-proveedor** sin sesgo + Comparar modelos. ✅
- **Manuales in-app** (iframe, sin descarga). ✅
- **Logo white-label** ancho flexible, sin caption. ✅

## Recomendación de mantenimiento
- **Caché:** los `<script>` y `<link>` están versionados con `?v=`. Al actualizar el ZIP, subir el número (un solo find/replace) fuerza recarga limpia y evita servir .js/.css viejos.
- La precisión de extracción IA depende del proveedor conectado (ver doc de migración).
