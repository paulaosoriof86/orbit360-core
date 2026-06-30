# BITACORA DE CAMBIOS

---

Fecha: 2026-06-30 16:05
Modulo: Login / Auth LAB / Generacion temporal index-dev-auth.html
Sintoma/necesidad: En la validacion DEV/LAB aparecieron caracteres mojibake y emojis corruptos en pantalla: textos como sesion, contrasena, administracion y etiquetas del login se renderizaron como caracteres extraños.
Esperado: Todos los textos del prototipo y archivos temporales de validacion deben conservar UTF-8 correcto, incluyendo acentos, signos y emojis permitidos.
Causa raiz probable: Generacion del archivo temporal con PowerShell usando lectura/escritura sin codificacion UTF-8 explicita; esto puede reinterpretar archivos UTF-8 como ANSI/Windows-1252 y producir mojibake.
Archivo/funcion: index-dev-auth.html generado desde index.html durante validacion Fase 1 Auth LAB.
Fix o mejora aplicada: Regenerar index-dev-auth.html con System.Text.UTF8Encoding(false), documentar regla de migracion y evitar Get-Content/Set-Content sin encoding explicito en scripts que manipulen HTML/JS/CSS.
Impacto en prototipo comercializable: Aplicar a prototipo base como guardrail de migracion; cualquier script de preparacion, ZIP, validacion o hotfix debe preservar UTF-8 y validar que no aparezcan patrones Ã, Â, ðŸ, â en UI.
Estado: EN PROGRESO
---

Fecha: 2026-06-30 16:21
Módulo: Auth / Login / Migración A&S LAB
Síntoma/necesidad: Validar Auth real con Firebase LAB correcto para Orbit 360 Core, evitando el proyecto antiguo ays-dashboard-4a575.
Esperado: Login/logout funcional en ays-orbit-360-lab, modo demo conservado, data/store.js intacto y sin avanzar a Fase 2.
Causa raíz si aplica: La validación previa se contaminó por referencia histórica al dashboard antiguo; se corrigió a Firebase LAB limpio de Orbit.
Archivo/función: core/auth.js, core/auth-firebase.config.example.js, core/auth-firebase.config.local.js local no versionado.
Fix o mejora aplicada: Validación funcional realizada; login, logout y modo demo confirmados. Config local ignorada por Git. Proyecto viejo no usado.
Impacto en prototipo comercializable: Auth real queda preparado por bandera y tenant, conservando demo como default; A&S será primer tenant real sin bifurcar código.
Estado: RESUELTO EN LAB / pendiente commit local de documentación.
