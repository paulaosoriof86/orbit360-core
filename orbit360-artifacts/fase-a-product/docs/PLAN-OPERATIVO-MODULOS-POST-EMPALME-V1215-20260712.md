# Plan operativo por módulos post-empalme v1.215

Fecha: 2026-07-12  
Proyecto: Orbit 360 A&S  
Rama activa: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge, sin deploy, sin main

## Objetivo

Retomar la ruta operativa real de A&S sin seguir abriendo ciclos amplios con Claude. Cada módulo se trabaja en un bloque concentrado y se valida visualmente antes de pasar al siguiente.

Regla de avance:

```txt
cierre funcional del módulo
→ validación estática y de contrato
→ validación visual obligatoria
→ reporte de evidencias y pendientes menores
→ siguiente módulo
```

No se acumulan validaciones visuales para el final.

## Carriles

```txt
Carril A — Prototipo/empalme/UX
Carril B — Backend protegido, seguridad y Orbit.store
Carril C — Fuentes reales y operación A&S
```

El avance visible debe mantener los tres carriles separados. Ningún ZIP de prototipo reemplaza el backend protegido y ninguna fuente real se hardcodea en módulos.

---

# 1. CRM / Cliente360

## Cerrado y no repetir

- Scope de datos `propios/equipo/todos/ninguno` aplicado al grupo CRM.
- Bloqueo de deep-links fuera del alcance.
- KPIs clicables con valores separados por moneda.
- Alta manual tenant-aware.
- Detección de duplicado exacto y probable.
- Estado inicial `pendiente_polizas` mientras no exista la fuente de pólizas.
- País, departamento y ciudad mediante catálogos.
- Asesor puede completar campos vacíos permitidos.
- Cambios críticos se convierten en gestión de corrección.
- Auditoría de edición y motivo obligatorio.
- Protección de pólizas, cobros, conciliación, comisiones e historial por permiso.

## Abierto

1. Validar visualmente Cliente360 con los perfiles:
   - Dirección/Admin con scope todos;
   - asesor con scope propios;
   - operativo con alcance autorizado.
2. Comprobar lista, KPIs, filtros, detalle, edición, completar faltantes y gestión de corrección.
3. Confirmar que Calidad tenga vistas útiles por asesor y no solo un listado global.
4. Completar estado de acceso al Portal e invitación/reenvío sin exponer secretos.
5. Integrar visor documental común en ficha, pólizas y soportes visibles.
6. Mantener pendiente la ficha-página propia de Póliza; hoy varias rutas regresan al expediente Cliente360.
7. Ejecutar la validación de integración del dry-run sanitizado de clientes Siga CRM sin subir payload real.
8. Después del cierre CRM, solicitar/usar la fuente separada de Pólizas. No inferir pólizas desde clientes o movimientos financieros.

## Fuente real

```txt
DRY-RUN-CLIENTES-SIGA-CRM-REPORTE-SANITIZADO-20260709.xlsx
Contratantes Datos de Contacto 2026-07-08.xlsx
```

## Criterio de cierre

- No hay acceso cruzado entre asesores.
- Alta y edición persisten al recargar.
- El cliente queda `pendiente_polizas`.
- Los KPIs no mezclan GTQ/COP.
- Las acciones no autorizadas desaparecen o crean gestión.
- Cero errores de consola.
- Evidencia visual aprobada.

---

# 2. Aseguradoras

## Cerrado y no repetir

- Directorio operativo GT/CO con ficha editable.
- Contactos, plataformas, recursos, productos y documentos como parte del módulo operativo.
- Importador de directorios y recursos mediante puentes aditivos.
- Panel documental P0.9f–P0.9l en modo consulta.
- Preflight, lote, historial y reanudación controlados.
- Lectura y persistencia de historial separadas.
- Cero habilitación automática de Cotizador/Comparativo.
- Sin escritura directa desde el panel de conocimiento.
- Acciones administrativas con motivo y confirmación reforzada.

## Abierto

1. Validar visualmente que el módulo se perciba primero como directorio operativo y estratégico, no como panel técnico.
2. Mantener visibles y usables:
   - contactos;
   - códigos y plataformas;
   - accesos como referencia segura, nunca secretos;
   - cuentas y canales operativos;
   - productos/planes;
   - documentos y Drive;
   - conocimiento y estado de fuentes.
