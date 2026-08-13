# Reporte de avance verificable — Aseguradoras OP-2 v1.220

Fecha: 2026-07-13  
Rama: `ays/backend-tenant-lab-v99-20260703`  
PR: #5 draft/open  
Sin merge, deploy, producción ni escritura de datos reales

## 1. Estado modular

```txt
CRM OP-1:
  funcional y visualmente cerrado · 10/10

Aseguradoras OP-2:
  cierre funcional implementado
  CI estático v1.220: VERDE
  evidencia visual reutilizable · 12/15
  pendiente visual · 3 vistas de Plataformas
```

## 2. Cambios funcionales v1.220

### Identidad antes de actualizar

El importador diferencia:

```txt
identidad canónica exacta:
  puede continuar como propuesta de actualización

coincidencia probable:
  requiere validación
  queda bloqueada
  no se aplica automáticamente
```

Casos cubiertos:

- versiones numéricas;
- diferencias de una letra;
- inclusión parcial;
- coincidencia con directorio existente;
- separación por país;
- red o aliado separado de aseguradora directa.

### Mensajes operativos

La UI no muestra códigos internos ni copy técnico durante el importador.

Se incorporó:

- mapa de errores conocidos;
- respuesta segura para errores desconocidos;
- sanitización de mensajes tardíos;
- uso de `textContent`;
- bloqueo de aplicación con mensaje operativo;
- cero cambios en backend protegido.

### Cuarentena y revisión

```txt
Cuarentena:
  antes del parser
  sin valores en reporte
  sin escrituras

Revisión preliminar:
  captureSecure=false

Importación preparada:
  captura protegida por defecto
  solo sobre hojas permitidas
```

## 3. CI verificable

La ejecución previa de `b025cc9` aprobó todos los contratos funcionales y falló únicamente por una comparación textual del reanudador.

La corrección `6ad2bb8` reemplazó esa comparación por controles estructurales:

- funciones;
- IDs exactos de escenarios;
- booleanos JSONL;
- presencia de capturas;
- smoke focalizado;
- ausencia del smoke completo;
- sincronización `ff-only`;
- validadores v1.220;
- ausencia de commit, push o deploy.

Para eliminar la dependencia de correos, el workflow publica un estado verificable sobre el commit.

Commit verificado:

```txt
52dbe7a1f92423eb0bca67b92dfe689f94c9532a
```

Contexto:

```txt
orbit360/aseguradoras-op2-v1220
```

Resultado:

```txt
success
```

Contratos aprobados:

```txt
sintaxis de validadores
acceso y roles
importador y separación de fuente
copy operativo y gate de escritura
cuarentena de hojas
identidad y control de duplicados
UX del directorio y recursos
migración y permisos
Academia y responsive
sintaxis, almacenamiento y baseline protegido
política de recursos
prueba de cuarentena
prueba de versiones y actualizaciones probables
prueba de copy operativo
harness focalizado de Plataformas
reanudador JSONL
backend protegido
gate 0% manual
```

## 4. Gate local final habilitado

Archivo:

```txt
tools/orbit360-run-aseguradoras-op2-plataformas-resume.ps1
```

El gate final:

1. sincroniza la rama por avance rápido;
2. integra el index con backup y verificación;
3. ejecuta contratos v1.220;
4. verifica CRM 10/10 y Aseguradoras 12/15 mediante JSONL + capturas;
5. selecciona puerto libre;
6. ejecuta únicamente tres Plataformas;
7. combina el cierre 15/15.

No cierra otras aplicaciones, no repite escenarios aprobados y no hace deploy, commit ni push.

## 5. Carriles

### Carril A

- Academia actualizada a v1.220.
- Patrón Claude consolidado.
- Mensajes operativos y actualización exacta enseñados por rol.
- Progreso y certificados preservados.

### Carril B

- Backend protegido intacto.
- Cuarentena, copy, identidad y migración validados.
- CI dividido por contratos y confirmado verde.
- Gate local automatizado y habilitado.

### Carril C

- Preflight GT/CO completado sin escrituras.
- Guatemala y Colombia permanecen separados.
- Coincidencias probables y entidad aliada identificadas como bloqueos.
- Hojas ajenas permanecen en cuarentena.
- Dry-run parser GT y luego CO pendientes.

## 6. Pendientes reales

```txt
1. Ejecutar una sola vez las tres Plataformas.
2. Cerrar Aseguradoras 15/15.
3. Dry-run Guatemala sin escritura.
4. Resolver bloqueos.
5. Dry-run Colombia sin escritura.
6. Continuar Cotizador + Comparativo.
```
