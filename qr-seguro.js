/* QR de mesa validado por Supabase. El enlace no contiene un número de mesa editable. */
(async()=>{
 const cfg=window.BRASA_SUPABASE;
 if(!cfg)return;
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(cfg.url,cfg.publishableKey);
 const tiles=document.getElementById("tiles");
 if(!tiles)return;
 tiles.addEventListener("click",async e=>{
  const button=e.target.closest("[data-qr-table]");
  if(!button)return;
  e.preventDefault();e.stopImmediatePropagation();
  const number=Number(button.dataset.qrTable);
  button.disabled=true;\n  const oldText=button.innerHTML;\n  button.setAttribute("aria-busy","true");
  try{
   const {data:rows,error:readError}=await db.from("restaurant_tables").select("id,status,enabled").eq("number",number).maybeSingle();
   if(readError)throw readError;
   if(!rows)throw Error("La mesa no existe en Supabase.");
   if(rows.status!=="Ocupada"||!rows.enabled){
    const {error:changeError}=await db.rpc("set_table_state",{p_number:number,p_status:"Ocupada",p_enabled:true});
    if(changeError)throw changeError;
   }
   const {data:token,error}=await db.rpc("issue_table_qr",{p_table_number:number});
   if(error)throw error;
   if(typeof QRCode==="undefined")throw Error("No se pudo cargar el generador QR.");
   const url=new URL("./index.html",location.href);
   url.searchParams.set("token",token);
   const box=document.getElementById("qr-code");
   box.replaceChildren();
   new QRCode(box,{text:url.href,width:230,height:230,colorDark:"#111111",colorLight:"#ffffff",correctLevel:QRCode.CorrectLevel.M});
   document.getElementById("qr-description").textContent="QR seguro · Mesa "+number;
   document.getElementById("qr-link").href=url.href;
   document.getElementById("qr-result").classList.remove("hide");
   document.getElementById("download-qr").dataset.realTable=String(number);\n   if(typeof selectedTable!=="undefined")selectedTable=String(number);
   const info=document.getElementById("qr-security-note");
   if(info)info.textContent="🔐 QR válido hasta 4 horas; generar otro revoca el anterior. Al liberar la mesa, deja de autorizar pedidos.";
   if(typeof say==="function")say("QR seguro generado para mesa "+number);
  }catch(err){alert("No se pudo generar el QR seguro: "+err.message)}
  finally{button.disabled=false;button.removeAttribute("aria-busy");button.innerHTML=oldText}
 },true);
 document.getElementById("download-qr")?.addEventListener("click",()=>{
  const b=document.getElementById("download-qr");
  if(!b.dataset.realTable)return;
  setTimeout(()=>{delete b.dataset.realTable},200);
 },true);
})();