/* Instalación opcional: el pedido sigue funcionando sin instalar la app. */
(()=>{
 if(!("serviceWorker" in navigator))return;
 window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js",{scope:"./"}).catch(console.warn));
 const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
 const standalone=window.matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
 let installEvent=null;
 window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();installEvent=event;render()});
 if(standalone)return;
 const box=document.createElement("aside");
 box.id="brasa-pwa-install";
 box.style.cssText="position:fixed;bottom:12px;left:12px;right:12px;max-width:440px;margin:auto;background:#211513;color:#fff3e5;padding:14px 18px;border:1px solid #d51f35;border-radius:15px;z-index:9998;box-shadow:0 10px 35px #0008;font:14px system-ui";
 const label=document.createElement("div");label.style.marginBottom="9px";
 const actions=document.createElement("div");actions.style.cssText="display:flex;gap:8px;justify-content:flex-end";
 const close=document.createElement("button");close.textContent="Ahora no";close.type="button";
 const install=document.createElement("button");install.textContent="Instalar";install.type="button";
 for(const b of [close,install])b.style.cssText="padding:8px 12px;border:0;border-radius:8px;cursor:pointer";
 install.style.background="#d51f35";install.style.color="white";
 close.onclick=()=>{sessionStorage.setItem("brasa-pwa-dismissed","yes");box.remove()};
 install.onclick=async()=>{if(!installEvent)return;installEvent.prompt();await installEvent.userChoice;installEvent=null;box.remove()};
 actions.append(close,install);box.append(label,actions);
 function render(){
  if(sessionStorage.getItem("brasa-pwa-dismissed")==="yes"||standalone)return;
  if(ios){
   label.textContent="🍎 Para recibir avisos con la carta cerrada en iPhone: abrí esta página en Safari, tocá Compartir → Agregar a pantalla de inicio y abrí el ícono instalado. Después escaneá el QR de tu mesa desde la app.";
   install.hidden=true;
  }else if(installEvent){
   label.textContent="📲 Podés instalar Brasa & Corte como aplicación, sin descargar nada de una tienda.";
   install.hidden=false;
  }else return;
  if(!box.isConnected)document.body.append(box);
 }
 setTimeout(render,1200);
})();