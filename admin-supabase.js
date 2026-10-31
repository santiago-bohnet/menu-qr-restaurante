/* Brasa & Corte · Administración: fuente única Supabase */
"use strict";
(async()=>{
 const el=id=>document.getElementById(id);
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(n)||0);
 const say=m=>{el("toast").textContent=m};
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 let products=[],tables=[],orders=[],bills=[],editingId=null,refreshing=false,mutating=false;
 const tabs=["resumen","pedidos","cuentas","carta","mesas"];
 const titles={resumen:"Resumen",pedidos:"Pedidos",cuentas:"Cuentas",carta:"Carta digital",mesas:"Mesas"};
 document.querySelectorAll("[data-tab]").forEach(btn=>btn.addEventListener("click",()=>{
  tabs.forEach(id=>el(id).hidden=id!==btn.dataset.tab);
  document.querySelectorAll("[data-tab]").forEach(b=>b.setAttribute("aria-selected",String(b===btn)));
  el("heading").textContent=titles[btn.dataset.tab];
 }));
 function render(){
  el("stat-pedidos").textContent=orders.length;
  el("stat-productos").textContent=products.length;
  el("stat-mesas").textContent=tables.length;
  el("admin-nuevos-pedidos").textContent=orders.filter(o=>o.status==="Nuevo").length;
  const pending=bills.filter(b=>b.status==="Pendiente");
  el("admin-cuentas-count").textContent=pending.length;
  el("cuentas-admin").innerHTML=pending.map(b=>'<div class="mesa"><h3>🧾 Mesa '+esc(b.restaurant_tables?.number??"?")+'</h3><p class="small">'+new Date(b.created_at).toLocaleString("es-AR")+'</p><button class="btn" type="button" data-bill="'+b.id+'">Marcar atendida</button></div>').join("")||'<p class="empty">No hay solicitudes pendientes.</p>';
  if(!document.activeElement?.matches("[data-order]")){
   el("tabla-pedidos").innerHTML=orders.map(o=>'<tr><td>#'+o.id+'</td><td>'+esc(o.restaurant_tables?.number??(o.kind==="delivery"?"Domicilio":"?"))+'</td><td>'+esc((o.order_items||[]).map(x=>x.quantity+" × "+x.product_name).join(" · "))+'</td><td><select data-order="'+o.id+'">'+["Nuevo","Confirmado","Preparando","Listo","Entregado","Cancelado"].map(st=>'<option '+(st===o.status?"selected":"")+'>'+st+'</option>').join("")+'</select></td><td>'+new Date(o.created_at).toLocaleString("es-AR")+'</td></tr>').join("")||'<tr><td colspan="5">Todavía no hay pedidos.</td></tr>';
  }
  const categories=[...new Set(products.map(p=>p.category))].sort(),select=el("filtrar-categoria"),old=select.value;
  const opts='<option value="">Todas las categorías</option>'+categories.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  if(select.innerHTML!==opts){select.innerHTML=opts;select.value=old}
  const search=el("buscar-producto").value.trim().toLocaleLowerCase("es"),stock=el("filtrar-stock").value;
  el("tabla-productos").innerHTML=products.filter(p=>(!search||p.name.toLocaleLowerCase("es").includes(search))&&(!select.value||p.category===select.value)&&(!stock||(stock==="disponible"?p.available:!p.available))).map(p=>'<tr><td>'+(p.image_url?'<img src="'+esc(p.image_url)+'" alt="" style="max-width:56px;max-height:50px;object-fit:cover">':"—")+'</td><td>'+esc(p.name)+'</td><td>'+esc(p.category)+'</td><td>'+money(p.price)+'</td><td>'+(p.available?"Disponible":"Agotado")+'</td><td><div class="actions"><button type="button" class="btn secondary" data-edit="'+p.id+'">Editar</button><button type="button" class="btn secondary" data-toggle="'+p.id+'">'+(p.available?"Agotar":"Reponer")+'</button></div></td></tr>').join("")||'<tr><td colspan="6">No hay productos.</td></tr>';
  if(!document.activeElement?.matches("[data-table-status],[data-table-zone],[data-table-number]")){
   el("lista-mesas").innerHTML=tables.map(t=>'<div class="mesa"><div class="mesa-head"><h3>Mesa '+t.number+'</h3><button type="button" class="btn secondary" data-remove="'+t.id+'">✕ Eliminar</button></div><label>Zona<select data-table-zone="'+t.number+'">'+["Adentro","Afuera"].map(z=>'<option '+(z===t.zone?"selected":"")+'>'+z+'</option>').join("")+'</select></label><label>Estado<select data-table-status="'+t.number+'">'+["Libre","Ocupada","Reservada"].map(st=>'<option '+(st===t.status?"selected":"")+'>'+st+'</option>').join("")+'</select></label><label>Número <input data-table-number="'+t.number+'" type="number" min="1" max="999" value="'+t.number+'" style="max-width:90px"></label></div>').join("")||'<p class="empty">No hay mesas. Agregá una para comenzar.</p>';
  }
 }
 async function refresh(){
  if(refreshing||mutating)return;
  refreshing=true;
  try{
   const results=await Promise.all([
    db.from("menu_products").select("id,name,description,category,price,available,image_url,model_url").order("id"),
    db.from("restaurant_tables").select("id,number,status,enabled,zone").order("number"),
    db.from("orders").select("id,kind,status,created_at,restaurant_tables(number),order_items(product_name,quantity)").order("created_at",{ascending:false}).limit(100),
    db.from("bill_requests").select("id,status,created_at,restaurant_tables(number)").eq("status","Pendiente").order("created_at",{ascending:true})
   ]);
   for(const result of results)if(result.error)throw result.error;
   [products,tables,orders,bills]=results.map(r=>r.data||[]);render();
  }catch(err){say("⚠️ No se pudieron consultar los datos: "+err.message)}
  finally{refreshing=false}
 }
 async function change(promise,success){
  if(mutating)return false;
  mutating=true;let ok=false;
  try{
   const result=await promise;
   if(result.error)throw result.error;
   if(Array.isArray(result.data)&&result.data.length===0)throw Error("No se realizó el cambio. Revisá tus permisos.");
   ok=true;say("✅ "+success);
  }catch(err){say("⚠️ "+err.message)}
  finally{mutating=false;await refresh()}
  return ok;
 }
 const form=el("form-producto"),editor=el("editor");
 el("nuevo-producto").onclick=()=>{editingId=null;form.reset();el("editor-title").textContent="Agregar plato";editor.showModal()};
 el("cancelar").onclick=()=>editor.close();
 form.addEventListener("submit",async event=>{
  event.preventDefault();if(mutating)return;
  const name=form.elements.nombre.value.trim(),description=form.elements.descripcion.value.trim(),category=form.elements.categoria.value,price=Number(form.elements.precio.value);
  if(!name||!Number.isFinite(price)||price<0||price>99999999)return say("Nombre o precio inválido.");
  const payload={name,description,category,price};
  const photo=form.elements.foto.files[0];
  if(photo){
   if(photo.size>1048576||!["image/jpeg","image/png","image/webp"].includes(photo.type))return say("La foto debe ser JPG, PNG o WebP, máximo 1 MB.");
   const ext=photo.type==="image/jpeg"?"jpg":photo.type==="image/png"?"png":"webp";
   const fileName=crypto.randomUUID()+"."+ext;
   const {error}=await db.storage.from("brasa-menu-images").upload(fileName,photo,{cacheControl:"3600",contentType:photo.type,upsert:false});
   if(error)return say("⚠️ No se pudo subir la foto: "+error.message);
   payload.image_url=db.storage.from("brasa-menu-images").getPublicUrl(fileName).data.publicUrl;
  }
  const urlInput=el("producto-imagen-url")?.value.trim();
  if(!photo&&urlInput){
   try{const url=new URL(urlInput);if(!["https:","http:"].includes(url.protocol))throw Error();payload.image_url=url.href}
   catch{return say("Ingresá una URL de imagen válida (https://).")}
  }
  const response=editingId?db.from("menu_products").update(payload).eq("id",editingId).select("id"):db.from("menu_products").insert({...payload,available:true}).select("id");
  const ok=await change(response,"Producto guardado en Supabase.");
  if(ok)editor.close();
 });
 el("tabla-productos").addEventListener("click",event=>{
  const edit=event.target.closest("[data-edit]"),toggle=event.target.closest("[data-toggle]");
  if(edit){
   const p=products.find(x=>x.id===Number(edit.dataset.edit));if(!p)return;
   editingId=p.id;form.reset();
   form.elements.nombre.value=p.name;form.elements.descripcion.value=p.description||"";
   form.elements.categoria.value=p.category;form.elements.precio.value=p.price;
   if(el("producto-imagen-url"))el("producto-imagen-url").value=p.image_url||"";
   el("editor-title").textContent="Editar plato";editor.showModal();
  }
  if(toggle){const p=products.find(x=>x.id===Number(toggle.dataset.toggle));if(p)change(db.from("menu_products").update({available:!p.available}).eq("id",p.id).select("id"),"Disponibilidad actualizada.")}
 });
 el("tabla-pedidos").addEventListener("change",event=>{
  const input=event.target.closest("[data-order]");if(!input)return;
  input.blur();change(db.rpc("staff_update_order_status",{p_order_id:Number(input.dataset.order),p_status:input.value}),"Estado del pedido actualizado.");
 });
 el("cuentas-admin").addEventListener("click",event=>{
  const input=event.target.closest("[data-bill]");if(input)change(db.rpc("handle_table_bill",{p_request_id:Number(input.dataset.bill)}),"Solicitud de cuenta atendida.");
 });
 el("agregar-mesa").onclick=()=>{
  let number=1;const used=new Set(tables.map(t=>t.number));
  while(used.has(number)&&number<=999)number++;
  if(number>999)return say("No hay más números disponibles.");
  const zone=el("zona-nueva").value;
  change(db.from("restaurant_tables").insert({number,zone,status:"Libre",enabled:false}).select("id"),"Mesa creada.");
 };
 el("lista-mesas").addEventListener("change",event=>{
  const status=event.target.closest("[data-table-status]");
  if(status){const number=Number(status.dataset.tableStatus);status.blur();change(db.rpc("set_table_state",{p_number:number,p_status:status.value,p_enabled:status.value==="Ocupada"}),"Mesa actualizada.");return}
  const zone=event.target.closest("[data-table-zone]");
  if(zone){const number=Number(zone.dataset.tableZone);zone.blur();change(db.from("restaurant_tables").update({zone:zone.value}).eq("number",number).select("id"),"Zona actualizada.");return}
  const numberInput=event.target.closest("[data-table-number]");
  if(numberInput){const old=Number(numberInput.dataset.tableNumber),num=Number(numberInput.value);numberInput.blur();
   if(!Number.isInteger(num)||num<1||num>999||tables.some(t=>t.number===num))return say("Número inválido o ya utilizado.");
   change(db.rpc("admin_renumber_table",{p_old_number:old,p_new_number:num}),"Número de mesa actualizado.");
  }
 });
 el("lista-mesas").addEventListener("click",event=>{
  const b=event.target.closest("[data-remove]");if(!b)return;
  if(!confirm("¿Eliminar la mesa? No se permite eliminar mesas con pedidos históricos."))return;
  change(db.from("restaurant_tables").delete().eq("id",Number(b.dataset.remove)).select("id"),"Mesa eliminada.");
 });
 ["buscar-producto","filtrar-categoria","filtrar-stock"].forEach(id=>el(id).addEventListener(id==="buscar-producto"?"input":"change",render));
 el("limpiar-filtros").onclick=()=>{el("buscar-producto").value="";el("filtrar-categoria").value="";el("filtrar-stock").value="";render()};
 await refresh();setInterval(()=>{if(!document.hidden)refresh()},12000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh()});
})();