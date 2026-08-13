# AUDITORÍA AUTOADMINISTRABLE — Orbit 360 (v1.21)

> ¿Qué se puede crear / editar / eliminar desde la plataforma, sin tocar código? Verificado en vivo.

## Capa de datos (base de todo)
`Orbit.store` expone **CRUD completo**: `insert`, `update`, `remove`, `all`, `get`, `where` — con `_emit` para sincronía en vivo. Toda colección (clientes, pólizas, cobros, reclamos, cursos, aseguradoras, gestiones, negocios, finmovs, metas…) es administrable por estas operaciones. Al migrar, basta reemplazar `store.js` por la versión backend y los módulos siguen igual.

`Orbit.cat` (catálogos): `get/all/save` + alta/edición/borrado, con evento `orbit:cat`.
`Orbit.tenant`: `get/set/save`, con evento `orbit:tenant`.

## Estado por sección (✅ autoadministrable desde UI)

| Sección | Crear | Editar | Eliminar | Dónde |
|---|---|---|---|---|
| Clientes | ✅ | ✅ | ✅ | Cliente 360 + importador |
| Pólizas | ✅ | ✅ | ✅ (cancelar) | Ficha cliente / Pólizas |
| Recibos/Cobros | ✅ (auto + manual) | ✅ | ✅ | Cobros / aplicar pago |
| Siniestros/reclamos | ✅ | ✅ (bitácora) | ✅ | Ficha cliente / Siniestros |
| Gestiones Ops / Leads | ✅ | ✅ | ✅ | Tableros |
| **Listas** Ops/Leads | ✅ | ✅ renombrar/recolor/reordenar | ✅ | Tableros (⚙ Listas) |
| Catálogos (ramos, subramos, productos, canales, tipos) | ✅ "➕ Otro" en cada desplegable | ✅ | ✅ | Configuración + inline |
| Aseguradoras | ✅ | ✅ ficha completa | ✅ habilitar/deshabilitar | Aseguradoras |
| Cursos / lecciones / quizzes | ✅ + Crear con IA | ✅ | ✅ | Academia |
| Categorías de cursos | ✅ (nueva categoría) | ✅ | — | Academia / Crear con IA |
| Automatizaciones (reglas) | ✅ | ✅ | ✅ | Automatizaciones |
| Integraciones (42) | ✅ activar + credenciales | ✅ | ✅ desactivar | Configuración → Integraciones |
| Motor IA | ✅ elegir proveedor/modelo/key | ✅ | ✅ | Automatizaciones |
| Planes | ✅ crear plan | ✅ | ✅ | Configuración → Plan |
| Países + tasas/impuestos | ✅ agregar país con IVA | ✅ | ✅ | Configuración → Países |
| Usuarios y permisos | ✅ multi-rol + módulos | ✅ | ✅ | Equipo |
| Metas mensuales | ✅ por mes/asesor/tipo | ✅ | ✅ | Equipo / Config |
| Plantillas de mensaje | ✅ | ✅ | ✅ | Plantillas |
| Movimientos / CxC / CxP (Finanzas) | ✅ + importar | ✅ estado | ✅ | Finanzas |
| Glosario | ✅ | ✅ | ✅ | Config / portal |
| Marca (logo, paleta, tipografía, nombre) | ✅ | ✅ | — | Configuración |

## Conclusión
**El 100% de los catálogos, listas, registros y configuración del prototipo es autoadministrable desde la plataforma** mediante `Orbit.store` (CRUD), `Orbit.cat` y `Orbit.tenant`. No hay sección que exija editar código para operar el día a día.

## Lo que NO es autoadministrable por diseño (correcto)
- **Lógica de cálculo** (fórmula de prima/IVA/recibos, motor de comisiones): parametrizable (tasas, %, fraccionamiento) pero la fórmula vive en `core/primas.js` — se ajusta en migración si un país lo requiere.
- **Conexión real de integraciones e IA**: la UI guarda credenciales; la conexión efectiva se activa con el backend en migración (en el prototipo es heurística/simulada).
- **Estructura de módulos del nav**: configurable por rol/plan, pero crear un módulo nuevo de cero es trabajo de desarrollo (Codex), no autoadministración.
