# Rollback Fase 1 Auth LAB

## Objetivo

Volver al comportamiento demo comercial sin tocar datos, modulos ni estilos.

## Pasos

1. Cerrar el servidor local de validacion.
2. Abrir la app sin bandera Firebase: `index.html?orbitAuth=demo` o `index.html`.
3. Si se uso bandera persistida, ejecutar en consola:

```js
localStorage.removeItem('orbit360_auth_mode');
localStorage.removeItem('orbit360_session');
```

4. Mantener `core/auth-firebase.config.local.js` fuera de Git.
5. Eliminar el archivo temporal local `index-dev-auth.html` si ya no se necesita para LAB.

## Archivos de rollback de codigo

Revertir solo estos archivos si se requiere deshacer la Fase 1:

- `core/auth.js`
- `core/auth-firebase.config.example.js`
- `.gitignore`
- Documentos de Fase 1 en `docs/`

No revertir ni tocar `data/store.js`, `modules/` ni `styles/`.
