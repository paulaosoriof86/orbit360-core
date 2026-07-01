# PENDIENTES-PROTOTIPO.md

> Lista viva de mejoras del prototipo CXOrbia, priorizada. Actualizada por sesión.
> Clasificación: P0 crítico · P1 importante · P2 posterior · [TyA] específico · [CX] generalizable

## ✅ Resueltos (sesiones 50–50d)
- IA multi-proveedor sin sesgo + comparativo [CX]
- PWA auto-install + favicon = logo consultora [CX]
- Roles franquicia (coordinador/aliado) con scopeCountry [CX]
- P0: Mis Visitas / Mis Beneficios filtran por shopper autenticado [CX]
- Login white-label: logo cliente + banderitas + "Desarrollado por CXOrbia" [CX]
- Logo del cliente en topbar + propuestas [CX]
- CxC/CxP clickeables: detalle, editar saldo, cambiar estado, eliminar [CX]
- Importador: "Migración TyA" → "Migración de cliente" genérico [CX]
- Documentos: lector real (PDF/imagen/video) + reemplazo de archivo [CX]
- Usuarios: editar usuario + correo cualquier dominio [CX]

## 🔴 P0 — Crítico (próximas sesiones)
- **Acciones operativas persistibles** [CX]: centralizar aprobar/rechazar/reprogramar/reasignar/pagar lote con evento+auditoría+sin duplicar. Botones que solo hacen toast → acción real o "pendiente backend" honesto.
- **IA real no hardcodeada** [CX]: análisis IA / set-up / hoja de ruta deben usar `CX.ai.ask` con el documento adjunto, no `simulateAnalysis` fijo.
- **Clientes vs Cuentas CRM** [CX]: unificar/vincular — misma ficha, sincronizados.
- **Academia profunda** [CX]: cursos con lecciones extensas + quiz por lección; manuales visibles in-app; video/imagen/archivo se embeben; crear/editar/eliminar categorías y lecciones.
- **Finanzas profundo** [CX]: movimiento por shopper en pago de lote (no "pago lote"); egresos/ingresos con proyecto+moneda por país; financiamiento con concepto; remesas→CxC; impuestos por país; presupuesto solo en Movimientos; importador de movimientos inteligente; históricos al cambiar de mes.
- **Postulaciones** [CX]: solicitar ajuste, gestión visitas aprobadas, reasignar con buscador; sincronía shopper sin duplicación; notificaciones bidireccionales.
- **Reservas/Asignación** [CX]: detectar visitas disponibles (sin shopper en HR); cargar escenarios por periodo; cruce reserva↔postulación.

## 🔴 P1 — Importante
- Botón "Asignar responsable" en ítems de gestión interna → notifica + aparece en Mi Día hasta gestionar [CX]
- Reportes: crear con IA, elegir columnas, editar, descargar [CX]
- Certificación: crear con IA desde instructivo; banco de preguntas real; recertificación con notificación [CX]
- Soporte: bandeja con datos vivos, cambiar estado notifica al solicitante [CX]
- Set-up inteligente: preguntar QUÉ ítems generar (instructivo/cuestionario/cert/HR/evidencias), cada uno editable a profundidad [CX]
- Config: cada opción con crear-IA/importar/editar/eliminar + listas desplegables administrables [CX]
- Marketing: generar mes IA con temáticas/embudo/objetivo/CTA/hashtags; elegir herramienta; tono personalizable [CX]
- Automatizaciones + Integraciones: autoadministrables, plantillas ricas, activar/configurar real [CX]
- Importador: parsear Excel real (.xlsx) con SheetJS [CX]
- Dashboard operativo: verificar KPIs vs HR mapeada, comparativo sin hardcode, avance real vs ideal por país [CX]

## 🔴 P1 — TyA específico (del resumen ChatGPT)
- HR por proyecto (Excel Online / Google Sheets / nativa / upload) con write-back sin duplicar [TyA]
- Importador financiero: hojas TyA/TyA HN/Liquidación → clasificar movimientos/beneficios/lotes [TyA]
- Honorarios por país desde config (GT Q60, HN L200) — NO hardcodeados [TyA→CX]
- Boleto+combo = reembolsos operativos; flujo T&A→Paula→shopper [TyA]

## 📚 Manuales (P1)
- Manual completo por sección/módulo/rol con cómo configurar todo [CX]
