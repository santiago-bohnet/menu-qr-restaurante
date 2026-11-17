import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {resolve,dirname} from "node:path";
const base=resolve(dirname(fileURLToPath(import.meta.url)),"..");
const read=path=>readFileSync(resolve(base,path),"utf8");

// These contract tests are static; no production orders or Supabase calls are made.
test("Delivery collects client information and uses server-side RPC",()=>{
 const html=read("index.html"),client=read("delivery-cliente.js");
 for(const id of ["nombre-entrega","telefono-entrega","direccion","referencias-entrega","zona-envio","metodo-pago"])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(client,/db\.rpc\("place_delivery_order"/);
 assert.match(client,/p_zone:/);
 assert.match(client,/p_payment_method:/);
 assert.doesNotMatch(client,/service_role|secret_key/i);
});
test("Delivery does not claim to charge or calculate final delivery price",()=>{
 const client=read("delivery-cliente.js");
 assert.match(client,/restaurante debe confirmar el pedido, el costo de envío y el total final/);
 assert.match(client,/No se realizó ningún cobro/);
});
test("Delivery zones implementation remains gated by reviewed backend permissions",()=>{
 const plan=read("docs/delivery-zones-contract.md");
 assert.match(plan,/administrador/);
 assert.match(plan,/RLS/);
 assert.match(plan,/no.*cobros online/i);
});
