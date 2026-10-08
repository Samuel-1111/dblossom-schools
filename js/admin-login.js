(function(){
  const form=document.getElementById("login-form");
  const notice=document.getElementById("login-notice");
  if(!form)return;
  form.addEventListener("submit",async function(e){
    e.preventDefault();
    const button=form.querySelector('button[type="submit"]');
    const username=String(new FormData(form).get("identifier")||"").trim();
    const password=String(new FormData(form).get("password")||"");
    notice.className="";
    notice.textContent="";
    if(!username||!password){
      notice.className="notice danger";
      notice.textContent=!username?"Username is required":"Password is required";
      return;
    }
    button.disabled=true;
    const original=button.textContent;
    button.textContent="Signing in…";
    try{
      const response=await fetch("/api/admin-login",{
        method:"POST",
        headers:{"content-type":"application/json","cache-control":"no-cache"},
        cache:"no-store",
        body:JSON.stringify({username:username,password:password})
      });
      const data=await response.json().catch(function(){return{}});
      if(!response.ok||!data.verified||!data.session){
        throw new Error(data.error||("Administrator login failed ("+response.status+")."));
      }
      localStorage.setItem("dblossom_admin_session",data.session);
      window.location.reload();
    }catch(error){
      localStorage.removeItem("dblossom_admin_session");
      notice.className="notice danger";
      notice.textContent=error&&error.message?error.message:"Administrator login could not be completed.";
      button.disabled=false;
      button.textContent=original;
    }
  });
})();