# CHECKLIST-VALIDACION-PROTOTIPO.md

> Lista de validación funcional del prototipo CXOrbia. Marca cada ítem al probar.
> Sirve para confirmar que el prototipo está listo antes de conectar backend.

## Operación
- [ ] Crear proyecto desde el wizard (países, monedas, honorarios, periodicidad)
- [ ] Configurar HR del proyecto (fuente: externa/nativa)
- [ ] Importar HR en modo preview/dry-run (sin duplicar)
- [ ] Crear HR nativa (visitas/sucursales)
- [ ] Asignar visita a shopper (persiste + audita quién)
- [ ] Shopper agenda visita (fecha visible, notifica equipo)
- [ ] Shopper marca realizada (habilita cuestionario)
- [ ] Abrir y llenar cuestionario
- [ ] Marcar cuestionario enviado (pasa a histórico)
- [ ] Mis Visitas muestra SOLO las del shopper autenticado ✅
- [ ] Mis Beneficios muestra SOLO los del shopper autenticado ✅

## Postulaciones
- [ ] Aprobar / rechazar / standby (audita quién, desaparece de pendientes)
- [ ] Reprogramar: autorizar nueva fecha / conservar anterior
- [ ] Reasignar a otro shopper (con buscador)
- [ ] Asignar manual (crear shopper en el momento si no existe)
- [ ] Cancelar (visita vuelve a disponible)
- [ ] Sin duplicación entre plataforma y HR

## Finanzas
- [ ] Dashboard financiero: KPIs abren detalle
- [ ] Movimientos: ingreso/egreso con proyecto + moneda por país
- [ ] CxC/CxP clickeables: detalle, editar saldo, cambiar estado ✅
- [ ] Financiamiento con concepto (no cuenta como ingreso operativo)
- [ ] Remesas → registrar + conciliar
- [ ] Presupuesto mensual (en Movimientos) → avance en dashboard
- [ ] Pagar lote → egresos por shopper (no "pago lote" genérico)
- [ ] Filtro de periodo / histórico
- [ ] GT y HN separados (nunca sumar monedas)

## Capacitación & IA
- [ ] Academia: cursos con lecciones profundas
- [ ] Crear/editar/eliminar curso, lección, categoría
- [ ] Video/imagen/archivo se embeben en lección
- [ ] Generar lección/curso con IA (con documento adjunto)
- [ ] Manuales visibles y legibles in-app
- [ ] Certificación: crear con IA desde instructivo; banco de preguntas
- [ ] Documentos: lector real (PDF/imagen/video) ✅
- [ ] Soporte: bandeja viva, cambiar estado notifica

## Comercial
- [ ] CRM: Dashboard, Pipeline, Leads, Cuentas, Contactos, Actividades, Reportes ✅
- [ ] Ficha 360 con trazabilidad de correos + proyectos vinculados ✅
- [ ] Clientes ↔ Cuentas sincronizados (misma ficha)
- [ ] Propuesta con logo del cliente ✅
- [ ] Propuestas vinculadas a la ficha del cliente (editables, trazabilidad)
- [ ] Marketing: generar mes IA con criterios

## Configuración / White-label
- [ ] Identidad de Marca: subir logo → aplica a login/topbar/propuestas/documentos ✅
- [ ] Plan: seleccionar y activar módulos ✅
- [ ] Usuarios: crear/editar, correo cualquier dominio, roles ✅
- [ ] Roles personalizados + franquicia (coordinador/aliado) ✅
- [ ] IA: elegir proveedor (Gemini/ChatGPT/Claude/custom) ✅
- [ ] Automatizaciones: webhook Make por tenant ✅
- [ ] Integraciones: activar/configurar (no decorativo)

## Multi-tenant / permisos
- [ ] Datos segmentados por proyecto
- [ ] Vista por rol correcta (shopper no ve admin)
- [ ] Coordinador/aliado ve solo su país (scopeCountry) — pendiente backend
