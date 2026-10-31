/* Pedidos reales: consulta Supabase, no localStorage. */
(async function(){
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 const box=document.getElementById("orders");
 if(!box)return;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const statuses=["Nuevo","Confirmado","Preparando","Listo","Entregado","Cancelado"];
 let lastIds="";
 let refreshing=false;let lastMarkup="";
 async function deliverPush(){
  try{
   const {data:{session}}=await db.auth.getSession();
   if(!session?.access_token)return;
   const response=await fetch(window.BRASA_SUPABASE.url+"/functions/v1/send-order-push",{
    method:"POST",headers:{"Authorization":"Bearer "+session.access_token,"apikey":window.BRASA_SUPABASE.publishableKey,"Content-Type":"application/json"},
    body:"{}"
   });
   if(!response.ok)console.warn("Push pendiente:",response.status,await response.text());
  }catch(err){console.warn("Push no enviado:",err.message)}
 }
 async function refresh(){
  if(refreshing)return;
  refreshing=true;
  try{
   const {data,error}=await db.from("orders").select("id,status,created_at,subtotal,restaurant_tables(number),order_items(product_name,quantity)").order("created_at",{ascending:false}).limit(100);
   if(error)throw error;
   const active=data.filter(p=>!["Entregado","Cancelado"].includes(p.status));
   document.getElementById("count-active").textContent=active.length;
   document.getElementById("count-ready").textContent=active.filter(p=>p.status==="Listo").length;
   document.getElementById("badge-pedidos").textContent=active.filter(p=>p.status==="Nuevo").length;
   const ids=active.filter(p=>p.status==="Nuevo").map(p=>p.id).sort().join(",");
   if(lastIds&&ids!==lastIds&&ids.split(",").some(id=>id&&!lastIds.split(",").includes(id))){
    document.getElementById("feedback").textContent="🔔 Nuevo pedido recibido en Supabase";
    if("Notification" in window&&Notification.permission==="granted")new Notification("Brasa & Corte · Nuevo pedido");
   }
   lastIds=ids;
   if(document.activeElement?.matches("[data-real-order-status]"))return;
   const markup=data.map(p=>'<article class="order"><div class="topline"><h3>Pedido #'+p.id+' · Mesa '+esc(p.restaurant_tables?.number??"?")+'</h3><span class="badge">'+esc(p.status)+'</span></div><p>'+esc((p.order_items||[]).map(x=>x.quantity+" × "+x.product_name).join(" · "))+'</p><p class="count">'+new Date(p.created_at).toLocaleString("es-AR")+' · $'+Number(p.subtotal).toLocaleString("es-AR")+'</p><label>Estado del pedido <select data-real-order-status="'+p.id+'">'+statuses.map(st=>'<option '+(st===p.status?'selected':'')+'>'+st+'</option>').join("")+'</select></label></article>').join("")||'<p class="empty">No hay pedidos reales todavía.</p>';
   if(markup!==lastMarkup){box.innerHTML=markup;lastMarkup=markup;}
  }catch(err){document.getElementById("feedback").textContent="⚠️ Error al cargar pedidos reales: "+err.message}
  finally{refreshing=false}
 }
 box.addEventListener("change",async e=>{
  const el=e.target.closest("[data-real-order-status]");if(!el)return;
  el.disabled=true;
  const {error}=await db.rpc("staff_update_order_status",{p_order_id:Number(el.dataset.realOrderStatus),p_status:el.value});
  if(error)alert("No se pudo cambiar el estado: "+error.message);
  if(!error)await deliverPush();
  el.disabled=false;await refresh();
 });
 // El render de la demo sobrescribe el listado: restaurarlo periódicamente.
 await refresh();
 setInterval(()=>{if(!document.hidden)refresh()},3500);
 setInterval(()=>{if(!document.hidden)deliverPush()},20000);
 document.getElementById("refresh")?.addEventListener("click",()=>setTimeout(refresh,150));
 document.querySelector('[data-view="pedidos"]')?.addEventListener("click",()=>setTimeout(refresh,30));
})();