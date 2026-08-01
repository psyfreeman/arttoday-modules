const fs = require("fs");
const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "ArtTodayBot/1.0"
  }
});

const SOURCES = [
  {
    name: "ARTnews",
    category: "Market",
    url: "https://www.artnews.com/feed/"
  },
  {
    name: "The Art Newspaper",
    category: "Exhibition",
    url: "https://www.theartnewspaper.com/rss"
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
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(date) {
  if (!date) return new Date().toISOString().slice(0, 10);
  try {
    return new Date(date).toLocaleDateString("en-GB", {
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
    const feed = await parser.parseURL(source.url);
    return (feed.items || []).slice(0, 8).map((item, index) => ({
      id: `${source.name}-${Date.now()}-${index}`,
      title: cleanText(item.title || "Untitled"),
      source: source.name,
      category: source.category,
      date: formatDate(item.pubDate || item.isoDate),
      summary: cleanText(item.contentSnippet || item.content || item.summary || "").slice(0, 180),
      url: item.link || null,
      imageURL: null
    }));
  } catch (error) {
    console.error(`Failed: ${source.name}`, error.message);
    return [];
  }
}

async function main() {
  console.log("Fetching art & NFT news...");

  const results = await Promise.all(SOURCES.map(fetchSource));
  const allNews = results.flat();

  // Убираем дубли по заголовку
  const unique = [];
  const seen = new Set();

  for (const item of allNews) {
    const key = item.title.toLowerCase();
    if (!seen.has(key) && item.title.length > 5) {
      seen.add(key);
      unique.push(item);
    }
  }

  // Сортируем и берём топ 30
  const finalNews = unique.slice(0, 30);

  fs.writeFileSync("news.json", JSON.stringify(finalNews, null, 2), "utf8");
  console.log(`Saved ${finalNews.length} news items to news.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
