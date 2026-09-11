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
const syntaxTargets=[
  'tools/gravicentra-control-plane-guard-v2.mjs',
  'tools/gravicentra-mechanism-invariant-v2.mjs',
  'tools/gravicentra-evergreen-sources-invariant-v1.mjs',
  'tools/gravicentra-i4a-proof-registry-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-function-remediation-guard-v1.mjs',
  'tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs'
];
for(const p of syntaxTargets) run(node,['--check',p]);

run(node,['tools/gravicentra-control-plane-guard-v2.mjs','--mode=governance']);
run(node,['tools/gravicentra-i4a-proof-registry-guard-v1.mjs']);
run(node,['tools/gravicentra-mechanism-invariant-v2.mjs']);
run(node,['tools/gravicentra-evergreen-sources-invariant-v1.mjs']);
run(node,['tools/gravicentra-i4a-preview-remediation-invariant-v1.mjs']);
if(mode!=='governance') run(node,['tools/gravicentra-control-plane-guard-v2.mjs','--mode='+mode]);
run('git',['diff','--exit-code']);

console.log('GRAVICENTRA_GOVERNANCE_PREFLIGHT=PASS');
console.log('PREFLIGHT_MODE='+mode);
console.log('SAME_HEAD_GOVERNANCE_AND_GATE_GUARD=true');
console.log('PRODUCT_SOURCE_MUTATION=false');
console.log('PRODUCTION_TOUCHED=false');
console.log('DATA_TOUCHED=false');