3. Ejecutar el dry-run local de los directorios GT/CO y revisar:
   - deduplicación;
   - aliases;
   - país;
   - contactos;
   - registros incompletos;
   - trazabilidad archivo/hoja/fila.
4. Validar visualmente el formulario administrativo y el historial sin ejecutar habilitación.
5. Confirmar el flujo:

```txt
fuente recibida
→ lectura/dry-run
→ revisión humana
→ conocimiento guardado
→ binding revisado
→ configuración tarifaria validada
→ habilitación explícita
```

6. No solicitar tarifas reales para cerrar la UI. Sin tarifa validada, mostrar “Pendiente de configuración validada”.
7. Conectar visualmente la ficha de Aseguradora con Cotizador/Comparativo sin convertir el módulo en una pantalla técnica.

## Fuentes reales

```txt
Directorio Aseguradoras Guatemala 2026.xlsx
Directorio - Aseguradoras Colombia 2024.xlsx
```

## Criterio de cierre

- Directorio y ficha funcionan en GT/CO.
- El panel técnico queda secundario y segmentado por rol.
- Los datos sensibles no se muestran.
- Una fuente recibida no habilita tarifas por sí sola.
- Dry-run y trazabilidad revisados.
- Cero errores de consola.
- Evidencia visual aprobada.

---

# 3. Cotizador y Comparativo

## Cerrado y no repetir

- Cálculo automático en default-deny.
- Requiere fuente, versión, vigencia, dimensiones y configuración tarifaria validada.
- Cotizaciones normalizadas y persistidas mediante `Orbit.store`.
- Transferencia Cotizador→Comparativo mediante IDs canónicos.
- Ranking y recomendación solo con propuestas validadas.
- Comunicación “preparada”, no “enviada”.
- Aceptación crea `issuance_request` en Ops; no crea póliza ni recibos.
- Desglose estructurado de prima neta, gastos, impuestos y total.
- Tolerancia de redondeo de 0.51.
- Estimación interna clasificada como `revisada_interna` y no elegible.
- Edición persistente obliga revalidación.
- País/moneda por contexto confiable.

## Abierto

1. Ejecutar el validador:

```bash
node tools/orbit360-validar-cierre-cotizador-comparativo-v1215.mjs orbit360-platform
```

2. Actualizar cache-bust del refinamiento mediante el pipeline seguro antes del smoke visual.
3. Validar visualmente estos escenarios sin tarifas reales:
   - aseguradora sin fuente/tarifa: automático bloqueado;
   - propuesta manual: borrador pendiente;
   - PDF/imagen: extracción propuesta, fuente y revisión;
   - desglose correcto e incorrecto;
   - edición y recarga;
   - dos propuestas validadas → comparativo;
   - propuesta pendiente o estimación interna → excluida;
   - replantear criterio;
   - selección manual con justificación;
   - impresión;
   - preparación de comunicación;
   - aceptación → solicitud de emisión en Ops.
4. Profundizar “Replantear” y permitir volver al criterio automático sin perder historial.
5. Integrar visor del documento fuente desde Cotizador/Comparativo.
6. Revisar y rescatar de `comparativo_final_v110.html` únicamente las capacidades avanzadas generalizables, sin incrustar Firebase, credenciales, datos o reglas A&S.
7. Confirmar Academia profunda del flujo; no crear curso duplicado.

## Fuente funcional avanzada

```txt
comparativo_final_v110.html
```

Su uso es aislado y configurable. No es fuente para reemplazar el backend ni para copiar credenciales/configuración.

## Criterio de cierre

- Validador con `fail: 0`.
- Automático bloqueado sin configuración validada.
- No se requiere una tarifa real para demostrar el contrato.
- Desglose persiste y cuadra.
- Estimación interna nunca llega a cliente/emisión.
- Aceptación crea una gestión tipada con IDs exactos.
- Cero errores de consola.
- Evidencia visual aprobada.

---

# 4. Ops y Leads

## Cerrado y no repetir

- Ops y Leads comparten el ciclo comercial existente.
- Las bases actuales de ambos módulos coinciden con la candidata auditada; no se reemplazan.
- Solicitudes `issuance_request` aparecen en la columna Emisiones.
- No se crea una colección o módulo paralelo para emisiones.
- Campos controlados por workflow quedan bloqueados en la gestión.
- Solicitud de emisión y endoso tienen contratos tipados.
- Una aceptación en Comparativo no crea póliza emitida.

