/* Sincronización de mesas reales con Supabase; los pedidos se gestionan por separado. */
(async function(){
 "use strict";
 const admin=document.documentElement.dataset.staffRole==="admin";
 const KEY="brasa-admin-demo-v1";
 const banner=document.createElement("div");
 banner.id="supabase-sync-status";
 banner.style.cssText="position:fixed;bottom:12px;right:12px;z-index:9999;background:#26191e;border:1px solid #b84b4b;border-radius:10px;padding:10px 15px;color:white;font:13px system-ui;max-width:310px;box-shadow:0 5px 20px #0008";
 banner.textContent="🔄 Conectando mesas con Supabase…";
 document.body.appendChild(banner);
 const notify=s=>{banner.textContent=s};
 let client,baseline=new Map(),ready=false,busy=false;
 try{
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  client=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
  const {data:{user}}=await client.auth.getUser();
  if(!user)throw Error("Sesión no iniciada");
  const {data:staff,error:roleError}=await client.from("staff").select("role,active").eq("user_id",user.id).maybeSingle();
  if(roleError||!staff?.active||(admin&&staff.role!=="admin"))throw Error("Sin permisos");
 }catch(err){notify("⚠️ Sin conexión con Supabase: "+err.message);return}
 const snapshot=arr=>new Map(arr.map(t=>[Number(t.number),{number:Number(t.number),status:t.status,enabled:!!t.enabled}]));
 function local(){
  try{const s=JSON.parse(localStorage.getItem(KEY));return s&&Array.isArray(s.mesas)?s:{mesas:[],pedidos:[],productos:[],solicitudesCuenta:[]}}catch{return {mesas:[],pedidos:[],productos:[],solicitudesCuenta:[]}}
 }
 function project(t,old){
  return {...(old||{}),id:Number(t.number),estado:t.status,habilitada:!!t.enabled,zona:old?.zona||"Adentro"};
 }
 async function fetchTables(){
  const {data,error}=await client.from("restaurant_tables").select("number,status,enabled").order("number");
  if(error)throw error;
  return data;
 }
 async function pull(){
  if(busy)return;
  try{
   const remote=await fetchTables(),saved=local();
   if(!saved){notify("⚠️ No se pudo leer el almacenamiento local.");return}
   const byId=new Map(saved.mesas.map(m=>[Number(m.id),m]));
   saved.mesas=remote.map(t=>project(t,byId.get(Number(t.number))));
   const oldTables=JSON.stringify(local().mesas);
   if(oldTables!==JSON.stringify(saved.mesas)){
    localStorage.setItem(KEY,JSON.stringify(saved));
    if(admin){state.mesas=saved.mesas;render()}else{state=saved;render()}
   }
   baseline=snapshot(remote);
   ready=true;
   notify("🟢 Mesas sincronizadas con Supabase ("+remote.length+")");
  }catch(err){notify("⚠️ Error al leer mesas: "+err.message)}
 }
 async function push(){
  if(!ready||busy)return;
  busy=true;
  try{
   const s=local();
   if(!s)return;
   const current=new Map(s.mesas.map(m=>[Number(m.id),{number:Number(m.id),status:m.estado||"Libre",enabled:m.habilitada===true||m.estado==="Ocupada"}]));
   for(const [num,t] of current){
    if(!Number.isInteger(num)||num<1||num>999)continue;
    const old=baseline.get(num);
    if(!old){
     if(!admin)throw Error("Solo administración puede crear mesas");
     const {error}=await client.from("restaurant_tables").insert(t);
     if(error)throw error;
    }else if(old.status!==t.status||old.enabled!==t.enabled){
     const {error}=await client.rpc("set_table_state",{p_number:num,p_status:t.status,p_enabled:t.enabled});
     if(error)throw error;
    }
   }
   if(admin)for(const [num] of baseline)if(!current.has(num)){
    const {error}=await client.from("restaurant_tables").delete().eq("number",num);
    if(error)throw error;
   }
   const remote=await fetchTables();
   baseline=snapshot(remote);
   notify("🟢 Cambios de mesas guardados en Supabase");
  }catch(err){notify("⚠️ No se sincronizó el cambio: "+err.message)}
  finally{busy=false;setTimeout(pull,250)}
 }
 // Los paneles conservan su interfaz y comportamiento; solo se sincronizan mesas.
 const originalSave=save;
 save=function(...args){const result=originalSave.apply(this,args);if(ready)setTimeout(push,0);return result};
 if(!admin){
  // El generador QR antiguo guarda sin llamar a save(): detectar ese cambio.
  const tiles=document.getElementById("tiles");
  if(tiles)tiles.addEventListener("click",e=>{
   if(e.target.closest("[data-qr-table]"))setTimeout(push,50);
  });
 }
 await pull();
 setInterval(()=>{if(!document.hidden&&!busy)pull()},7000);
})();
