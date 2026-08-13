# VALIDACIÓN VISUAL Y DECISIONES DE PRODUCTO — ORBIT 360 A&S v1.187

Fecha: 2026-07-11  
Fuente visual: capturas reales de la candidata `Prototype Development Request - 2026-07-11T081054.559.zip`  
SHA256 candidata: `4fff44da8466eb04fff31eacca4ba73e17873d88b958050c9e49105dde652325`  
Carril: A — UX, prototipo, responsive, Academia y documentación  
Validación cruzada: B — seguridad/credenciales/Drive; C — datos operativos reales  
Estado: `CORRECCION_CARRIL_A_REQUERIDA`

## 1. Conclusión ejecutiva

La candidata v1.187 mejora de forma importante Aseguradoras, pero todavía no debe declararse cerrada ni lista para empalme. La validación visual confirmó nuevos pendientes accionables de Carril A:

1. exceso de notas y términos técnicos en pantallas y botones;
2. responsive incompleto en login, modales, botones, tabs y otras vistas;
3. KPI sin drill-down ni detalle operativo;
4. ficha de Aseguradora montada como modal cuando debe ser una vista principal navegable;
5. tratamiento operativo de usuarios, accesos, cuentas bancarias y copia;
6. visor interno de documentos Drive;
7. necesidad de auditoría transversal, no limitada al módulo Aseguradoras.

No corresponde pasar estos puntos a Carril B: la mayor parte son cambios de UX, navegación, copy, responsive y componentes reutilizables del prototipo.

---

## 2. Limpieza transversal de copy técnico

### 2.1 Hallazgos visibles confirmados

En Aseguradoras aparecen textos que explican arquitectura o decisiones internas en lugar de ayudar a operar:

- `default-deny`;
- `borrador local`;
- `Guardar cambios (con motivo)`;
- `Cancelar (descarta el borrador)`;
- `declarado por el equipo`;
- `Quién puede ver este módulo se define en Equipo y permisos`;
- explicación extensa `Aseguradoras → Cotizador → Comparativo` en la portada;
- `sección administrativa avanzada`;
- `auditoría técnica interna vive en una colección separada`;
- notas de demo como `Cuentas ficticias, número enmascarado. Nunca cargar cuentas reales`.

Este contenido no debe mostrarse en la experiencia operativa principal.

### 2.2 Regla de producto

La pantalla principal debe responder:

```txt
qué puedo hacer
qué información hay
qué requiere atención
cuál es el siguiente paso
```

La arquitectura, seguridad, gates, contratos, fuentes internas y razones técnicas deben quedar en:

```txt
Academia
Ayuda contextual
Configuración avanzada autorizada
Documentación interna
Auditoría restringida
```

### 2.3 Reemplazos concretos

```txt
Editando (borrador local)          → Editando
Guardar cambios (con motivo)       → Guardar cambios
Cancelar (descarta el borrador)    → Cancelar
Default-deny                       → Disponible para cotizar / No disponible
Habilitado p/ Cotizador            → Disponible en Cotizador
Sección administrativa avanzada    → Tarifas y conocimiento
Borrar / desactivar                → Desactivar vinculación
```

El sistema seguirá pidiendo motivo en el flujo, pero no necesita convertir el nombre del botón en una explicación técnica.

### 2.4 Auditoría transversal requerida

Claude debe revisar todos los módulos y eliminar de la UI cliente términos como:

```txt
backend
Firebase
Firestore
LAB
mock
demo
smoke
localStorage
metadata-only
default-deny
gate
provider
runtime
bridge
fingerprint
colección interna
borrador local
```

No basta con revisar Aseguradoras.

---

## 3. Responsive real y no solo reglas CSS

### 3.1 Login

La candidata oculta completamente `.lg-left` bajo 860 px. Por eso la órbita desaparece en celular. Esto no es un fallo accidental: es el comportamiento actual del CSS.

Decisión:

- conservar una órbita móvil simplificada, compacta y visible;
- no mostrar el panel desktop completo;
- colocar la órbita o marca animada sobre el formulario;
- evitar que el login dependa de scroll horizontal o altura fija;
- validar teclado móvil, orientación vertical y horizontal.

### 3.2 Fichas, botones y tabs

La captura confirma:

