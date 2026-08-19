let all=[], filtered=[], page=1;
const perPage=24;
const $=id=>document.getElementById(id);
const norm=s=>(s||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const money=n=>Number(n||0).toLocaleString("da-DK",{minimumFractionDigits:2,maximumFractionDigits:2})+" kr.";
const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const getFavs=()=>JSON.parse(localStorage.getItem("dealfinder_favs")||"[]");
const saveFavs=x=>{localStorage.setItem("dealfinder_favs",JSON.stringify(x)); $("favCount").textContent=x.length};

function fillFilters(){
  const cats=[...new Set(all.map(p=>p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"da"));
  const brands=[...new Set(all.map(p=>p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"da"));
  $("category").innerHTML='<option value="">Alle kategorier</option>'+cats.map(x=>`<option>${esc(x)}</option>`).join("");
  $("brand").innerHTML='<option value="">Alle brands</option>'+brands.map(x=>`<option>${esc(x)}</option>`).join("");
}

function apply(){
  const q=norm($("q").value.trim());
  const cat=$("category").value;
  const brand=$("brand").value;
  filtered=all.filter(p=>{
    const hay=norm([p.name,p.brand,p.category,p.description,p.ean].join(" "));
    return (!q||hay.includes(q))&&(!cat||p.category===cat)&&(!brand||p.brand===brand);
  });
  const sort=$("sort").value;
  if(sort==="price_asc") filtered.sort((a,b)=>a.price-b.price);
  if(sort==="price_desc") filtered.sort((a,b)=>b.price-a.price);
  if(sort==="name") filtered.sort((a,b)=>a.name.localeCompare(b.name,"da"));
  page=1;
  render();
}

function toggleFav(id){
  let f=getFavs();
  f=f.includes(id)?f.filter(x=>x!==id):[...f,id];
  saveFavs(f);
  render();
}

function render(){
  const favs=getFavs();
  const start=(page-1)*perPage;
  const current=filtered.slice(start,start+perPage);
  $("resultCount").textContent=filtered.length.toLocaleString("da-DK");
  $("products").innerHTML=current.map(p=>`
    <article class="card">
      <div class="photo">${p.image?`<img loading="lazy" src="${esc(p.image)}" alt="${esc(p.name)}">`:"📦"}</div>
      <div class="body">
        <div class="tags">
          ${p.brand?`<span class="tag">${esc(p.brand)}</span>`:""}
          ${norm(p.stock)==="in stock"?'<span class="tag stock">På lager</span>':""}
        </div>
        <h3>${esc(p.name)}</h3>
        <div class="meta">${esc(p.merchant)}${p.category?" · "+esc(p.category):""}</div>
        <p class="desc">${esc(p.description)}</p>
        <div class="price">${money(p.price)}</div>
        <div class="ship">Fragt: ${money(p.shipping)}${p.delivery?" · "+esc(p.delivery):""}</div>
        <div class="actions">
          <button onclick="toggleFav('${esc(p.product_id)}')">${favs.includes(p.product_id)?"♥ Gemt":"♡ Gem"}</button>
          <a href="${esc(p.affiliate_url)}" target="_blank" rel="nofollow sponsored noopener">Se tilbud →</a>
        </div>
      </div>
    </article>`).join("") || "<p>Ingen produkter matcher din søgning.</p>";
  const total=Math.max(1,Math.ceil(filtered.length/perPage));
  $("pageInfo").textContent=`Side ${page} af ${total}`;
  $("prev").disabled=page<=1;
  $("next").disabled=page>=total;
}

async function init(){
  const res=await fetch("products.json");
  all=await res.json();
  filtered=[...all];
  fillFilters();
  saveFavs(getFavs());
  render();
}

$("searchBtn").onclick=apply;
$("q").addEventListener("keydown",e=>{if(e.key==="Enter")apply()});
["category","brand","sort"].forEach(id=>$(id).onchange=apply);
$("prev").onclick=()=>{if(page>1){page--;render();window.scrollTo(0,450)}};
$("next").onclick=()=>{if(page<Math.ceil(filtered.length/perPage)){page++;render();window.scrollTo(0,450)}};
$("favBtn").onclick=()=>{const f=getFavs(); filtered=all.filter(p=>f.includes(p.product_id)); page=1; render()};
init();