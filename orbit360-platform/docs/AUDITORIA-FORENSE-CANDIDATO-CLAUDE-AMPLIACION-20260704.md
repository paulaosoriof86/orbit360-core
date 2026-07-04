# Auditoría forense ampliada candidato Claude

Fecha: 2026-07-04
Rama: ays/backend-tenant-lab-v99-20260703
PR: #5
Candidato revisado: Prototype Development Request - 2026-07-03T202245.322.zip
Estado: auditoría ampliada; no empalmado.

## Conclusión

La lista previa de P0/P1 no era suficiente. Además de los puntos ya detectados, hay pendientes adicionales que conviene enviar a Claude antes de pedir una nueva candidata.

## Validaciones realizadas

- Inventario local del ZIP.
- Revisión estática de index, core, módulos y documentación.
- Validación de sintaxis JavaScript con node --check.
- Cruce entre rutas del menú y módulos.
- Cruce de tipos de importador visibles vs contratos de mapeo.
- Búsqueda de textos técnicos, fechas fijas, defaults de negocio y accesos directos a almacenamiento local.

## Hallazgos adicionales importantes

### P0/P1 nuevos para Claude

1. Tipos de importación visibles sin contrato operativo completo.
   - planillas-comision aparece en UI y alcance, pero no tiene mapeo estructurado equivalente en IMPORT_MAP.
   - docs-aseguradora aparece como tipo, pero no tiene alcance ni contrato de escritura claro.

2. Planillas de comisión no leen realmente la planilla.
   - La vista de tarifas detectadas se genera desde aseguradoras existentes y usa valores simulados/variables, no desde filas reales del archivo.
   - Esto puede actualizar tarifas incorrectas si el usuario confirma.

3. Fechas fijas en flujos operativos.
   - Hay fechas quemadas en portal, cliente360, siniestros y configuración financiera demo.
   - Deben usar fecha viva o configuración del tenant cuando sean acciones reales.

4. Documentación desalineada.
   - CHANGELOG, bitácora, reporte smoke y pendientes tienen versiones distintas y estados mezclados.
   - PENDIENTES-Y-MEJORAS sigue encabezado como v1.41 aunque hay bitácora hasta v1.113.

5. Textos o referencias de demo/cliente visibles.
   - Login muestra credenciales demo precargadas.
   - Hay copia white-label que menciona Alianzas en selector de paleta.
   - Debe quedar modo comercializable sin cliente específico visible.

6. PWA no parece incorporar completamente el estado instalado o guía diferenciada por plataforma.
   - Se debe alinear con la mejora reportada: instalada, iOS, otros navegadores.

## Hallazgos previos que siguen vigentes

1. Importador financiero histórico debe preservar hoja, país, moneda, periodo, bloque y fila.
2. No debe asumir Guatemala si no reconoce país.
3. Pólizas sin país, moneda o estado explícito no deben generar cartera ni recibos.
4. Separar cobros/recaudos de movimientos financieros.
5. Excluir hojas soporte antes de mapear histórico financiero.
6. Corregir documentos para no crear o modificar cliente sin confirmación clara.
7. Separar prima neta, prima total, gastos e IVA.
8. Ocultar textos técnicos de UI cliente.

## Lo que sí se confirmó estable por estático

- 30 rutas del menú tienen módulo correspondiente.
- 30 módulos presentes.
- JS sin errores de sintaxis en la revisión local.
- No se detectó escritura directa a almacenamiento local desde módulos funcionales.

## Limitación

No se pudo completar smoke visual real desde este entorno. Debe hacerlo Claude en navegador real antes de entregar candidata corregida.

## Decisión

Antes de pedir nueva candidata, actualizar el prompt de Claude para incluir estos hallazgos adicionales. Pedir una candidata corregida solo cuando Claude pueda resolver P0/P1 de importador, UI comercializable y documentación alineada.
