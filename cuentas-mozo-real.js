(async()=>{
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 const box=document.getElementById("cuentas-mozo"),badge=document.getElementById("badge-cuentas");
 if(!box||!badge)return;
 let previous=null;let refreshing=false;let lastMarkup="";
 async function refresh(){
  if(refreshing)return;
  refreshing=true;
  try{
  const {data,error}=await db.from("bill_requests").select("id,created_at,restaurant_tables(number)").eq("status","Pendiente").order("created_at",{ascending:true});
  if(error){console.warn("Cuentas:",error.message);const feedback=document.getElementById("feedback");if(feedback)feedback.textContent="⚠️ Error al cargar cuentas: "+error.message;return}
  badge.textContent=data.length;
  const ids=data.map(x=>x.id).join(",");
  if(previous!==null&&ids!==previous&&data.some(x=>!previous.split(",").includes(String(x.id)))){
   const feedback=document.getElementById("feedback");if(feedback)feedback.textContent="🧾 Nueva solicitud de cuenta";
   if("Notification" in window&&Notification.permission==="granted")try{new Notification("Brasa & Corte",{body:"🧾 Nueva solicitud de cuenta"})}catch{}
  }
  previous=ids;
  const markup=data.map(x=>'<article class="order"><h3>🧾 Mesa '+Number(x.restaurant_tables?.number||0)+'</h3><p class="count">'+new Date(x.created_at).toLocaleTimeString("es-AR")+'</p><button type="button" class="btn primary" data-real-bill="'+x.id+'">Marcar atendida</button></article>').join("")||'<p class="empty">No hay cuentas solicitadas.</p>';
  if(markup!==lastMarkup){box.innerHTML=markup;lastMarkup=markup;}
  }catch(err){console.warn("Cuentas:",err)}finally{refreshing=false}
 }
 box.addEventListener("click",async e=>{
  const b=e.target.closest("[data-real-bill]");if(!b)return;
  e.stopImmediatePropagation();b.disabled=true;
  const {error}=await db.rpc("handle_table_bill",{p_request_id:Number(b.dataset.realBill)});
  if(error){alert("No se pudo atender la cuenta: "+error.message);b.disabled=false}
  else {lastMarkup="";await refresh();setTimeout(refresh,250)}
 },true);
 await refresh();setInterval(()=>{if(!document.hidden)refresh()},4000);
})();