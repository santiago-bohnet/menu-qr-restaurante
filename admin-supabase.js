"use strict";
(async()=>{
const $=id=>document.getElementById(id),escape=x=>String(x??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
let products=[],tables=[],orders=[],bills=[],editing=null,busy=false;
const msg=t=>$("toast").textContent=t;
const money=n=>new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(n||0);
const tabs=["resumen","pedidos","cuentas","carta","mesas"];
document.querySelectorAll("[data-tab]").forEach(b=>b.onclick=()=>{tabs.forEach(t=>$(t).hidden=t!==b.dataset.tab);document.querySelectorAll("[data-tab]").forEach(x=>x.setAttribute("aria-selected",String(x===b)));$("heading").textContent=b.textContent.trim()});
function render(){
$("stat-pedidos").textContent=orders.length;$("stat-productos").textContent=products.length;$("stat-mesas").textContent=tables.length;
$("admin-nuevos-pedidos").textContent=orders.filter(o=>o.status==="Nuevo").length;
const pending=bills.filter(b=>b.status==="Pendiente");$("admin-cuentas-count").textContent=pending.length;
$("cuentas-admin").innerHTML=pending.map(b=>'<div class="mesa"><h3>Mesa '+escape(b.restaurant_tables?.number??"?")+'</h3><button class="btn" data-bill="'+b.id+'">Marcar atendida</button></div>').join("")||"No hay cuentas pendientes.";
$("tabla-pedidos").innerHTML=orders.map(o=>'<tr><td>#'+o.id+'</td><td>'+escape(o.restaurant_tables?.number??"Delivery")+'</td><td>'+(o.order_items||[]).map(i=>escape(i.quantity+" × "+i.product_name)).join(" · ")+'</td><td><select data-order="'+o.id+'">'+["Nuevo","Confirmado","Preparando","Listo","Entregado","Cancelado"].map(st=>'<option '+(st===o.status?"selected":"")+'>'+st+'</option>').join("")+'</select></td><td>'+escape(o.status)+'</td></tr>').join("");
const cat=$("filtrar-categoria"),old=cat.value;cat.innerHTML='<option value="">Todas las categorías</option>'+[...new Set(products.map(p=>p.category))].map(c=>'<option>'+escape(c)+'</option>').join("");cat.value=old;
const search=$("buscar-producto").value.toLowerCase(),stock=$("filtrar-stock").value;
$("tabla-productos").innerHTML=products.filter(p=>(!search||p.name.toLowerCase().includes(search))&&(!cat.value||p.category===cat.value)&&(!stock||(stock==="disponible"?p.available:!p.available))).map(p=>'<tr><td>'+(p.image_url?'<img src="'+escape(p.image_url)+'" alt="" width="55">':"—")+'</td><td>'+escape(p.name)+'</td><td>'+escape(p.category)+'</td><td>'+money(p.price)+'</td><td>'+(p.available?"Disponible":"Agotado")+'</td><td><button class="btn secondary" data-edit="'+p.id+'">Editar</button> <button class="btn secondary" data-toggle="'+p.id+'">'+(p.available?"Agotar":"Reponer")+'</button></td></tr>').join("");
$("lista-mesas").innerHTML=tables.map(t=>'<div class="mesa"><h3>Mesa '+t.number+'</h3><select data-table="'+t.number+'">'+["Libre","Ocupada","Reservada"].map(x=>'<option '+(x===t.status?"selected":"")+'>'+x+'</option>').join("")+'</select><button class="btn secondary" data-remove="'+t.id+'">Eliminar</button></div>').join("");
}
async function refresh(){if(busy)return;busy=true;try{
const results=await Promise.all([db.from("menu_products").select("*").order("id"),db.from("restaurant_tables").select("*").order("number"),db.from("orders").select("id,status,created_at,restaurant_tables(number),order_items(product_name,quantity)").order("created_at",{ascending:false}).limit(100),db.from("bill_requests").select("id,status,restaurant_tables(number)").eq("status","Pendiente")]);
for(const r of results)if(r.error)throw r.error;
[products,tables,orders,bills]=results.map(r=>r.data||[]);render();
}catch(e){msg("⚠️ "+e.message)}finally{busy=false}}
async function act(promise,success){try{const r=await promise;if(r.error)throw r.error;msg(success)}catch(e){msg("⚠️ "+e.message)}await refresh()}
$("nuevo-producto").onclick=()=>{editing=null;$("form-producto").reset();$("editor").showModal()};
$("cancelar").onclick=()=>$("editor").close();
$("form-producto").onsubmit=async e=>{e.preventDefault();const f=e.target;
if(f.elements.foto.files.length)return msg("La carga de fotos requiere configurar Supabase Storage.");
const data={name:f.elements.nombre.value.trim(),description:f.elements.descripcion.value.trim(),category:f.elements.categoria.value,price:Number(f.elements.precio.value)};
await act(editing?db.from("menu_products").update(data).eq("id",editing):db.from("menu_products").insert({...data,available:true}),"Producto guardado en Supabase.");$("editor").close()};
$("tabla-productos").onclick=e=>{const edit=e.target.closest("[data-edit]"),toggle=e.target.closest("[data-toggle]");
if(edit){const p=products.find(p=>p.id===Number(edit.dataset.edit));if(!p)return;editing=p.id;const f=$("form-producto");f.reset();f.elements.nombre.value=p.name;f.elements.descripcion.value=p.description||"";f.elements.categoria.value=p.category;f.elements.precio.value=p.price;$("editor").showModal()}
if(toggle){const p=products.find(p=>p.id===Number(toggle.dataset.toggle));if(p)act(db.from("menu_products").update({available:!p.available}).eq("id",p.id),"Stock actualizado.")}};
$("tabla-pedidos").onchange=e=>{const x=e.target.closest("[data-order]");if(x)act(db.rpc("staff_update_order_status",{p_order_id:Number(x.dataset.order),p_status:x.value}),"Pedido actualizado.")};
$("cuentas-admin").onclick=e=>{const x=e.target.closest("[data-bill]");if(x)act(db.rpc("handle_table_bill",{p_request_id:Number(x.dataset.bill)}),"Cuenta atendida.")};
$("agregar-mesa").onclick=()=>{let n=1;const used=new Set(tables.map(t=>t.number));while(used.has(n))n++;act(db.from("restaurant_tables").insert({number:n,status:"Libre",enabled:false}),"Mesa creada.")};
$("lista-mesas").onchange=e=>{const x=e.target.closest("[data-table]");if(x)act(db.rpc("set_table_state",{p_number:Number(x.dataset.table),p_status:x.value,p_enabled:x.value==="Ocupada"}),"Mesa actualizada.")};
$("lista-mesas").onclick=e=>{const x=e.target.closest("[data-remove]");if(x&&confirm("¿Eliminar esta mesa?"))act(db.from("restaurant_tables").delete().eq("id",Number(x.dataset.remove)),"Mesa eliminada.")};
["buscar-producto","filtrar-categoria","filtrar-stock"].forEach(id=>$(id).addEventListener(id==="buscar-producto"?"input":"change",render));
$("limpiar-filtros").onclick=()=>{$("buscar-producto").value="";$("filtrar-categoria").value="";$("filtrar-stock").value="";render()};
await refresh();setInterval(()=>{if(!document.hidden)refresh()},12000);
})();