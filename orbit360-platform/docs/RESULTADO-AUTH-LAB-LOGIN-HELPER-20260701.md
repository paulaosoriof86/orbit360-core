# Resultado Auth LAB Login Helper

- Fecha local: 2026-07-01 02:04:12
- Rama: feat/ays-auth-lab-correction-20260630
- HEAD inicial: f6360e7 fix(auth): habilitar login Firebase LAB real
- Restricciones: sin push, sin Hosting deploy, sin produccion, sin datos reales, sin guardar secretos
- Estado: EN PROGRESO

## Hallazgo

La pantalla LAB mostraba dmin@demo.com por autocompletado/demo. Eso provoca intento de login con usuario incorrecto y no permite validar Firebase Auth LAB.

## Cambio aplicado

- Se creó core/auth-lab-login-helper.local.js.
- En modo irestore-lab, el correo queda forzado a orbit.lab@demo.com.
- Se agregó botón para enviar restablecimiento de contraseña LAB mediante Firebase Auth.
- No se guarda ni se versiona contraseña.
- No se tocaron módulos.

## Resultado esperado

- El campo de correo debe mostrar orbit.lab@demo.com, no dmin@demo.com.
- Si Chrome autocompleta contraseña correcta para ese usuario, el login debe entrar.
- Si no se conoce la contraseña, usar el botón de restablecimiento LAB.
