import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const allowedModes=new Set(['governance','i2','i3','i4a','i4b','i5','certified']);
const arg=process.argv.find(x=>x.startsWith('--mode='));
const mode=arg?arg.slice('--mode='.length):'governance';
if(!allowedModes.has(mode)) throw new Error('GRAVICENTRA_PREFLIGHT_MODE_INVALID:'+mode);

function run(cmd,args){
  const r=spawnSync(cmd,args,{stdio:'inherit',env:process.env});
  if(r.error) throw r.error;
  if(r.status!==0) throw new Error('GRAVICENTRA_PREFLIGHT_COMMAND_FAILED:'+cmd+' '+args.join(' ')+':'+String(r.status));
}

const node=process.execPath;
const controlPath='artifacts/orbit360-recovery/release-control/CONTROL_PLANE.json';
const control=JSON.parse(fs.readFileSync(controlPath,'utf8'));
const postI5=control.status==='PRODUCTION_ACCEPTED'||control.environmentState?.productionAccepted===true;
const preI5Guard='tools/gravicentra-control-plane-guard-v2.mjs';
const postI5Guard='tools/gravicentra-post-i5-control-plane-guard-v1.mjs';
const activeGuard=postI5?postI5Guard:preI5Guard;
const syntaxTargets=[
  preI5Guard,
  postI5Guard,
  'tools/gravicentra-mechanism-invariant-v2.mjs',
  'tools/gravicentra-evergreen-sources-invariant-v1.mjs',
  'tools/gravicentra-i4a-proof-registry-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-function-remediation-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs'
];
for(const p of syntaxTargets) run(node,['--check',p]);

run(node,[activeGuard,'--mode=governance']);
run(node,['tools/gravicentra-i4a-proof-registry-guard-v1.mjs']);
run(node,['tools/gravicentra-mechanism-invariant-v2.mjs']);
run(node,['tools/gravicentra-evergreen-sources-invariant-v1.mjs']);
run(node,['tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs']);
if(mode!=='governance') run(node,[activeGuard,'--mode='+mode]);
run('git',['diff','--exit-code']);

console.log('GRAVICENTRA_GOVERNANCE_PREFLIGHT=PASS');
console.log('PREFLIGHT_MODE='+mode);
console.log('CONTROL_STATUS='+control.status);
console.log('ACTIVE_CONTROL_GUARD='+activeGuard);
console.log('SAME_HEAD_GOVERNANCE_AND_GATE_GUARD=true');
console.log('PRODUCT_SOURCE_MUTATION=false');
console.log('PRODUCTION_ACCEPTED='+String(control.environmentState?.productionAccepted===true));
console.log('PRODUCTION_TOUCHED='+String(control.environmentState?.productionTouchedByRecovery===true));
console.log('CONTROLLED_DATA_TOUCHED='+String(control.environmentState?.dataTouchedByRecovery===true));
console.log('AUGUST_REFRESH='+String(control.environmentState?.augustRefresh||''));
