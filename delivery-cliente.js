/* Solicitudes delivery sin QR: precios calculados y pedido registrado en Supabase. */
(async()=>{
 const params=new URLSearchParams(location.search);
 if(params.has("token")||params.get("vista")==="muestra")return;
 const form=document.getElementById("formulario");
 if(!form)return;
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 let sending=false;
 form.addEventListener("submit",async event=>{
  if(modoActual!=="domicilio")return;
  event.preventDefault();event.stopImmediatePropagation();
  if(sending)return;
  const chosen=seleccionados();
  const state=document.getElementById("estado");
  if(!chosen.length)return;
  const name=document.getElementById("nombre-entrega").value.trim();
  const phone=document.getElementById("telefono-entrega").value.trim();
  const address=document.getElementById("direccion").value.trim();
  if(name.length<2||phone.replace(/\D/g,"").length<7||address.length<8){
   state.textContent="Completá nombre, teléfono y dirección correctamente.";return;
  }
  const button=document.getElementById("ver-pedido");
  sending=true;button.disabled=true;state.textContent="Registrando tu solicitud de delivery…";
  try{
   const {data:id,error}=await db.rpc("place_delivery_order",{
    p_items:chosen.map(p=>({id:p.id,quantity:carrito[p.id]})),
    p_name:name,p_phone:phone,p_address:address,
    p_reference:document.getElementById("referencias-entrega").value.trim(),
    p_zone:document.getElementById("zona-envio").value,
    p_payment_method:document.getElementById("metodo-pago").value,
    p_notes:document.getElementById("aclaraciones").value.trim()
   });
   if(error)throw error;
   if(!Number.isSafeInteger(Number(id))||Number(id)<1)throw Error("No se recibió la confirmación del servidor");
   carrito={};mostrarCarrito();
   const dialog=document.getElementById("dialogo");
   document.getElementById("titulo-dialogo").textContent="✅ Solicitud de delivery recibida";
   document.getElementById("mensaje").hidden=true;
   document.getElementById("copiar").hidden=true;
   document.getElementById("seguimiento-pedido").hidden=true;
   document.getElementById("estado-copia").textContent="Solicitud #"+id+" registrada. El restaurante debe confirmar el pedido, el costo de envío y el total final. No se realizó ningún cobro.";
   const note=dialog.querySelector("p.nota");
   if(note)note.textContent="Conservá el número de solicitud y el teléfono informado para consultar al local.";
   state.textContent="Solicitud #"+id+" enviada al restaurante.";
   if(!dialog.open)dialog.showModal();
  }catch(error){
   state.textContent="No se pudo registrar tu delivery: "+error.message+". Revisá los datos e intentá nuevamente.";
  }finally{sending=false;button.disabled=false;mostrarCarrito()}
 },true);
})();