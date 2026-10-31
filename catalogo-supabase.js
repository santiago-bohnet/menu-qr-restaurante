/* Carta pública: catálogo de Supabase; sin depender del navegador del administrador. */
(async()=>{
 try{
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
  const {data,error}=await db.from("menu_products").select("id,name,description,category,price,image_url,model_url,available").order("id");
  if(error)throw error;
  if(!Array.isArray(data))throw Error("Catálogo no disponible");
  productos=data.map(p=>({id:Number(p.id),nombre:p.name,descripcion:p.description||"",categoria:p.category,precio:Number(p.price),foto:p.image_url||"",modelo:p.model_url||"",disponible:p.available!==false}));
  for(const category of [...new Set(productos.map(p=>p.categoria))])if(!categorias.includes(category))categorias.push(category);
  if(typeof mostrarFiltros==="function")mostrarFiltros();
  if(typeof mostrarProductos==="function")mostrarProductos();
  if(typeof mostrarCarrito==="function")mostrarCarrito();
 }catch(error){
  console.error("No se pudo cargar el catálogo real:",error);
  const status=document.getElementById("feedback")||document.getElementById("estado-copia");
  if(status)status.textContent="⚠️ No se pudo sincronizar la carta. Volvé a cargar la página.";
 }
})();