# Gravicentra Insurance — decisión congelada de Dirección, 28-oct-2026

**Autoridad:** Paula Andrea Osorio Franco (propietaria y Dirección). **Gate existente:** I6.5/B4-003. **Naturaleza:** decisión nueva y explícita; no es certificación retroactiva ni reinicio del recovery.

## Decisión literal

> «Confirmo que acepto temporalmente ese riesgo específico para la salida LIVE, dejando el endurecimiento de reglas como pendiente prioritario de postproducción. Pilas con congelar realmente las decisiones ...»

## Efecto vinculante para la preparación de LIVE

1. Paula acepta **temporalmente y solo para esta salida LIVE** el riesgo documentado de las reglas actuales de Firestore: ser miembro autenticado del tenant puede permitir lectura o escritura dentro del tenant sin aplicar todos los filtros efectivos de rol/país/alcance de asesor. El riesgo queda **abierto y expresamente aceptado**; no se declara PASS de seguridad.
2. El endurecimiento y prueba negativa/positiva de esas Rules pasa a ser **P0 prioritario de postproducción**, con seguimiento, responsable y comprobación antes de ampliar acceso a nuevas personas o tenants.
3. No se debe presentar el endurecimiento de esas Rules como bloqueo de release por sí solo **mientras rija esta excepción**. Los expedientes históricos y el hallazgo `b4003SecurityReleaseHold` permanecen intactos como evidencia.
4. La excepción **no** autoriza cambios de Firestore Rules, IAM, Auth, datos reales, importaciones, permisos de cuentas ni eliminación de evidencia; ni habilita un endpoint LIVE inseguro ni autoriza por sí sola un deploy.
5. Permanecen exigibles las condiciones funcionales independientes: el mismo artifact exacto, lector protegido LIVE operativo, prueba de login/datos por identidades reales y rol/país, consistencia financiera y flujos críticos, readback posterior y rollback disponible.
6. Ningún flujo no probado puede convertirse en PASS por esta excepción. No abrir otro gate, metodología paralela ni repetir desde cero UAT ya acreditada; solo pendientes materiales de la matriz existente.

## Vigencia y trazabilidad

- **Estado:** OWNER_RISK_ACCEPTED_FOR_CONTROLLED_LIVE; SECURITY_FINDING_OPEN; FUNCTIONAL_GO_PENDING.
- **Fecha local de decisión:** 2026-10-28, Guatemala.
- **Fuente:** confirmación expresa en conversación principal de ChatGPT del proyecto.
- **Ejecución de este asiento:** únicamente registro documental SOURCE-ONLY. No LIVE, no datos, no cambios de Rules/Auth/IAM.
- **Anti-regresión de criterio:** posteriores agentes/conversaciones deben distinguir «seguridad no certificada con excepción de riesgo aceptada» de «seguridad certificada». No volver a bloquear LIVE *solo* por la misma regla ya aceptada; tampoco ignorar hallazgos nuevos o ruptura funcional.