## Abierto

1. Validar visualmente el flujo completo:

```txt
Lead/prospecto
→ cotización
→ propuestas validadas
→ comparativo
→ aceptación
→ issuance_request en Ops
→ checklist y documentos
→ emisión confirmada
→ creación de póliza
```

2. Confirmar sincronización bidireccional de etapa entre Leads y Ops sin duplicar registros.
3. Validar scopes por asesor/equipo/todos y deep-links.
4. Integrar gestiones de corrección provenientes de CRM y Calidad.
5. Validar asignación, responsable, prioridad, vencimiento, próxima acción y SLA.
6. Confirmar que cerrar una emisión requiere número y documento real de póliza.
7. Validar que notificaciones sean preparadas/confirmadas, nunca simuladas.
8. Revisar adjuntos y visor documental en gestión.
9. Confirmar la conversión de prospecto a cliente sin duplicados.
10. Validar que la póliza y cartera nazcan solo después de emisión real y estado permitido.

## Criterio de cierre

- Un mismo registro conserva identidad entre Leads y Ops.
- Asesor ve solo su alcance.
- Emisión no puede cerrarse sin evidencia real.
- El resultado crea póliza una sola vez.
- Los errores de workflow son visibles y recuperables.
- Cero errores de consola.
- Evidencia visual aprobada.

---

# Protocolo obligatorio de validación visual por módulo

Cada módulo se prueba, como mínimo, en:

```txt
Desktop: 1366 px
Tablet: 768 px
Móvil: 390 px
```

## Matriz mínima

1. **Carga**: abre sin pantalla vacía, parpadeo o bloqueo.
2. **Navegación**: ruta, volver, deep-link y cambio de módulo.
3. **Roles**: Dirección/Admin, Operativo y Asesor cuando aplique.
4. **Scopes**: propios, equipo, todos y ninguno cuando aplique.
5. **País/moneda**: GT/GTQ y CO/COP sin sumas cruzadas.
6. **Acciones**: crear, editar, cancelar, confirmar y errores.
7. **Persistencia**: recarga conserva el resultado esperado.
8. **Estados honestos**: preparado ≠ enviado; fuente recibida ≠ habilitada; pago reportado ≠ conciliado.
9. **Responsive**: no hay columnas cortadas, overlays inaccesibles ni botones fuera de pantalla.
10. **Consola**: cero errores no controlados.
11. **Accesibilidad básica**: foco, teclado, labels y contraste.
12. **Evidencia**: capturas y reporte con fecha, rol, tamaño, ruta, prueba y resultado.

## Gate

Un módulo no cambia a “cerrado” solo porque pase sintaxis o porque exista el botón. Debe tener:

```txt
contrato validado
+ prueba funcional
+ persistencia
+ roles/scopes
+ validación visual
+ reporte
```

Los hallazgos visuales P0/P1 se corrigen antes de avanzar. Los P2 se documentan sin detener el siguiente bloque.

---

# Orden de ejecución inmediato

```txt
OP-1 CRM / Cliente360
OP-2 Aseguradoras
OP-3 Cotizador y Comparativo
OP-4 Ops y Leads end-to-end
```

No se mantienen dos módulos simultáneamente en cierre visual. Los contratos transversales pueden avanzar en paralelo únicamente si no cambian la pantalla que se está validando.

## Próxima acción

Iniciar OP-1 CRM:

1. ejecutar preflight y smoke estático;
2. validar lista y expediente con los tres perfiles;
3. revisar Calidad por asesor;
4. verificar dry-run sanitizado de clientes;
5. realizar validación visual 1366/768/390;
6. documentar resultado;
7. pasar a Aseguradoras.

Al terminar el dry-run de clientes y antes de activar estados operativos definitivos, la siguiente fuente separada requerida es Pólizas.

## Estado de carriles al crear este plan

```txt
Carril A: candidata v1.215 auditada; correcciones reutilizables empalmadas mediante contratos/puentes.
Carril B: backend protegido intacto; PR #5 sigue draft/open.
Carril C: clientes y directorios de aseguradoras disponibles; Pólizas es la siguiente fuente requerida después del cierre CRM.
```
