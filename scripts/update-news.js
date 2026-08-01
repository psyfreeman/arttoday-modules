const fs = require("fs");
const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; ArtTodayBot/1.0)"
  }
});

const SOURCES = [
  {
    name: "ARTnews",
    category: "Market",
    url: "https://www.artnews.com/feed/"
  },
  {
    name: "Artnet News",
    category: "Market",
    url: "https://news.artnet.com/feed"
  },
  {
    name: "NFT Culture",
    category: "NFT",
    url: "https://www.nftculture.com/feed/"
  }
];

function cleanText(text = "") {
  return String(text)
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(date) {
  try {
    return new Date(date || Date.now()).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function fetchSource(source) {
  try {
    console.log(`Fetching: ${source.name}`);
    const feed = await parser.parseURL(source.url);
    const items = (feed.items || []).slice(0, 6).map((item, index) => ({
      id: `${source.name}-${Date.now()}-${index}`,
      title: cleanText(item.title || "Untitled"),
      source: source.name,
      category: source.category,
      date: formatDate(item.pubDate || item.isoDate),
      summary: cleanText(item.contentSnippet || item.content || "").slice(0, 180),
      url: item.link || null,
      imageURL: null
    }));
    console.log(`OK: ${source.name} (${items.length})`);
    return items;
  } catch (error) {
    console.error(`FAIL: ${source.name} -> ${error.message}`);
    return [];
  }
}

async function main() {
  console.log("Start fetching news...");

  const results = [];
  for (const source of SOURCES) {
    const items = await fetchSource(source);
    results.push(...items);
  }

  const unique = [];
  const seen = new Set();

  for (const item of results) {
    const key = item.title.toLowerCase();
    if (!seen.has(key) && item.title.length > 5) {
      seen.add(key);
      unique.push(item);
    }
  }

  const finalNews = unique.slice(0, 25);
  fs.writeFileSync("news.json", JSON.stringify(finalNews, null, 2), "utf8");
  console.log(`Saved ${finalNews.length} items`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
