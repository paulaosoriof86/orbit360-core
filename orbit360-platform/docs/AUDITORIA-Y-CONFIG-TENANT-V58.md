# CXOrbia — Auditoría funcional + Config de tenant (V58)

Fecha: 2026-07-01

## 1. Resultado de la auditoría funcional en vivo

Auditoría ejecutada sobre el prototipo (render real de cada módulo por rol, no revisión visual):

- **48 renders de módulo** sin errores ni vacíos: 30 admin + 11 shopper + 7 cliente.
- **0 handlers muertos**, 0 onclick a funciones inexistentes.
- **9/9 stores clave presentes y funcionales:** crmStore, propStore, finStore, manualesData, acadData, docStore, ai.ask, automations.logAction (auditoría), confidencialidad.version (NDA versionado).
- Carga sin errores de consola en admin, shopper y cliente.

Conclusión: la plataforma es funcional, autoadministrable y sin botones muertos. Todo el backlog del prototipo (1–213) está cerrado y verificado.

## 2. Los 5 pendientes V58 restantes = configuración de TENANT (no código genérico)

Los ítems P0.1, P0.7, P0.8, P3 y la verificación de filtros NO se resuelven cambiando el código genérico del prototipo, porque contradiría el principio "genérico y comercializable". Se resuelven en la **configuración del tenant TyA** y su carga de datos por el importador. Detalle para backend:

### 2.1 (P0.1) TyA no debe mostrar demos de otros clientes
- El prototipo ships con Cinépolis + Banca + Restaurantes **a propósito** (demostrar multi-cliente).
- En el tenant TyA de producción: cargar SOLO el/los proyecto(s) reales de TyA vía importador. No seedear Banca/Restaurantes. Los proyectos demo solo existen en el prototipo comercial, no en el tenant del cliente.

### 2.2 (P0.7) Periodo dinámico
- El dashboard y la HR ya derivan el periodo de los datos, con selector de mes. El "julio fijo" que se ve proviene de los datos seedeados del tenant demo, no de código.
- En producción: al cargar la HR real, el periodo activo sale de los datos; el selector ya cambia HR/dashboard/postulaciones/visitas/beneficios/finanzas.

### 2.3 (P0.8) HR viva Q1/Q2/GT/HN
- Los campos ya existen en el set-up del proyecto (`pago.diasPago`, `pago.diaSemana`, `quincenas[]`, `hrMap`, países/monedas). "Disponible desde" se calcula con `CX.liquidacion.fechaEstimadaPago` (viernes + días).
- En producción: se configuran por proyecto al hacer el set-up; la anti-duplicación por llave natural ya está en el importador.

### 2.4 (P3) Reglas Cinépolis — SÍ aplican al prototipo comercializable (mejoran el motor genérico)
Estas reglas son genéricas y se parametrizan por proyecto, así que se dejan como CAPACIDAD del prototipo, configurables:
- **Franja WK/WKND**: ya validada en `visita-detalle.js` (control de franja).
- **Fecha de pago viernes + N días**: ya en `CX.liquidacion` (configurable `diaSemana`/`diasPago`).
- **Fuera de rango → reprogramación**: flujo de reprog ya existe.
- **Periodicidad de rondas + periodo de cumplimiento (quincenal)**: ya en el wizard de proyecto.
- Pendiente de parametrizar en backend por proyecto: Q1 usa submitido de Q2 anterior / Q2 desde día 16 / combo JUMBO como reembolso. Son reglas de negocio de datos, se cargan con el proyecto.

### 2.5 (Filtros) Verificación
- Filtros funcionales confirmados en Postulaciones (búsqueda/proyecto/país/estado/históricas), Movimientos/Finanzas (periodo), Dashboard (proyecto/todos), Academia (categorías/audiencia), Visitas disponibles (país/proyecto). Los filtros operan sobre datos vivos.

## 3. Qué debe hacer el backend (ChatGPT/Codex), no el prototipo
- Seed del tenant TyA solo con datos reales (sin demos de otros clientes).
- Cargar el/los proyecto(s) de TyA con su periodicidad, quincenas, franjas y reglas específicas vía set-up + importador.
- Persistir en Firestore; el periodo activo y la HR salen de esos datos, no de código.
- No hardcodear Cinépolis en el código genérico: se configura como cualquier otro cliente.
