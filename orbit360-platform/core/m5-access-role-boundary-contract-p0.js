/* Orbit 360 · M5 Access role/session boundary · static contract */
(function(){'use strict';window.Orbit=window.Orbit||{};
var VERSION='5.0.2-access-static-20260728',STATUS='M5_ACCESS_ROLE_BOUNDARY_STATIC_READY';
function n(v){return Number(v||0);}function build(input){input=input||{};var e=[],x=input.behavior||{},i=input.integration||{},w=input.writes||{};
 if(x.productProjectionAccepted!==true||x.assignedRolesOnly!==true||x.canonicalActiveRolePreserved!==true||x.unassignedRoleRejected!==true||x.membershipAdvisorOnly!==true)e.push('product_projection_boundary_invalid');
 if(x.labMissingProjectionFailClosed!==true||n(x.labMissingProjectionAllowedRoles)!==0||x.labLegacyRoleIgnored!==true||x.labLegacyAdvisorIgnored!==true)e.push('lab_fail_closed_invalid');
 if(x.superAdminAliasVisualOnly!==true||x.adminTenantAliasVisualOnly!==true||x.unknownRoleDenied!==true)e.push('role_alias_boundary_invalid');
 if(x.demoCompatibilityPreserved!==true)e.push('demo_compatibility_invalid');
 if(i.ownerLoadedBeforeRouter!==true||i.taxonomyLoadedBeforeOwner!==true||i.selectorUsesAllowedRoles!==true||i.selectorUsesRoleLabel!==true||i.selectorDisablesWithoutMembership!==true)e.push('selector_integration_invalid');
 if(i.enumeratesAllGlobalRoles===true||i.hardcodedAdvisorId===true)e.push('legacy_selector_not_removed');
 if(i.ownerAssetPresent!==true||i.ownerSyntaxValid!==true||i.indexSyntaxStructureValid!==true)e.push('asset_integration_invalid');
 if(n(w.backendWrites)!==0||n(w.membershipWrites)!==0||n(w.operationalWrites)!==0)e.push('writes_forbidden');
 if(input.browser||input.firestoreRead||input.secrets||input.deploy||input.production||input.policies||input.mergeMain)e.push('forbidden_capability_used');
 if(input.containsPII!==false||input.containsSecrets!==false)e.push('sanitization_required');
 var ok=e.length===0;return{ok:ok,status:ok?STATUS:'SECURITY_FAILURE',contractVersion:VERSION,approvalReadyForPostAccessReadiness:ok,runtimeSmokeAuthorized:false,errors:e,containsPII:false,containsSecrets:false};}
window.Orbit.m5AccessRoleBoundaryP0=Object.freeze({VERSION:VERSION,STATUS:STATUS,build:build});})();
