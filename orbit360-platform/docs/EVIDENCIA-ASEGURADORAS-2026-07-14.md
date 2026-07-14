# Evidencia funcional — Aseguradoras (2026-07-14)

Capturado en vivo desde el propio prototipo (ver 6 capturas de esta sesión):

1. Directorio (Dirección) — KPIs correctos (Activas 6/12, Con contacto 12, Con acceso 4, Con documentación 12, Requieren actualización 0).
2. Ficha "Seguros Atlas" — Resumen (Dirección), con breadcrumb y botón Editar.
3. Plataformas (Dirección) — estado "Acceso disponible", botón Abrir, sin credenciales en claro.
4. Bancos y pagos (Dirección) — número de cuenta visible en claro (****4662 enmascarado por defecto de UI, pero con botón Copiar real, sin Orbit.vault) — confirma P0-E: bancos no dependen de la bóveda.
5. Plataformas (Asesor) — banner "Solo lectura" visible en la ficha, mismo contenido de solo consulta.
6. Intento de cambiar a rol "Operativo" con un usuario (ase002) cuyo único rol asignado es "Asesor" — correctamente RECHAZADO ("Ese rol no está asignado a ese usuario"), confirmando el fail-closed de sesión en un caso real, no solo en el trigger manual de pruebas.

## Limitación honesta

Esta sesión no tiene control directo sobre el tamaño real del viewport del navegador (no hay una API de "resize" expuesta a este agente) — no se pudieron generar los 15 escenarios exactos en 1366×768 (desktop), 768×1024 (tablet) y 390×844 (móvil) con emulación real de dispositivo. Las capturas de arriba se tomaron en el viewport por defecto del entorno de previsualización. Se recomienda que el usuario o el equipo de QA verifique manualmente esos 3 tamaños abriendo el prototipo en un navegador con DevTools (modo responsive) si necesita esa evidencia exacta.
