(function(){
  "use strict";

  const form=document.getElementById("login-form");
  const loginView=document.getElementById("login-view");
  const dashboardView=document.getElementById("dashboard-view");
  const notice=document.getElementById("login-notice");
  const PORTAL="/js/portal.js?v=admin-cookie-auth-20261008";

  function showDashboard(){
    loginView?.classList.add("hidden");
    dashboardView?.classList.remove("hidden");
  }

  function showLogin(){
    loginView?.classList.remove("hidden");
    dashboardView?.classList.add("hidden");
  }

  async function bootPortal(){
    try{
      await import(PORTAL);
    }catch(error){
      console.error("Administrator portal boot failed:",error);
      showDashboard();
      if(dashboardView){
        dashboardView.innerHTML='<div class="dashboard-shell"><div class="dashboard-card"><h2>D’Blossom Administrator</h2><p class="muted">Administrator authentication succeeded.</p><p class="muted">The management interface failed to initialize. Refresh to retry.</p><button class="btn navy-btn" id="admin-retry">Retry Dashboard</button></div></div>';
        document.getElementById("admin-retry")?.addEventListener("click",()=>location.reload());
      }
    }
  }

  async function boot(){
    if(!form)return;

    try{
      const check=await fetch("/api/admin-login",{method:"GET",cache:"no-store",credentials:"same-origin"});
      const data=await check.json().catch(()=>({}));
      if(check.ok && data.authenticated===true){
        showDashboard();
        await bootPortal();
        return;
      }
    }catch(error){
      console.warn("Admin session check failed:",error);
    }

    showLogin();

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
          headers:{"content-type":"application/json"},
          cache:"no-store",
          credentials:"same-origin",
          body:JSON.stringify({username,password})
        });
        const data=await response.json().catch(()=>({}));

        if(!response.ok || data.verified!==true){
          throw new Error(data.error||("Administrator login failed ("+response.status+")."));
        }

        showDashboard();
        notice.className="";
        notice.textContent="";
        await bootPortal();
      }catch(error){
        showLogin();
        notice.className="notice danger";
        notice.textContent=error?.message||"Administrator login could not be completed.";
        button.disabled=false;
        button.textContent=original;
      }
    });
  }

  boot();
})();