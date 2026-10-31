/* Avisos push para administradores: deliveries nuevos con la app abierta o cerrada.
   El servidor envía las notificaciones y solo acepta personal autenticado. */
(async()=>{
 const button=document.getElementById("activar-avisos-delivery");
 const status=document.getElementById("estado-notificaciones-delivery");
 if(!button||!status||!window.BRASA_SUPABASE)return;
 const vapidPublicKey="BGocUWFN9P_4kfEszrF_YsN2GJw3-DYDbsVViVCA3S16A8SLwsiiTSt8Zst0kIxoQvLJYx5Z_gNeNbOnIdqa88E";
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 const asKey=str=>Uint8Array.from(atob((str+"=".repeat((4-str.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
 const wantKey=asKey(vapidPublicKey);
 let activating=false;
 function supported(){
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window && window.isSecureContext;
 }
 function setEnabled(value){
  button.textContent=value?"🔔 Notificaciones activadas":"🔔 Activar notificaciones de delivery";
  button.setAttribute("aria-pressed",String(value));
 }
 async function hasSubscription(){
  if(!supported())return false;
  const registration=await navigator.serviceWorker.getRegistration("./");
  const subscription=await registration?.pushManager.getSubscription();
  return Notification.permission==="granted"&&Boolean(subscription);
 }
 async function connect(){
  if(activating)return;
  activating=true;button.disabled=true;
  try{
   if(!supported())throw Error("Este navegador no admite notificaciones push. Probá desde Chrome, Edge o una PWA compatible por HTTPS.");
   const {data:{user},error:userError}=await db.auth.getUser();
   if(userError||!user)throw Error("Iniciá sesión como administrador antes de activar las notificaciones.");
   const {data:staff,error:roleError}=await db.from("staff").select("role,active").eq("user_id",user.id).maybeSingle();
   if(roleError||staff?.active!==true||staff.role!=="admin")throw Error("Necesitás una cuenta de administrador para activar las notificaciones de delivery.");
   const permission=await Notification.requestPermission();
   if(permission!=="granted")throw Error("Las notificaciones están bloqueadas o no fueron autorizadas en el navegador.");
   status.textContent="Registrando este dispositivo…";
   await navigator.serviceWorker.register("./sw.js",{scope:"./"});
   const registration=await navigator.serviceWorker.ready;
   let subscription=await registration.pushManager.getSubscription();
   if(subscription){
    const current=subscription.options?.applicationServerKey;
    if(current){
     const same=current.byteLength===wantKey.length&&Array.from(new Uint8Array(current)).every((val,i)=>val===wantKey[i]);
     if(!same){await subscription.unsubscribe();subscription=null;}
    }
   }
   if(!subscription)subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:wantKey});
   const data=subscription.toJSON();
   if(!data.endpoint||!data.keys?.p256dh||!data.keys?.auth)throw Error("No se pudo obtener la suscripción del dispositivo.");
   const {data:result,error}=await db.rpc("register_staff_push",{
    p_endpoint:data.endpoint,p_p256dh:data.keys.p256dh,p_auth:data.keys.auth
   });
   if(error||result!==true)throw Error(error?.message||"No se pudo asociar el dispositivo a la cuenta.");
   setEnabled(true);
   status.textContent="✅ Dispositivo registrado. Vas a recibir avisos de delivery incluso cuando cierres esta pestaña, siempre que el navegador permita notificaciones en segundo plano.";
   // Aviso de prueba, sin crear pedidos ni molestar a otros dispositivos.
   await registration.showNotification("✅ Avisos de delivery activados",{
    body:"Brasa & Corte · El administrador recibirá alertas de nuevos pedidos.",
    tag:"brasa-admin-enabled",icon:"./icono-pwa.svg",
    data:{url:"./admin.html"}
   });
  }catch(err){
   setEnabled(false);status.textContent="⚠️ "+err.message;
  }finally{activating=false;button.disabled=false}
 }
 button.addEventListener("click",connect);
 if(!supported()){
  button.disabled=true;status.textContent="Este navegador no admite Web Push. Podés consultar las solicitudes desde la pestaña Delivery.";
 }else{
  try{
   if(await hasSubscription()){
    status.textContent="🔔 El navegador tiene las notificaciones habilitadas. Tocá el botón para registrar o renovar los avisos en esta cuenta administradora.";
   }else if(Notification.permission==="denied"){
    status.textContent="⚠️ Las notificaciones están bloqueadas. Habilitalas desde los permisos del sitio y volvé a entrar.";
   }
  }catch(err){console.warn("No se pudo consultar la suscripción:",err)}
 }
})();