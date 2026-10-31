/* Chrome Android Web Push: suscripción vinculada a un pedido real. */
(async()=>{
 const token=new URLSearchParams(location.search).get("token");if(!token)return;
 const publicKey="BGocUWFN9P_4kfEszrF_YsN2GJw3-DYDbsVViVCA3S16A8SLwsiiTSt8Zst0kIxoQvLJYx5Z_gNeNbOnIdqa88E";
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 let orderId=Number(sessionStorage.getItem("brasa-qr-pedido-"+token.slice(0,20)))||null;
 const button=document.getElementById("activar-notificaciones");
 const label=document.getElementById("permiso-notificaciones");
 const decode=str=>{const padded=(str+"=".repeat((4-str.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/");return Uint8Array.from(atob(padded),c=>c.charCodeAt(0))};
 const b64=buffer=>btoa(String.fromCharCode(...new Uint8Array(buffer)));
 const url64=buffer=>b64(buffer).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
 async function subscribe(){
  if(!orderId){label.textContent="Primero realizá un pedido.";return}
  if(!("serviceWorker" in navigator)||!("PushManager" in window)||!("Notification" in window)){label.textContent="Este navegador no admite notificaciones push.";return}
  try{
   const permission=await Notification.requestPermission();
   if(permission!=="granted"){label.textContent="Habilitá las notificaciones de Chrome en Android.";return}
   const reg=await navigator.serviceWorker.register("./sw.js",{scope:"./"});
   const ready=await navigator.serviceWorker.ready;
   let sub=await ready.pushManager.getSubscription();
   if(!sub)sub=await ready.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(publicKey)});
   const json=sub.toJSON();
   const {data,error}=await db.rpc("register_order_push",{p_token:token,p_order_id:orderId,p_endpoint:json.endpoint,p_p256dh:json.keys.p256dh,p_auth:json.keys.auth});
   if(error||data!==true)throw Error(error?.message||"No se pudo vincular el dispositivo con el pedido");
   label.textContent="🔔 Dispositivo registrado para el pedido #"+orderId+".";
   button.hidden=true;
  }catch(e){label.textContent="No se pudieron activar las notificaciones: "+e.message}
 }
 button.addEventListener("click",e=>{e.stopImmediatePropagation();subscribe()},true);
 window.addEventListener("brasa:pedido-creado",e=>{orderId=Number(e.detail?.id);button.hidden=false;label.textContent="Activá las notificaciones push para este pedido.";});
 if(orderId){button.hidden=false;label.textContent="Activá las notificaciones push para este pedido.";}
})();