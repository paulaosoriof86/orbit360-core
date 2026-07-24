(function(){
  'use strict';
  window.Orbit=window.Orbit||{};
  window.Orbit.Academia=window.Orbit.Academia||[];
  window.Orbit.Academia.push(Object.freeze({
    version: '1.237',
    id: 'm2-existing-project-reconciled-20260724',
    title: 'Cerrar una corrección de pipeline con evidencia read-only',
    classification: 'PIPELINE_MECHANISM_FAILURE',
    projectIdMatches: true,
    existingProjectReused: true,
    newProjectRequired: false,
    authReadable: true,
    membershipReadable: true,
    activeMembershipLinkedToAuth: true,
    rulesChanged: false,
    operationalWrites: 0,
    runtimeExecuted: false,
    lesson: 'La ausencia de un nombre nuevo de secret no demuestra ausencia de infraestructura. La corrección correcta reconcilia primero el proyecto, Auth, membership y aliases existentes, sin alterar Rules ni datos.',
    roles: ['Dirección','Operativo','Asesor'],
    claudeClassification: 'BACKEND_PROTEGIDO_NO_CLAUDE',
    academyImpact: 'ACADEMIA_ACTUALIZAR'
  }));
})();
