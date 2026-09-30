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

const channels=new Map();
const walk=x=>{
  if(Array.isArray(x)){for(const v of x)walk(v);return;}
  if(!x||typeof x!=='object')return;
  let id=x.id||x.channelId;
  if(!id&&typeof x.name==='string'&&x.name.includes('/channels/'))id=x.name.split('/channels/')[1].split('/')[0];
  if(typeof id==='string'){
    const prev=channels.get(id)||{};
    channels.set(id,{...prev,...x,id});
  }
  for(const v of Object.values(x))walk(v);
};
walk(data);

const sortableTime=x=>{
  const vals=[x.expireTime,x.updateTime,x.createTime,x.release?.releaseTime,x.release?.createTime].filter(Boolean);
  for(const v of vals){const t=Date.parse(v);if(Number.isFinite(t))return t;}
  const m=String(x.id||'').match(/(\d{8,})/g);return m?Number(m[m.length-1]):Number.MAX_SAFE_INTEGER;
};

const candidates=[...channels.values()]
  .filter(x=>x.id.startsWith(prefix)&&x.id!==currentChannel&&x.id!=='live')
  .sort((a,b)=>sortableTime(a)-sortableTime(b)||a.id.localeCompare(b.id));

let deleted=0,deleteFailed=0,kept=0;
for(const ch of candidates){
  // Historical receipts keep URL/lineage evidence in Git; the physical Hosting channel itself
  // is ephemeral and must not exhaust the finite Firebase Preview-channel quota.
  // Fail closed to this recovery namespace only and delete at most one oldest channel per retry.
  if(!ch.id.startsWith(prefix)){kept++;continue;}
  console.log('PREVIEW_GC_DELETE_OLDEST_RECOVERY_CHANNEL='+ch.id);
  const d=firebase(['hosting:channel:delete',ch.id,'--project',project,'--force','--non-interactive'],{allowFail:true});
  if(d.status===0){deleted++;break;}
  deleteFailed++;
}
console.log('PREVIEW_GC_CANDIDATES='+candidates.length);
console.log('PREVIEW_GC_KEPT='+kept);
console.log('PREVIEW_GC_DELETED='+deleted);
console.log('PREVIEW_GC_DELETE_FAILED='+deleteFailed);
if(deleted<1)throw new Error('PREVIEW_GC_NO_SAFE_RECOVERY_CHANNEL_DELETED');
