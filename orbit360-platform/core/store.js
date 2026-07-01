/* ============================================================
   CXOrbia · Session + event bus + persistence
   ============================================================ */
window.CX = window.CX || {};

/* ---------- Event bus ---------- */
CX.bus = (function(){
  const map={};
  return {
    on(ev,fn){(map[ev]=map[ev]||[]).push(fn);},
    emit(ev,data){(map[ev]||[]).forEach(fn=>{try{fn(data);}catch(e){console.warn(e);}});},
  };
})();

/* ---------- Session ---------- */
CX.session = {
  role:null,            // 'admin' | 'shopper'
  user:null,            // {name, role, shopperId}
  view:null,            // active module id
  load(){
    try{
      const s=JSON.parse(localStorage.getItem('cx_session')||'null');
      if(s){this.role=s.role;this.user=s.user;this.view=s.view;}
    }catch(e){}
    try{
      const pid=localStorage.getItem('cx_project');
      if(pid&&CX.data.projects.some(p=>p.id===pid))CX.data.currentProjectId=pid;
    }catch(e){}
  },
  save(){
    try{localStorage.setItem('cx_session',JSON.stringify({role:this.role,user:this.user,view:this.view}));}catch(e){}
    try{localStorage.setItem('cx_project',CX.data.currentProjectId);}catch(e){}
  },
  clear(){ this.role=null;this.user=null;this.view=null; try{localStorage.removeItem('cx_session');}catch(e){} },
};

/* persist project changes */
CX.bus.on('project',()=>CX.session.save());
