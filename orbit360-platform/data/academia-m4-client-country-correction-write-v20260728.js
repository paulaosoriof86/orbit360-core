/* Orbit 360 Academia · M4 61-client GT/GTQ atomic correction write */
(function(){
'use strict';window.Orbit=window.Orbit||{};Orbit.academiaDelta=Orbit.academiaDelta||[];
Orbit.academiaDelta.push({id:'m4-client-country-correction-write-v20260728',classification:'ACADEMIA_ACTUALIZAR',roles:['direccion','operativo','superadmin'],concepts:['Una autorización de escritura debe ser independiente del dry-run','La selección debe reconstruirse y seguir siendo exacta antes del commit','Snapshot durable + auditoría append-only + readback forman el cierre de una corrección masiva'],rules:['Solo 61 clientes previamente validados reciben pais=GT y moneda=GTQ','353 clientes fuera del lote deben conservar digest idéntico','Aseguradoras, overlay, configuración y memberships no se modifican','Un fallo post-write activa rollback exacto desde 61 snapshots','Pólizas permanecen bloqueadas hasta solicitar y recibir su fuente real específica']});
})();
