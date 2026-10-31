/* Panel del mozo: mesas y estados desde Supabase. Sin datos demo ni localStorage. */
"use strict";
let selectedTable="";
const $=id=>document.getElementById(id);
const say=message=>{const el=$("feedback");if(el)el.textContent=message};
const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
(async()=>{
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 let tables=[],loading=false,writing=false,loaded=false;
 const banner=document.createElement("div");
 banner.id="supabase-sync-status";
 banner.style.cssText="position:fixed;bottom:12px;right:12px;z-index:9999;background:#26191e;border:1px solid #b84b4b;border-radius:10px;padding:10px 15px;color:white;font:13px system-ui;max-width:310px;box-shadow:0 5px 20px #0008;pointer-events:none";
 document.body.appendChild(banner);
 const status=text=>{banner.textContent=text};
 const group=(zone,qr)=>{
  const subset=tables.filter(t=>(t.zone||"Adentro")===zone);
  return '<div class="zone"><h3>'+zone+' <span class="count">('+subset.length+')</span></h3><div class="mesa-grid">'+subset.map(t=>{
   const reserved=t.status==="Reservada",enabled=t.enabled===true,occupied=t.status==="Ocupada";
   const label=reserved?"Reservada":enabled?"Habilitada":"Deshabilitada";
   return '<button type="button" class="tile '+(reserved?"reserved":enabled?"on":"")+'" '+(qr?"data-qr-table":"data-toggle-table")+'="'+t.number+'" aria-label="Mesa '+t.number+', '+label+'"><span>'+t.number+'</span><small>'+label+'</small><span class="table-strip '+(occupied?"occupied":reserved?"reserved-strip":"")+'">'+escapeHtml(t.status)+'</span></button>';
  }).join("")+'</div></div>';
 };
 function render(){
  $("mesa-controls").innerHTML=group("Adentro",false)+group("Afuera",false);
  // Refrescar también las mesas dentro del diálogo de QR, sin cerrarlo.
  // Evitar reemplazar el botón pulsado mientras se genera el código.
  const qrBusy=$("tiles").querySelector('[aria-busy="true"]');
  if(!qrBusy)$("tiles").innerHTML=group("Adentro",true)+group("Afuera",true);
  $("count-tables").textContent=tables.filter(t=>t.status==="Ocupada").length;
  $("updated").textContent="Actualizado: "+new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
 }
 async function refresh(force=false){
  if(loading||writing)return;
  loading=true;
  try{
   const {data,error}=await db.from("restaurant_tables").select("id,number,status,enabled,zone").order("number");
   if(error)throw error;
   const next=data||[];
   if(!loaded||JSON.stringify(tables)!==JSON.stringify(next)){tables=next;render()}
   loaded=true;status("🟢 Mesas sincronizadas con Supabase ("+tables.length+")");
  }catch(err){status("⚠️ Error al cargar mesas: "+err.message);if(force)say("No se pudieron actualizar las mesas: "+err.message)}
  finally{loading=false}
 }
 async function changeTable(number,enabled){
  if(writing)return;
  const t=tables.find(x=>x.number===number);
  if(!t)return;
  writing=true;
  try{
   if(!enabled){
    const {data:orders,error:ordersError}=await db.from("orders").select("id").eq("table_id",t.id).not("status","in",'(Entregado,Cancelado)').limit(1);
    if(ordersError)throw ordersError;
    if(orders?.length)throw Error("Esta mesa tiene pedidos activos. Terminá los pedidos antes de liberarla.");
   }
   const {error}=await db.rpc("set_table_state",{p_number:number,p_status:enabled?"Ocupada":"Libre",p_enabled:enabled});
   if(error)throw error;
   if(!enabled){
    const {error:revokeError}=await db.rpc("revoke_table_qr",{p_table_number:number});
    if(revokeError)console.warn("No se pudo revocar el QR:",revokeError.message);
   }
   say("Mesa "+number+(enabled?" habilitada y ocupada.":" liberada."));
  }catch(err){say("⚠️ "+err.message)}
  finally{writing=false;await refresh(true)}
 }
 document.addEventListener("brasa:table-updated",e=>{
  const {number,status:nextStatus,enabled}=e.detail||{};
  const table=tables.find(t=>t.number===Number(number));
  if(table){table.status=nextStatus;table.enabled=enabled;render()}
  refresh(true);
 });
 document.addEventListener("click",e=>{
  const button=e.target.closest("button");
  if(!button)return;
  if(button.dataset.view){
   const view=button.dataset.view;
   document.querySelectorAll("[data-view]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.view===view)));
   ["mesas","pedidos","avisos"].forEach(id=>$(id+"-view").classList.toggle("hide",id!==view));
  }
  if(button.dataset.toggleTable){
   const number=Number(button.dataset.toggleTable),table=tables.find(t=>t.number===number);
   if(table)changeTable(number,!(table.enabled&&table.status==="Ocupada"));
  }
 });
 $("generate-qr").addEventListener("click",()=>{
  $("tiles").innerHTML=group("Adentro",true)+group("Afuera",true);
  $("qr-result").classList.add("hide");
  $("qr-dialog").showModal();
 });
 $("close-qr").addEventListener("click",()=>$("qr-dialog").close());
 $("qr-dialog").addEventListener("click",e=>{if(e.target===$("qr-dialog"))$("qr-dialog").close()});
 $("download-qr").addEventListener("click",()=>{
  const img=$("qr-code").querySelector("canvas")||$("qr-code").querySelector("img");
  if(!img){say("Generá primero el QR.");return}
  const a=document.createElement("a");a.download="brasa-mesa-"+selectedTable+".png";a.href=img.tagName==="CANVAS"?img.toDataURL("image/png"):img.src;a.click();
 });
 $("refresh").addEventListener("click",()=>{refresh(true);say("Actualizando datos de Supabase…")});
 await refresh(true);
 setInterval(()=>{if(!document.hidden)refresh()},7000);
})();
