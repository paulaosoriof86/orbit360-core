# Adenda v1.81 - PWA instalacion inteligente

Fecha: 2026-07-03
Estado: obligatorio para Claude/prototipo y backend.

## Verificacion v1.80

El prototipo v1.80 si incluye base PWA: `core/pwa.js`, `sw.js`, manifest dinamico, registro de service worker, captura de `beforeinstallprompt`, boton flotante `pwa-install`, deteccion parcial de standalone y remocion del boton en `appinstalled`.

## Brecha

La experiencia actual no cumple completamente el objetivo comercial:

- no aparece claro desde login/pre-login;
- usa boton flotante posterior;
- iOS muestra instrucciones manuales;
- no tiene estado persistente por tenant/usuario/dispositivo;
- no hay tracking de aceptado/rechazado/instalado/no disponible;
- puede insistir aunque el usuario ya instalo o rechazo.

## Regla tecnica

Una PWA no se puede instalar silenciosamente sin decision del usuario. El objetivo correcto es prompt inteligente de instalacion automatico cuando el navegador lo permita, con CTA nativo y contextual.

## Requerimiento Claude

Implementar PWA install manager:

1. Detectar dispositivo, sistema operativo, navegador, modo standalone e instalabilidad.
2. Mostrar CTA en login/pre-login cuando el navegador dispare `beforeinstallprompt`.
3. Si ya esta instalada o en standalone, no mostrar CTA.
4. Si se rechazo, guardar cooldown.
5. En iOS/Safari, mostrar guia visual minima solo cuando aplique.
6. Registrar eventos: eligible, shown, accepted, dismissed, installed, unsupported, already-installed.
7. Configuracion > PWA/App para administrar nombre, icono, color, screenshots, descripcion y estado.
8. Service worker versionado sin romper datos vivos ni backend.
9. No localStorage directo en modulos; usar preferencias tenant/store.
10. No mostrar instrucciones permanentes ni textos tecnicos al usuario final.

## Criterios de cierre

- CTA visible en login solo si el navegador permite instalar o requiere guia contextual.
- Al instalar, el CTA desaparece.
- En standalone no aparece.
- En iOS la guia aparece solo si no esta instalada.
- Estado guardado por tenant/usuario/dispositivo.
- Manual de usuario actualizado.
