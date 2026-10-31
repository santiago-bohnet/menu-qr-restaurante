/* Acceso por roles. Sin dar permisos admin a mozos; conservar destino del usuario. */
document.documentElement.style.visibility="hidden";
(async()=>{
 const required=document.documentElement.dataset.staffRole;
 const next=location.pathname.split("/").pop()==="admin.html"?"admin.html":"mozo.html";
 const toLogin=reason=>location.replace("./login.html?reason="+encodeURIComponent(reason)+"&next="+encodeURIComponent(next));
 try{
  const {createClient}=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
  const db=createClient(window.BRASA_SUPABASE.url,window.BRASA_SUPABASE.publishableKey);
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user){toLogin("login");return}
  const {data:staff,error:roleError}=await db.from("staff").select("role,active").eq("user_id",user.id).maybeSingle();
  if(roleError||!staff?.active){toLogin("permissions");return}
  if(required==="admin"&&staff.role!=="admin"){toLogin("admin_required");return}
  document.documentElement.style.visibility="visible";
 }catch(err){toLogin("connection")}
})();