- tabs con scroll horizontal difícil de descubrir;
- botones que pueden exceder el ancho;
- footer fijo con demasiadas acciones en una fila;
- contenido dentro de modal con doble scroll;
- campos de dos columnas que deben convertirse limpiamente a una;
- texto del banner que ocupa demasiado ancho.

Decisión:

- botones móviles a ancho completo o grupos apilados;
- barra de acciones sticky de máximo dos acciones principales;
- tabs convertidas en selector compacto o carrusel con indicador visible;
- cero scroll horizontal de página;
- tablas con vista alternativa en tarjetas;
- modales solo para acciones cortas;
- fichas largas como páginas completas.

### 3.3 Matriz obligatoria de prueba

```txt
360 x 800
390 x 844
412 x 915
768 x 1024
834 x 1194
1024 x 768
1366 x 768
1440 x 900
```

Cada módulo debe registrar:

```txt
sin overflow horizontal
botones accesibles
texto legible
modales dentro del viewport
teclado no tapa la acción principal
navegación y regreso funcionales
```

---

## 4. KPI con drill-down obligatorio

### 4.1 Hallazgo

Los KPI de Aseguradoras usan el mismo destino `#/aseguradoras`; por tanto no filtran, no explican el número y no permiten actuar.

### 4.2 Regla reusable

Todo KPI visible debe cumplir al menos una de estas acciones:

```txt
filtrar la lista relacionada
abrir detalle de registros
abrir tendencia o composición
mostrar pendientes y acción siguiente
```

Nunca debe ser una tarjeta decorativa.

### 4.3 Drill de Aseguradoras

```txt
Activas
→ filtra vinculadas activas y muestra país/productos/última revisión.

Con contacto principal
→ lista aseguradoras y contacto principal; permite ver las que faltan.

Con acceso disponible
→ lista plataformas por aseguradora, estado y última verificación.

Con documentación
→ lista documentos por aseguradora, tipo, vigencia y estado.

Requieren actualización
→ lista aseguradora + plataforma/documento/cuenta afectada + acción.
```

Cada KPI debe tener:

```txt
conteo
filtro aplicado visible
lista detallada
vacío honesto
acción para abrir ficha
volver al directorio conservando filtros
```

### 4.4 Auditoría transversal

Aplicar el mismo estándar a todos los módulos. Debe generarse inventario:

```txt
KPI
módulo
fuente de datos
acción al hacer clic
vista de detalle
estado vacío
permiso requerido
```

---

## 5. Ficha de Aseguradora como página completa

### 5.1 Decisión

La ficha actual es valiosa y debe conservarse, pero el modal no debe ser la experiencia principal.

Ruta sugerida sin alterar el router protegido:

```txt
#/aseguradoras?ficha=<aseguradoraId>
#/aseguradoras?nueva=1
```

La vista debe renderizarse dentro del host principal.

### 5.2 Comportamiento

- breadcrumb `Aseguradoras / Nombre`;
- botón `← Volver al directorio`;
- conservar filtros, búsqueda y posición de scroll;
- URL navegable y recargable;
- pestañas internas;
- modo lectura y edición;
- acciones sticky sin doble scroll;
- responsive completo;
- apertura desde búsqueda global, KPI, Cotizador, Comparativo y gestiones.

El modal puede conservarse únicamente para vista rápida, pero no para edición extensa.

### 5.3 Borrado

Eliminar el botón ambiguo `Borrar / desactivar` de la vista normal.

Usar:

```txt
Desactivar vinculación
```

El borrado físico excepcional debe quedar fuera del flujo normal, bajo administración reforzada y auditoría.

---

## 6. Accesos operativos y cuentas bancarias

### 6.1 Usuarios de plataformas

El nombre de usuario operativo sí puede mostrarse y copiarse según rol autorizado.

Campos:

```txt
plataforma
URL
usuario
estado de acceso
responsable
última verificación
Copiar usuario
Abrir plataforma
```

### 6.2 Contraseñas

No se deben almacenar ni renderizar contraseñas reales en el prototipo, seed, repositorio o frontend.

La necesidad operativa debe resolverse en Carril B mediante una bóveda segura:

```txt
credentialRef
rol autorizado
reautenticación
acción Copiar acceso
valor recuperado temporalmente desde backend
no persistir en DOM/store/logs
expiración inmediata
registro de quién accedió y por qué
```

