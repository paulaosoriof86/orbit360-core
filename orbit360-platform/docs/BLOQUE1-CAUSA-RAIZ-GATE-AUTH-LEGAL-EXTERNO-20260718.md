# Bloque 1 · Gate externo de autenticación y legal

Fecha: 2026-07-18

Clasificación: `PIPELINE_MECHANISM_FAILURE`.

El bootstrap completo, la configuración activa del tenant y `router-ready` quedaron aprobados. El primer fallo posterior ocurrió cuando el validador intentó iniciar sesión mediante `page.evaluate`, aunque la plataforma ya dispone de un formulario canónico que es el propietario real del flujo Firebase.

La corrección no modifica Auth, usuarios ni datos. El gate completa `#lg-user` y `#lg-pass`, envía `#login-form` y observa externamente que el cuerpo abandona `pre-auth`, que el login se oculta y que el shell aparece.

La aceptación legal también usa controles visibles: un único modal `data-legal-gate`, checkbox `#lg-chk` y botón `#lg-ok`. Se elimina la inspección y programación mediante evaluaciones internas.

Carril A: UI canónica utilizada sin cambios. Carril B: solo validator/gate y contrato; Auth, Store, reglas y backend protegidos intactos. Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`. Academia: distinguir prueba del flujo real por UI frente a invocar funciones internas desde el validador.
