function decodeXml(s = "") {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function getTag(block, tag) {
  const m = block.match(new RegExp("<" + tag + "(?:\\s[^>]*)?>([\\s\\S]*?)<\\/" + tag + ">", "i"));
  return m ? decodeXml(m[1]) : "";
}

function num(v) {
  const n = Number(String(v || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function norm(v) {
  return String(v || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

let cache = { at: 0, products: [] };
const CACHE_MS = 30 * 60 * 1000;

async function getProducts() {
  if (cache.products.length && Date.now() - cache.at < CACHE_MS) return cache.products;

  const feedUrl = process.env.PARTNER_ADS_FEED_URL;
  if (!feedUrl) throw new Error("PARTNER_ADS_FEED_URL mangler i Vercel.");

  const r = await fetch(feedUrl, { headers: { "User-Agent": "DealFinder/3.1" } });
  if (!r.ok) throw new Error("Partner-Ads feed svarede med HTTP " + r.status);

  const xml = await r.text();
  if (!xml.includes("<produkt")) {
    throw new Error("Feedet ligner ikke XML. Første svar: " + xml.slice(0, 100));
  }

  const blocks = xml.match(/<produkt>([\s\S]*?)<\/produkt>/gi) || [];
  const products = blocks.map(b => ({
    merchant: getTag(b, "forhandler"),
    category: getTag(b, "kategorinavn"),
    brand: getTag(b, "brand"),
    name: getTag(b, "produktnavn"),
    product_id: getTag(b, "produktid"),
    ean: getTag(b, "ean"),
    description: getTag(b, "beskrivelse"),
    price: num(getTag(b, "nypris")),
    old_price: num(getTag(b, "glpris")),
    shipping: num(getTag(b, "fragtomk")),
    stock: getTag(b, "lagerantal"),
    delivery: getTag(b, "leveringstid"),
    image: getTag(b, "billedurl"),
    affiliate_url: getTag(b, "vareurl")
  })).filter(p => p.name && p.affiliate_url);

  cache = { at: Date.now(), products };
  return products;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const q = norm(url.searchParams.get("q"));
    const category = url.searchParams.get("category") || "";
    const brand = url.searchParams.get("brand") || "";
    const sort = url.searchParams.get("sort") || "relevance";
    const requestedPage = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") || 24)));

    const all = await getProducts();

    const categories = [...new Set(all.map(p => p.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"da"));
    const brands = [...new Set(all.map(p => p.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"da"));

    let filtered = all.filter(p => {
      const hay = norm([p.name,p.brand,p.category,p.description,p.ean].join(" "));
      return (!q || hay.includes(q)) &&
             (!category || p.category === category) &&
             (!brand || p.brand === brand);
    });

    if (sort === "price_asc") filtered.sort((a,b)=>a.price-b.price);
    else if (sort === "price_desc") filtered.sort((a,b)=>b.price-a.price);
    else if (sort === "name") filtered.sort((a,b)=>a.name.localeCompare(b.name,"da"));

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * limit;

    return Response.json({
      ok: true,
      total_products: all.length,
      total,
      page,
      total_pages: totalPages,
      categories,
      brands,
      items: filtered.slice(start, start + limit)
    });
  } catch (e) {
    return Response.json({ ok: false, error: e?.message || "Ukendt fejl" }, { status: 500 });
  }
}
