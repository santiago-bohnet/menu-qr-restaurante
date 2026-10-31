(async()=>{
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 const publicKey="BOG1OwFNW4gtvKnj-vilagmEdpFWcRBtEwkAcT3aUbX77K4W_eFS3YLdVbgW0yY6DDi5gZX8uveHqPAu2DqqIyU";
 const decode=str=>Uint8Array.from(atob((str+"=".repeat((4-str.length%4)%4)).replace(/-/g,"+").replace(/_/g,"/")),c=>c.charCodeAt(0));
 const toolbar=document.querySelector(".toolbar")||document.body;
 const button=document.createElement("button");button.type="button";button.className="btn";button.textContent="🔔 Activar avisos del mozo";toolbar.append(button);
 const note=document.createElement("span");note.style.cssText="font-size:12px;margin-left:8px";toolbar.append(note);
 async function dispatch(){
  try{
   const {data:{session}}=await db.auth.getSession();if(!session)return;
   const r=await fetch(window.BRASA_SUPABASE.url+"/functions/v1/send-staff-push",{method:"POST",headers:{Authorization:"Bearer "+session.access_token,apikey:window.BRASA_SUPABASE.publishableKey}});
   if(!r.ok&&r.status!==503)console.warn("Push mozo:",r.status);
  }catch(e){console.warn(e)}
 }
 button.onclick=async()=>{
  try{
   if(!("PushManager" in window)||!("serviceWorker" in navigator))throw Error("El navegador no admite Web Push.");
   if(await Notification.requestPermission()!=="granted")throw Error("Habilitá las notificaciones del navegador.");
   await navigator.serviceWorker.register("./sw.js",{scope:"./"});
   const reg=await navigator.serviceWorker.ready;
   let sub=await reg.pushManager.getSubscription();
   // Un navegador solo admite una suscripción por Service Worker. La clave pública
   // para mozos debe ser la misma que la del cliente si se comparte el origen.
   if(sub){const current=sub.options?.applicationServerKey;if(current&&Array.from(new Uint8Array(current)).join()!==Array.from(decode(publicKey)).join()){await sub.unsubscribe();sub=null}}
   if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decode(publicKey)});
   const j=sub.toJSON();
   const {error}=await db.rpc("register_staff_push",{p_endpoint:j.endpoint,p_p256dh:j.keys.p256dh,p_auth:j.keys.auth});
   if(error)throw error;
   note.textContent="✅ Avisos de pedidos y cuentas activados";button.textContent="🔔 Avisos activados";
   await dispatch();
  }catch(e){note.textContent="⚠️ "+e.message}
 };
 setInterval(()=>{if(!document.hidden)dispatch()},12000);
})();