(async()=>{
 const token=new URLSearchParams(location.search).get("token");if(!token)return;
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 const box=document.getElementById("cuenta-cliente"),button=document.getElementById("pedir-cuenta"),message=document.getElementById("estado-cuenta");
 if(!box||!button)return;
 async function validate(){
  const {data,error}=await db.rpc("validate_table_qr",{p_token:token});
  if(error||!Number.isInteger(data)||data<1){box.hidden=true;return false}
  box.hidden=false;return true;
 }
 button.addEventListener("click",async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  button.disabled=true;message.textContent="Avisando al mozo…";
  try{
   if(!await validate())throw Error("La mesa ya no está habilitada.");
   const {data,error}=await db.rpc("request_table_bill",{p_token:token});
   if(error)throw error;
   message.textContent="🧾 Cuenta solicitada. El mozo recibió tu aviso.";
   button.textContent="Cuenta solicitada";
  }catch(err){message.textContent="No se pudo solicitar la cuenta: "+err.message;button.disabled=false}
 },true);
 await validate();
})();