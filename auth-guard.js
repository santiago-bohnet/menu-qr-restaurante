// Control de acceso del lado del cliente; los datos reales siguen protegidos por RLS.
document.documentElement.style.visibility="hidden";
(async()=>{
 try{
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){location.replace("./login.html?reason=login");return}
  const {data:staff,error:roleError}=await db.from("staff").select("role,active").eq("user_id",user.id).maybeSingle();
  const required=document.documentElement.dataset.staffRole;
  if(roleError||!staff?.active||(required==="admin"&&staff.role!=="admin")){location.replace("./login.html?reason=permissions");return}
  document.documentElement.style.visibility="visible";
 }catch(e){location.replace("./login.html?reason=connection")}
})();