La UX puede incluir `Copiar contraseña` para roles autorizados, pero el valor no puede venir del código ni del store del frontend. Como regla más segura, copiar sin mantener el secreto visible en pantalla.

Asesores no acceden a secretos salvo autorización explícita de Dirección y alcance específico.

### 6.3 Cuentas bancarias

Las cuentas bancarias sí forman parte del directorio operativo. En producción pueden mostrarse completas y copiarse a usuarios autorizados.

Requisitos:

```txt
número enmascarado por defecto
Ver número completo según permiso
Copiar número
Copiar instrucciones de pago
país
moneda
banco
tipo de cuenta
titular
uso
última verificación
vigencia
motivo/auditoría para cambios
```

El prototipo debe continuar usando datos ficticios. Los datos reales solo ingresan por Carril C y con alcance por rol.

---

## 7. Visor interno de documentos Drive

### 7.1 Decisión

Sí es viable y debe incluirse como experiencia principal, con fallback `Abrir en Drive`.

### 7.2 Flujo propuesto

```txt
Ficha de aseguradora
→ Documentos y Drive
→ seleccionar documento
→ visor dentro de Orbit 360
```

El visor debe mostrar:

```txt
nombre
tipo
versión
vigencia
fuente
estado de validación
visibilidad por rol
previsualización
Descargar, cuando esté permitido
Abrir en Drive
Historial de versiones
```

### 7.3 Arquitectura

Carril A:

- construir componente visual del visor;
- manejar estados `pendiente de conexión`, `sin permiso`, `no compatible`;
- usar referencias ficticias;
- no insertar enlaces privados reales.

Carril B:

- integración OAuth con Drive;
- Google Picker para seleccionar archivos;
- almacenar `fileId`, metadatos y referencia segura;
- recuperar/exportar contenido según permisos;
- respetar Shared Drives;
- registrar acceso.

### 7.4 Tipos

```txt
PDF       → visor PDF interno
imagen    → visor de imagen
Docs      → preview/export autorizado
Sheets    → preview o representación tabular autorizada
Slides    → preview autorizado
Office    → preview Drive o conversión autorizada
otros     → metadatos + Abrir en Drive
```

El iframe directo no debe ser la única estrategia porque permisos o políticas del archivo pueden impedirlo.

---

## 8. Cambios obligatorios para la próxima candidata

1. Limpieza transversal de copy técnico.
2. Login móvil con órbita compacta visible.
3. Auditoría responsive en todos los módulos.
4. KPI de Aseguradoras con drill real.
5. Inventario y corrección de KPI sin acción en toda la plataforma.
6. Ficha de Aseguradora como página principal con volver.
7. Modal únicamente como vista rápida opcional.
8. Usuarios de plataformas visibles/copiadles según permiso.
9. UX de credenciales preparada para bóveda, sin secretos frontend.
10. Cuentas bancarias completas/copiables con permiso en producción; ficticias en prototipo.
11. Visor interno de documentos Drive con fallback externo.
12. Actualizar Academia para enseñar estos flujos.
13. Entregar evidencia real móvil/tablet/desktop.
14. No tocar archivos protegidos.

---

## 9. Criterios de aceptación

```txt
1. No hay copy técnico en pantallas operativas.
2. La órbita aparece en login móvil en versión compacta.
3. No existe overflow horizontal en anchos objetivo.
4. Todos los KPI auditados tienen acción y detalle.
5. Aseguradora abre como página completa con regreso.
6. Los filtros del directorio se conservan al volver.
7. Usuario de plataforma puede copiarse según permiso.
8. Ninguna contraseña real vive en frontend, seed o repo.
9. Cuenta bancaria puede revelarse/copiarse con permiso en producción.
10. Documentos Drive pueden previsualizarse dentro de Orbit cuando el tipo y permisos lo permiten.
11. Existe fallback Abrir en Drive.
12. Academia y documentación quedan actualizadas.
13. Backend protegido permanece intacto.
```

## 10. Estado de carriles

Carril A: abierto por UX, responsive, KPI, navegación, visor y Academia.  
Carril B: posteriormente implementará bóveda, OAuth/Drive API, permisos reales y auditoría segura.  
Carril C: posteriormente cargará accesos, cuentas y documentos reales por fuentes separadas y trazables.
