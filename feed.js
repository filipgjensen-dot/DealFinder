import { XMLParser } from "fast-xml-parser";

let cache = { fetchedAt: 0, products: [] };
const CACHE_MS = 30 * 60 * 1000;

const asText = (v) => v == null ? "" : String(v).trim();
const asNumber = (v) => { const n = Number(String(v ?? "0").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const normalize = (v) => asText(v).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

async function loadProducts() {
  if (cache.products.length && Date.now() - cache.fetchedAt < CACHE_MS) return cache.products;
  const feedUrl = process.env.PARTNER_ADS_FEED_URL;
  if (!feedUrl) throw new Error("PARTNER_ADS_FEED_URL mangler i Vercel Environment Variables.");
  const response = await fetch(feedUrl, { headers: { "user-agent": "DealFinder/3.0" } });
  if (!response.ok) throw new Error(`Partner-Ads feed svarede med HTTP ${response.status}.`);
  const xml = await response.text();
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: true });
  const parsed = parser.parse(xml);
  let rows = parsed?.produkter?.produkt ?? [];
  if (!Array.isArray(rows)) rows = [rows];
  const products = rows.map(p => ({
    merchant: asText(p.forhandler), category: asText(p.kategorinavn), brand: asText(p.brand),
    name: asText(p.produktnavn), product_id: asText(p.produktid), ean: asText(p.ean),
    description: asText(p.beskrivelse), price: asNumber(p.nypris), old_price: asNumber(p.glpris),
    shipping: asNumber(p.fragtomk), stock: asText(p.lagerantal), delivery: asText(p.leveringstid),
    image: asText(p.billedurl), affiliate_url: asText(p.vareurl)
  })).filter(p => p.name && p.affiliate_url);
  cache = { fetchedAt: Date.now(), products };
  return products;
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const q = normalize(url.searchParams.get("q"));
      const category = asText(url.searchParams.get("category"));
      const brand = asText(url.searchParams.get("brand"));
      const sort = asText(url.searchParams.get("sort") || "relevance");
      const page = Math.max(1, Number(url.searchParams.get("page") || 1));
      const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") || 24)));
      const all = await loadProducts();
      const categories = [...new Set(all.map(p => p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"da"));
      const brands = [...new Set(all.map(p => p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"da"));
      let filtered = all.filter(p => {
        const hay = normalize([p.name,p.brand,p.category,p.description,p.ean].join(" "));
        return (!q || hay.includes(q)) && (!category || p.category===category) && (!brand || p.brand===brand);
      });
      if (sort === "price_asc") filtered.sort((a,b)=>a.price-b.price);
      if (sort === "price_desc") filtered.sort((a,b)=>b.price-a.price);
      if (sort === "name") filtered.sort((a,b)=>a.name.localeCompare(b.name,"da"));
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total/limit));
      const safePage = Math.min(page,totalPages);
      const start=(safePage-1)*limit;
      return Response.json({ok:true,updated_at:new Date(cache.fetchedAt).toISOString(),total_products:all.length,total,page:safePage,total_pages:totalPages,categories,brands,items:filtered.slice(start,start+limit)}, {headers:{"Cache-Control":"public, s-maxage=900, stale-while-revalidate=3600"}});
    } catch (error) {
      return Response.json({ok:false,error:error?.message||"Ukendt fejl"},{status:500});
    }
  }
};
