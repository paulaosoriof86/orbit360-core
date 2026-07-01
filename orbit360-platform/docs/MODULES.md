# Catálogo de módulos (referencia)

22 módulos en 4 bloques. Cada uno: **problema → función → capa IA → valor**. Es la especificación de comportamiento; la implementación vive en `modules/<id>.js`.

Leyenda de vista: 🖥️ Admin · 📱 Shopper · 🔁 Ambos.

## ⚡ Operación (Admin)

| Módulo | Vista | Problema | Función | Capa IA |
|---|---|---|---|---|
| **Mi Día** | 🔁 | Falta de foco diario | Resumen accionable del día por rol | Prioriza solo lo accionable y por urgencia |
| **Dashboard Operativo** | 🖥️ | Sin visibilidad en tiempo real | KPIs, flujo por etapas, cobertura, top shoppers, alertas | Resalta atrasos/anomalías antes de que escalen |
| **Proyectos** | 🖥️ | Cada cliente exige rehacer todo a mano | Configura cliente/país/reglas; genera visitas y cuestionarios | **Núcleo adaptable**: toda la plataforma se reconfigura sola |
| **Visitas Disponibles** | 🔁 | Publicación manual → errores y duplicidad | Visitas filtradas por país/quincena/escenario/franja | Filtra y prioriza según perfil y disponibilidad |
| **Postulaciones** | 🖥️ | Solicitudes dispersas, no auditables | Aprobar/rechazar/standby/liberar/reasignar + sync HR + WhatsApp | Sugiere mejor shopper; detecta reprogramaciones tardías |
| **Shoppers** | 🖥️ | Red crece sin control | Perfil, historial, certificaciones, honorario | Calificación y ranking calculados |
| **Hojas de Ruta** | 🖥️ | Excel paralelo desincronizado | Planificación colaborativa conectada al estado real | Ordena y sincroniza la ruta sin copiar/pegar |
| **Documentos** | 🔁 | Instructivos perdidos en chats | Repositorio operativo por proyecto, dentro de la visita | Entrega el documento correcto según la visita |
| **Aprendizaje** | 🔁 | Inducción lenta y dependiente | Cursos/videos de formación general | Refuerza lo que falló en certificación |
| **Certificación** | 🔁 | Evaluadores sin preparación | Banco de preguntas, gate, intentos, feedback | Feedback al shopper + reporte de vacíos al equipo |
| **Tablón / Novedades** | 🔁 | Acciones perdidas en WhatsApp | Notificaciones, contador, acciones | Ordena por relevancia, dispara WhatsApp |
| **Soporte IA** | 🔁 | Dudas saturan WhatsApp | Asistente con contexto real de la operación | Responde 24/7 con fechas/estados/honorarios reales |
| **Reportes & KPIs** | 🖥️ | Reportes manuales lentos | KPIs, drill-downs, exportables | Lecturas y exportables listos, resalta brechas |

## 📱 Portal del Shopper

| Módulo | Problema | Función |
|---|---|---|
| **Mi Perfil** | No ve su desempeño | Datos, rating, certificaciones, cómo subir el rating |
| **Mis Visitas** | Sin lugar único para ejecutar | Agendar, reprogramar, marcar realizada, cuestionario, progreso |
| **Mis Beneficios** | No ve claro cuánto/ cuándo cobra | Honorarios, reembolsos, estado y total por moneda |

(Visitas, Documentos, Aprendizaje, Certificación, Novedades y Soporte IA también son del shopper, descritos arriba.)

## 💰 Finanzas (Admin)

| Módulo | Problema | Función | Capa IA |
|---|---|---|---|
| **Dashboard Financiero** | Rentabilidad desconectada de la operación | Ingresos/egresos/anticipos/margen por proyecto, GT y HN separados | Margen calculado solo |
| **Movimientos** | Caja sin trazabilidad | Ingresos, egresos, conciliación por proyecto/país | Concilia y categoriza |
| **Liquidaciones** | Pagos manuales, reclamos | Cálculo por shopper desde HR, validación, prepara lote | Calcula honorarios/reembolsos y arma el lote |
| **Lotes de Pago** | Pagos sueltos con error | Agrupa liquidaciones validadas, crea egreso | Agrupa y concilia, evita duplicidad |

## ⚙️ Configuración (Admin)

| Módulo | Problema | Función | Capa IA |
|---|---|---|---|
| **Cuestionarios** | Cada proyecto/escenario necesita el suyo | Versiones por escenario, preguntas por tipo, puntajes | Sugiere preguntas; versiona sin empezar de cero |
| **Usuarios & Permisos** | Accesos sin control | 4 roles con acceso por módulo | Segmenta la vista por rol |
| **Configuración** | Cambios requieren tocar código | Parámetros, reglas, integraciones editables | Los cambios se propagan solos |

---

### Sobre "base / configurable / personalizado"
- **Base**: genérico, sirve a cualquier cliente.
- **Configurable**: se adapta por parámetros (sin código).
- **Personalizado**: add-on monetizable (certificaciones avanzadas, finanzas, white-label, IA).
