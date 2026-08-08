async function loadVersions(){
  const list=document.getElementById("versionsList");
  if(!list) return;
  try{
    const res=await fetch("data/versions.json",{cache:"no-store"});
    const data=await res.json();
    list.innerHTML=data.versions.map((v,i)=>`
      <article class="version">
        <div class="version-number">${v.version}</div>
        <div class="version-meta"><div class="version-tag">${i===0?"LATEST":"RELEASE"}</div><div>${v.date} · ${v.notes}</div></div>
        ${v.downloadUrl ? `<a class="button secondary" href="${v.downloadUrl}">Download</a>` : ""}
      </article>
    `).join("");
    const latest=document.getElementById("latestVersion");
    const date=document.getElementById("releaseDate");
    if(latest && data.versions[0]) latest.textContent=data.versions[0].version;
    if(date && data.versions[0]) date.textContent=data.versions[0].date;
  }catch(e){
    list.innerHTML='<div class="notice">Could not load the version list.</div>';
  }
}
loadVersions();
