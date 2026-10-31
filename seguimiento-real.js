/* Seguimiento real de pedidos y cierre de carta cuando el QR se invalida.
   Notificaciones del navegador: funcionan con la página abierta; push en segundo plano requiere infraestructura adicional. */
(async function(){
 const token=new URLSearchParams(location.search).get("token");
 if(!token||!window.BRASA_SUPABASE)return;
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 const key="brasa-qr-pedido-"+token.slice(0,20);
 const states=new Map();
 let invalid=false, checking=false, orderId=Number(sessionStorage.getItem(key))||null;
 const detail=document.getElementById("seguimiento-detalle");
 const area=document.getElementById("seguimiento-pedido");
 const notifyButton=document.getElementById("activar-notificaciones");
 const permission=document.getElementById("permiso-notificaciones");
 const form=document.getElementById("formulario");
 const overlay=document.createElement("div");
 overlay.id="qr-expirado";
 overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:#130d0f;color:white;display:none;align-items:center;justify-content:center;text-align:center;padding:25px;font:17px system-ui";
 overlay.innerHTML='<div style="max-width:460px"><h1>🔒 Mesa cerrada</h1><p>Este QR ya no está habilitado. Pedile al mozo un nuevo código para acceder a la carta y realizar pedidos.</p></div>';
 document.body.appendChild(overlay);
 function closeMenu(){
  if(invalid)return;
  invalid=true;overlay.style.display="flex";
  document.getElementById("dialogo")?.close();
  document.getElementById("ver-pedido").disabled=true;
  if(form)form.querySelectorAll("button,input,select,textarea").forEach(x=>x.disabled=true);
 }
 function showTracking(){
  if(!orderId)return;
  area.hidden=false;
  notifyButton.hidden=!("Notification" in window)||Notification.permission==="granted";
  permission.textContent=!("Notification" in window)?"Tu navegador no admite notificaciones.":Notification.permission==="granted"?"Notificaciones habilitadas mientras tengas esta página abierta.":Notification.permission==="denied"?"Las notificaciones están bloqueadas en el navegador.":"Activá los avisos para conocer los cambios de estado con esta página abierta.";
 }
 function alertStatus(status){
  const message=status==="Confirmado"?"Tu pedido fue confirmado.":status==="Preparando"?"Están preparando tu pedido.":status==="Listo"?"¡Tu pedido está listo!":status==="Entregado"?"Tu pedido fue entregado.":status==="Cancelado"?"Tu pedido fue cancelado.":"";
  if(!message)return;
  const toast=document.createElement("div");
  toast.textContent="🔔 "+message;
  toast.style.cssText="position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:999998;background:#2b1418;color:white;border:2px solid #d51f35;border-radius:12px;padding:16px;max-width:90vw;text-align:center;font:600 16px system-ui";
  document.body.appendChild(toast);setTimeout(()=>toast.remove(),7000);
  if("Notification" in window&&Notification.permission==="granted")try{new Notification("Brasa & Corte · Pedido #"+orderId,{body:message,tag:"brasa-"+orderId+"-"+status})}catch{}
 }
 async function check(){
  if(checking||invalid)return;
  checking=true;
  try{
   const {data:mesa,error}=await db.rpc("validate_table_qr",{p_token:token});
   if(error)throw error;
   if(!Number.isInteger(mesa)||mesa<1){closeMenu();return}
   if(!orderId)return;
   const {data:status,error:statusError}=await db.rpc("qr_order_status",{p_token:token,p_order_id:orderId});
   if(statusError)throw statusError;
   if(!status)return;
   detail.textContent="Pedido #"+orderId+" · Mesa "+mesa+" · Estado: "+status;
   showTracking();
   const prev=states.get(orderId);
   states.set(orderId,status);
   if(prev&&prev!==status)alertStatus(status);
  }catch(err){console.warn("No se pudo consultar el seguimiento:",err.message)}
  finally{checking=false}
 }
 notifyButton.addEventListener("click",async()=>{
  if(!("Notification" in window))return;
  try{await Notification.requestPermission()}catch{}
  showTracking();
 });
 // Captura la confirmación de un pedido real, sin alterar el envío existente.
 const originalShow=HTMLDialogElement.prototype.showModal;
 HTMLDialogElement.prototype.showModal=function(...args){
  if(this.id==="dialogo"){
   const match=document.getElementById("estado-copia")?.textContent.match(/Pedido #(\d+) registrado correctamente/);
   if(match){orderId=Number(match[1]);sessionStorage.setItem(key,String(orderId));states.delete(orderId);showTracking();setTimeout(check,200)}
  }
  return originalShow.apply(this,args);
 };
 // Escuchar el pedido confirmado sin depender de modificar APIs nativas.\n window.addEventListener("brasa:pedido-creado",e=>{\n   orderId=Number(e.detail?.id);\n   if(!Number.isInteger(orderId))return;\n   sessionStorage.setItem(key,String(orderId));\n   states.set(orderId,"Nuevo");\n   showTracking();\n   check();\n });\n if(orderId)showTracking();
 await check();
 setInterval(()=>{if(!document.hidden)check()},4000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)check()});
 window.addEventListener("pageshow",()=>check());
})();