import fs from 'node:fs';
import {spawnSync} from 'node:child_process';

const [cli,project,currentChannel,workspace,prefix='gi-']=process.argv.slice(2);
if(!cli||!project||!currentChannel||!workspace) throw new Error('USAGE: cli project currentChannel workspace [prefix]');

const run=(cmd,args,{allowFail=false}={})=>{
  const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:20*1024*1024});
  if(r.stdout)process.stdout.write(r.stdout);
  if(r.stderr)process.stderr.write(r.stderr);
  if(!allowFail&&r.status!==0)throw new Error('COMMAND_FAILED:'+cmd+' '+args.join(' ')+':'+r.status);
  return r;
};
const firebase=(args,opts)=>run(process.execPath,[cli,...args],opts);

const listed=firebase(['hosting:channel:list','--project',project,'--non-interactive','--json']);
let data;
try{data=JSON.parse(listed.stdout);}catch(e){throw new Error('CHANNEL_LIST_JSON_INVALID:'+e.message);}
const ids=new Set();
const walk=x=>{
  if(Array.isArray(x)){for(const v of x)walk(v);return;}
  if(!x||typeof x!=='object')return;
  let id=x.id||x.channelId;
  if(!id&&typeof x.name==='string'&&x.name.includes('/channels/'))id=x.name.split('/channels/')[1].split('/')[0];
  if(typeof id==='string')ids.add(id);
  for(const v of Object.values(x))walk(v);
};
walk(data);

const candidates=[...ids].filter(id=>id.startsWith(prefix)&&id!==currentChannel&&id!=='live').sort();
let deleted=0,referenced=0,deleteFailed=0;
for(const id of candidates){
  const grep=spawnSync('git',['-C',workspace,'grep','-Fq','-e',id,'--','.'],{encoding:'utf8'});
  if(grep.status===0){
    referenced++;
    console.log('PREVIEW_GC_KEEP_REFERENCED='+id);
    continue;
  }
  if(grep.status!==1)throw new Error('GIT_GREP_FAILED:'+id+':'+grep.status);
  console.log('PREVIEW_GC_DELETE_UNREFERENCED='+id);
  const d=firebase(['hosting:channel:delete',id,'--project',project,'--force','--non-interactive'],{allowFail:true});
  if(d.status===0)deleted++; else deleteFailed++;
}
console.log('PREVIEW_GC_CANDIDATES='+candidates.length);
console.log('PREVIEW_GC_REFERENCED='+referenced);
console.log('PREVIEW_GC_DELETED='+deleted);
console.log('PREVIEW_GC_DELETE_FAILED='+deleteFailed);
if(deleted<1)throw new Error('PREVIEW_GC_NO_SAFE_CHANNEL_DELETED');
