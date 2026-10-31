import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync,readdirSync,existsSync} from "node:fs";
import {join} from "node:path";
import {Script} from "node:vm";

const root=new URL("../",import.meta.url).pathname;
const read=name=>readFileSync(join(root,name),"utf8");
const files=readdirSync(root);
for(const path of files.filter(name=>name.endsWith(".js"))){
 test("Sintaxis JavaScript: "+path,()=>{
  assert.doesNotThrow(()=>new Script(read(path),{filename:path}));
 });
}
for(const name of ["index.html","admin.html","mozo.html","login.html","mesas-online.html"]){
 test("Scripts locales presentes: "+name,()=>{
  const html=read(name);
  for(const match of html.matchAll(/<script[^>]*src=["']\.\/([^"']+)["']/g)){
   assert.ok(existsSync(join(root,match[1])),"Falta script "+match[1]);
  }
 });
}
for(const [page,modules] of [
 ["index.html",["catalogo-supabase.js","cuenta-cliente-real.js","seguimiento-real.js","push-cliente.js"]],
 ["admin.html",["admin-supabase.js"]],
 ["mozo.html",["mozo-supabase.js","qr-seguro.js","pedidos-reales.js","cuentas-mozo-real.js"]]
]){
 test("Elementos referenciados existen: "+page,()=>{
  const html=read(page),ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));
  for(const file of [page,...modules]){
   for(const m of read(file).matchAll(/(?:getElementById\(|\$\(|el\()\s*["']([^"']+)["']/g)){
    if(m[1]==="qr-security-note")continue; // nota opcional
    assert.ok(ids.has(m[1]),file+" referencia #"+m[1]+" inexistente");
   }
  }
 });
}
test("Pedidos en mesa con QR y delivery público sin QR",()=>{
 const html=read("index.html");
 assert.match(html,/place_qr_order/);
 assert.doesNotMatch(html,/clavePanel|sincronizarCatalogo|menu-qr-ultimo-pedido-demo/);
 assert.match(html,/modoMuestra\s*=\s*parametrosQR.get\("vista"\)\s*===\s*"muestra"/);
 assert.match(html,/modoActual === "presencial" && !parametrosQR.has\("token"\)/);
 assert.match(read("delivery-cliente.js"),/place_delivery_order/);
});
test("Panel de administración sin demo y con imágenes reales",()=>{
 assert.doesNotMatch(read("admin-supabase.js"),/localStorage/);
 assert.match(read("admin-supabase.js"),/brasa-menu-images/);
 assert.match(read("admin-supabase.js"),/admin_renumber_table/);
});
test("Mozo muestra estado en el diálogo de QR",()=>{
 assert.match(read("qr-seguro.js"),/brasa:table-updated/);
 assert.match(read("mozo-supabase.js"),/brasa:table-updated/);
 assert.match(read("mozo-supabase.js"),/id,number,status,enabled,zone/);
});
test("Seguimiento recibe el evento de nuevos pedidos",()=>{
 assert.match(read("seguimiento-real.js"),/addEventListener\("brasa:pedido-creado"/);
 assert.doesNotMatch(read("seguimiento-real.js"),/HTMLDialogElement.prototype.showModal\s*=/);
});

test("Delivery público sin QR, separado del mozo y administrado",()=>{
 const html=read("index.html");
 const delivery=read("delivery-cliente.js");
 const admin=read("admin.html");
 const adminJs=read("admin-supabase.js");
 assert.match(html,/delivery-cliente\.js/);
 assert.match(delivery,/place_delivery_order/);
 assert.match(admin,/id="tabla-delivery"/);
 assert.match(adminJs,/data-delivery-order/);
 assert.match(read("pedidos-reales.js"),/eq\("kind","local"\)/);
});

test("Autorización conserva destino admin y permite cambio de cuenta",()=>{
 const guard=read("auth-guard.js"),login=read("login.html");
 assert.match(guard,/admin_required/);
 assert.match(guard,/encodeURIComponent\(next\)/);
 assert.match(login,/id="switch-account"/);
 assert.match(login,/auth\.signOut\(\)/);
 assert.match(login,/requested==="admin.html"&&data.role!=="admin"/);
});

test("Admin recibe avisos de delivery por push y mientras está abierto",()=>{
 const html=read("admin.html"),push=read("push-admin-delivery.js"),sw=read("sw.js"),admin=read("admin-supabase.js");
 assert.match(html,/id="activar-avisos-delivery"/);
 assert.match(html,/push-admin-delivery\.js/);
 assert.match(push,/register_staff_push/);
 assert.match(push,/Notification\.requestPermission/);
 assert.match(push,/brasa:new-delivery/);
 assert.match(sw,/delivery_order/);
 assert.match(sw,/admin\.html/);
 assert.match(admin,/brasa:new-delivery/);
});
