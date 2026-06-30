# RESULTADO VALIDACIÓN FASE 1 AUTH DEV/LAB — Orbit 360

Fecha: 2026-06-30 16:21  
Repo: paulaosoriof86/orbit360-core  
Proyecto Firebase LAB: ays-orbit-360-lab  
Tenant de prueba: alianzas-soluciones  
Estado: APROBADO EN LAB / pendiente commit local de documentación

## Resultado funcional

- Login Firebase LAB: APROBADO.
- Logout: APROBADO.
- Modo demo: APROBADO.
- data/store.js: sin cambios.
- core/auth-firebase.config.local.js: local, ignorado, no trackeado.
- Producción: no tocada.
- Deploy: no realizado.
- Fase 2: no iniciada.
- Proyecto viejo ays-dashboard-4a575: no usado.

## Observaciones visuales

Durante la prueba se abrieron dos URLs:

1. index-dev-auth.html?orbitAuth=firebase  
   - Presentó caracteres mojibake / emojis corruptos en algunos textos.
   - Se considera hallazgo del archivo temporal de validación, no aprobación visual final.

2. index.html?orbitAuth=demo  
   - Abrió correctamente.
   - Permitió acceso.
   - No mostró caracteres raros visibles.
   - Logout funcional.

## Hallazgo UX para A&S

En la versión real de Alianzas y Soluciones no deben mostrarse badges técnicos de módulo como BETA, NÚCLEO, ROAD o PRÓX. en el sidebar.

Criterio aprobado:
- En prototipo comercializable interno: pueden existir para control de desarrollo.
- En tenant cliente / A&S: deben ocultarse o limitarse a superadmin/dev mode.
- La UI cliente debe presentarse como producto operativo, no como laboratorio.

## Decisión

Fase 1 Auth queda funcionalmente aprobada en LAB para continuar con documentación y commit local.

No avanzar a Fase 2 hasta cerrar:
1. Documentación de validación.
2. Limpieza de archivo temporal index-dev-auth.html si queda en el repo.
3. Definición de ocultamiento de badges técnicos para tenant A&S.
