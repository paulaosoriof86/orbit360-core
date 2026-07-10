# Hotfix puntual — Validacion Aseguradoras: Auth local y fuente AseGuate

Fecha: 2026-07-10  
Proyecto: Orbit 360 A&S  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open, sin merge ni deploy.

## Carril actual

Carriles B + C, con traduccion obligatoria al paquete acumulado de Claude.

## Hallazgo 1 — configuracion local existente pero no reconocida

Necesidad: abrir el runtime Firestore LAB para validar visualmente Aseguradoras.  
Esperado: Firebase Auth disponible cuando existe `core/auth-firebase.config.local.js`.  
Observado: la pantalla de login mostraba que Auth no estaba disponible.  
Causa raiz probable confirmada por contrato: el inicializador reconoce objetos expuestos en `window`, mientras una configuracion local puede estar declarada como `const firebaseConfig = {...}` sin alias en `window`.  
Archivo afectado: archivo local ignorado `core/auth-firebase.config.local.js`; no se modifica el backend protegido del repositorio.  
Fix: el lanzador crea backup privado y agrega, solo si falta, un puente local reversible que expone el objeto existente mediante `window.firebaseConfigLab` y `window.ORBIT_FIREBASE_LAB_CONFIG`. No imprime ni copia valores.  
Impacto: el runtime puede reconocer configuraciones generadas con el formato estandar de Firebase sin subir secretos.  
Estado: hotfix implementado; pendiente revalidacion real en navegador.

## Hallazgo 2 — carpeta existente no equivale a fuente disponible

Necesidad: ejecutar el primer flujo real de `Tasas AseGuate.xlsx`.  
Esperado: al menos una fuente localizada antes de abrir la plataforma.  
Observado: el host iniciaba con `0` fuentes localizadas y `11` pendientes.  
Causa raiz: el lanzador validaba la existencia de la carpeta, pero no la presencia ni validez del archivo exacto esperado.  
Archivo/funcion: `tools/orbit360-iniciar-aseguradoras-lab-p09l.ps1`.  
Fix:

- crea la raiz privada si falta;
- localiza automaticamente un `.xlsx` de AseGuate en ubicaciones comunes;
- copia con el nombre canonico `Tasas AseGuate.xlsx`;
- valida firma ZIP/XLSX y tamano minimo;
- reinicia solamente el host registrado por Orbit 360;
- bloquea la apertura si el registro documental sigue en cero.

Impacto: no se abre una validacion visual incompleta ni se obliga a la usuaria a navegar carpetas.  
Estado: hotfix implementado; pendiente revalidacion real.

## Seguridad

- sin deploy;
- sin merge;
- sin produccion;
- sin secretos en Git;
- sin valores Firebase en reportes;
- sin rutas en UI;
- sin persistencia de conocimiento;
- Cotizador y Comparativo deshabilitados.

## Traduccion obligatoria para Claude

La proxima candidata debe:

1. mostrar estados honestos de disponibilidad de archivo;
2. no abrir la operacion como lista cuando la fuente requerida no existe;
3. no mostrar nombres tecnicos de Auth/backend al usuario final;
4. mantener configuracion y secretos fuera del frontend versionado;
5. conservar el flujo de correccion sin pedir rutas o IDs manuales;
6. absorber cualquier hotfix visual resultante de la revalidacion.

## Siguiente accion

Actualizar la rama local y ejecutar nuevamente el mismo lanzador. Verificar que:

- la consola reporte al menos una fuente localizada;
- Auth deje de mostrar el bloqueo de disponibilidad;
- Aseguradoras abra con panel y formulario;
- no se habiliten Cotizador ni Comparativo.
