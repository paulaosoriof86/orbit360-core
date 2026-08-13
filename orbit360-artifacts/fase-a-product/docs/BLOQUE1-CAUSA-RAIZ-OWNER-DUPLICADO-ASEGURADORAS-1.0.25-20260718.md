# Bloque 1 · Owner duplicado de Aseguradoras · 1.0.25

Clasificación: `FUNCTIONAL_DEFECT`.

La evidencia 1.0.24 mostró que el archivo activo del tenant se solicitó antes de la cola canónica del Router. La auditoría encontró dos autoloads de nivel global: `loadTenantConfig()` en el adaptador v1197 y `loadAysRuntime()` en el bridge de recursos v1202. Ambos añadían scripts a la cola del navegador antes de finalizar el bootstrap propietario.

Corrección: el adaptador v1197 ya no inyecta la configuración tenant; observa la configuración cargada por el Router. El catálogo de conocimiento y el runtime de recursos se activan únicamente desde `mod.render`, después de concluir los contratos del Router.

Carril A: renderer, ficha, directorio y UX preservados.
Carril B: ownership de bootstrap corregido; Store, Auth, Router, reglas y backend protegidos sin cambios.
Carril C: 414 clientes, 26 aseguradoras y 7 asesores sin reimportación.

Claude: `BACKEND_PROTEGIDO_NO_CLAUDE`. Patrón reusable: los adaptadores consumidores no pueden cargar contratos del bootstrap canónico; solo observar readiness y cargar recursos locales después del render propietario.

Academia: distinguir owner canónico, adaptador consumidor, autoload pre-Router y carga lazy post-render.

Salida: preflight vinculante y una sola ejecución oficial; cierre exclusivamente con `ok:true`.
