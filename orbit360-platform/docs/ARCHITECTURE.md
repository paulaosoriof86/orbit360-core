# Arquitectura

## Principio rector

El problema del HTML operativo actual de T&A **no es el código, es la arquitectura**: un único archivo de ~18.000 líneas con decenas de parches incrementales (`FIX-…`, `V58630…`) donde cada corrección arriesga romper otra cosa. Esta base resuelve eso con **separación por responsabilidades** y **un archivo por módulo**, de modo que cada pieza se arregla y prueba de forma aislada.

```
config  →  data  →  store  →  ui  →  router  →  modules
(qué es)  (datos)  (sesión)  (DOM)  (navega)  (pantallas)
```

## Capas

| Capa | Archivo | Responsabilidad |
|---|---|---|
| **Configuración** | `core/config.js` | Marca/white-label, catálogo de 22 módulos, navegación por rol, roles, llaves Firebase. **Única fuente de verdad de "qué existe".** |
| **Datos** | `core/data.js` | Modelo y datos mock. Expone `CX.data` con getters que **derivan del proyecto activo** (KPIs, visitas, postulaciones). Aquí se enchufa el backend real. |
| **Estado** | `core/store.js` | `CX.session` (rol, usuario, vista) + `CX.bus` (event bus pub/sub) + persistencia en `localStorage`. |
| **UI** | `core/ui.js` | Helpers reutilizables: `ph`, `kpi`, `bar`, `bdg`, `aiBox`, `toast`, `modal`, `el`. Mantiene los módulos cortos y consistentes. |
| **Router** | `core/router.js` | Construye el rail, el menú según rol, conmuta vistas, actualiza el breadcrumb y monta el módulo activo. |
| **Módulos** | `modules/*.js` | Cada módulo se registra con `CX.module('id', ctx => html)` y se monta en `#view`. Independientes entre sí. |

## Contrato de un módulo

```js
CX.module('dashboard', ({ data, role, ui }) => {
  // devuelve un string HTML  ó  un Node (para eventos/estado propio)
  return `${ui.ph('Dashboard', '…')} …`;
});
```

- Recibe `{ data, role, ui }`.
- Devuelve **string** (HTML simple) o **Node** (cuando necesita lógica interna, p. ej. el chat de Soporte IA).
- Para enlazar eventos tras render: `setTimeout(()=>{…},0)` o construir un `Node` y enlazar antes de devolverlo.
- Si un módulo no está registrado, el router muestra `ui.scaffold(id)` automáticamente — por eso la navegación **nunca se rompe** aunque falte una pieza.

## Multi-proyecto / IA-adaptable

`CX.data.currentProjectId` define el proyecto activo. Todos los getters (`visitas()`, `posts()`, `kpis()`, `shoppersFor()`) filtran y **re-derivan** de ese proyecto. Al cambiarlo:

```
select proyecto → CX.data.setProject(id) → CX.bus.emit('project')
   → router reconstruye rail + re-renderiza la vista actual
```

Resultado: el dashboard, los KPIs, las reglas y los cuestionarios se reconfiguran solos para el nuevo cliente. Ese es el "núcleo inteligente" que diferencia al producto.

## Roles y navegación

`CX.NAV.admin` y `CX.NAV.shopper` definen secciones y orden. Cada módulo declara `roles:['admin','shopper']`. El router solo muestra y permite navegar a lo que el rol tiene permitido — base para el modelo de permisos (`docs/SECURITY.md`).

## Backend opcional (sin acoplar)

La UI **no conoce Firebase**. Hoy lee de `CX.data` (mock). Para producción se implementa un *adapter* que mantiene la misma forma de `CX.data` pero leyendo/escribiendo en Firebase RTDB/Firestore, escuchando cambios y emitiendo `CX.bus.emit(...)`. Los módulos no cambian.

```
[ módulos ]  →  CX.data (interfaz estable)  →  ┌ mock (hoy)
                                               └ Firebase adapter (producción)
```

## Por qué HTML/JS plano

- Converge con el stack actual de T&A (sin reescritura conceptual).
- Cero build, cero dependencias, despliegue en cualquier hosting estático (Firebase Hosting, Netlify, Pages).
- Mantenible por el equipo sin cadena de herramientas. Cuando el producto lo exija, la modularidad permite migrar módulos a un framework sin reescribir todo.

## Camino de migración de T&A

1. Estabilizar este core (oleadas de profundización por módulo).
2. Implementar el *adapter* Firebase + Auth real + reglas por tenant.
3. Cargar la operación de T&A como **proyecto/tenant #1** (datos, países, reglas).
4. Apagar progresivamente el monolito de 18k líneas.
