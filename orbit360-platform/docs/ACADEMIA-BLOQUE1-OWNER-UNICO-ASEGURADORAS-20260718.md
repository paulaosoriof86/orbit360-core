# Academia Orbit 360 · Owner único de Aseguradoras

El Router carga los contratos indispensables para iniciar la plataforma. Los bridges de Aseguradoras son consumidores: no deben inyectar configuración tenant ni runtimes protegidos al evaluarse el archivo.

Una carga de módulo es segura cuando ocurre después del bootstrap, desde `mod.render`, y no compite con la cola canónica. La evidencia debe distinguir request, HTTP 200, parseo, ejecución, owner listo y avance al contrato siguiente.

Este caso se clasifica como `FUNCTIONAL_DEFECT` de ownership, no como problema de datos, Auth, Store o renderer.
