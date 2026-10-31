/* Carta digital: productos reales desde Supabase, siempre con control de stock. */
(async()=>{
 const notice=document.createElement("p");
 notice.id="catalogo-estado";
 notice.setAttribute("role","status");
 notice.style.cssText="font-size:13px;color:#edbdac;margin:8px 0";
 document.getElementById("titulo-menu")?.after(notice);
 const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
 const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
 let loading=false,initialized=false,lastJson="";
 const baseCategories=["Entradas","Cortes","Achuras","Guarniciones","Bebidas","Postres"];
 const safeUrl=url=>{
  if(!url)return "";
  try{const value=new URL(url,location.href);return ["http:","https:"].includes(value.protocol)?value.href:""}catch{return ""}
 };
 async function reload(){
  if(loading)return;loading=true;
  try{
   const {data,error}=await db.from("menu_products").select("id,name,description,category,price,image_url,model_url,available").order("id");
   if(error)throw error;
   if(!Array.isArray(data))throw Error("La carta no está disponible.");
   const next=data.map(p=>({
    id:Number(p.id),nombre:p.name,descripcion:p.description||"",categoria:p.category,precio:Number(p.price),
    foto:safeUrl(p.image_url),modelo:safeUrl(p.model_url),disponible:p.available!==false
   }));
   const signature=JSON.stringify(next);
   if(signature!==lastJson){
    lastJson=signature;productos=next;
    for(const id of Object.keys(carrito)){
     if(!productos.some(p=>p.id===Number(id)&&p.disponible!==false))delete carrito[id];
    }
    const unique=[...new Set(next.map(p=>p.categoria))];
    const categories=[...baseCategories.filter(c=>unique.includes(c)),...unique.filter(c=>!baseCategories.includes(c)).sort()];
    categorias.splice(0,categorias.length,...categories);
    if(!categorias.includes(categoriaActual))categoriaActual=categorias[0]||"";
    mostrarFiltros();mostrarProductos();mostrarCarrito();
   }
   notice.textContent=next.length?"":"Todavía no hay platos publicados.";
   initialized=true;
  }catch(err){
   console.error("Error de catálogo:",err);
   notice.textContent="⚠️ No se pudo actualizar la carta. Verificá tu conexión e intentá nuevamente.";
   if(!initialized)document.getElementById("ver-pedido").disabled=true;
  }finally{loading=false}
 }
 await reload();
 setInterval(()=>{if(!document.hidden)reload()},45000);
 document.addEventListener("visibilitychange",()=>{if(!document.hidden)reload()});
})();