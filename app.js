const products=[
{name:"Lenovo Legion Tower 5",cat:"Gaming PC",price:10999,old:12999,discount:15,store:"Eksempelbutik",icon:"🖥️"},
{name:"LG UltraGear OLED 27GS95QE",cat:"OLED skærm",price:4999,old:5999,discount:17,store:"Eksempelbutik",icon:"🖥️"},
{name:"Apple iPhone 16 128GB",cat:"iPhone",price:5999,old:6999,discount:14,store:"Eksempelbutik",icon:"📱"},
{name:"Sony WH-1000XM6",cat:"Hovedtelefoner",price:2899,old:3499,discount:17,store:"Eksempelbutik",icon:"🎧"},
{name:"ASUS ROG Gaming PC",cat:"Gaming PC",price:13999,old:15999,discount:13,store:"Eksempelbutik",icon:"🖥️"},
{name:"Samsung Odyssey OLED G6",cat:"OLED skærm",price:6999,old:7999,discount:13,store:"Eksempelbutik",icon:"🖥️"}
];

const el=id=>document.getElementById(id);
function render(list=products){
  el("products").innerHTML=list.map((p,i)=>`
  <article class="card">
    <div class="photo">${p.icon}</div>
    <div class="body">
      <span class="tag">-${p.discount}%</span>
      <h3>${p.name}</h3>
      <div class="store">${p.cat} · ${p.store}</div>
      <div class="price">${p.price.toLocaleString("da-DK")} kr. <span class="old">${p.old.toLocaleString("da-DK")} kr.</span></div>
      <div class="actions">
        <button onclick="alert('Prisalarmer kommer i næste version')">🔔 Prisalarm</button>
        <button class="go" onclick="alert('Affiliate-link tilsluttes her')">Se tilbud →</button>
      </div>
    </div>
  </article>`).join("");
}
function search(){
  const q=el("searchInput").value.toLowerCase().trim();
  const result=q?products.filter(p=>(p.name+" "+p.cat).toLowerCase().includes(q)):products;
  el("resultText").textContent=q?`${result.length} resultater for "${q}"`:"Demo-data – klar til rigtige produktfeeds";
  render(result);
}
el("searchBtn").onclick=search;
el("searchInput").addEventListener("keydown",e=>{if(e.key==="Enter")search()});
document.querySelectorAll(".chips button").forEach(b=>b.onclick=()=>{el("searchInput").value=b.dataset.search;search()});
el("sort").onchange=()=>{
  let x=[...products];
  if(el("sort").value==="price")x.sort((a,b)=>a.price-b.price);
  if(el("sort").value==="discount")x.sort((a,b)=>b.discount-a.discount);
  render(x);
};
el("premiumBtn").onclick=()=>el("modal").classList.remove("hidden");
el("closeModal").onclick=()=>el("modal").classList.add("hidden");
el("premiumCta").onclick=()=>alert("Stripe/login tilsluttes, når backend er sat op.");
render();
