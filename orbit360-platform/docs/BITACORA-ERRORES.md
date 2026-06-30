# BITACORA DE ERRORES

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
Módulo: Login / Sidebar / UX tenant A&S
Síntoma/necesidad: En la validación DEV/LAB una URL temporal mostró caracteres mojibake y se evidenció que los badges técnicos BETA/NÚCLEO/ROAD no deben aparecer al cliente final.
Esperado: Textos UTF-8 correctos y sidebar limpio para tenant A&S, sin etiquetas técnicas visibles al usuario final.
Causa raíz si aplica: index-dev-auth.html es archivo temporal generado para validación; los badges técnicos pertenecen al prototipo/control interno y deben ocultarse por tenant/rol/modo.
Archivo/función: index-dev-auth.html temporal; core/config.js / renderer de navegación / estilos sidebar.
Fix o mejora aplicada: Hallazgo documentado. La URL demo correcta no mostró caracteres raros y permitió login/logout. Pendiente aplicar ocultamiento de badges técnicos para tenant cliente.
Impacto en prototipo comercializable: Aplicar como mejora al prototipo base: separar modo interno/desarrollo de modo cliente real; evitar señales de laboratorio en white-label.
Estado: ABIERTO para UX tenant A&S / aplicar a prototipo base.
