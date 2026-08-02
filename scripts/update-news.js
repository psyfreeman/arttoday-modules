const fs = require("fs");
const Parser = require("rss-parser");

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; ArtTodayBot/1.0)"
  }
});

const SOURCES = [
  // ===== Contemporary Art =====
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
    name: "Hyperallergic",
    category: "Exhibition",
    url: "https://hyperallergic.com/feed/"
  },

  // ===== NFT / Digital Art =====
  {
    name: "NFT Culture",
    category: "NFT",
    url: "https://www.nftculture.com/feed/"
  },
  {
    name: "NFT Now",
    category: "NFT",
    url: "https://nftnow.com/feed/"
  },
  {
    name: "Cointelegraph NFT",
    category: "NFT",
    url: "https://cointelegraph.com/rss/tag/nft"
  },

  // ===== Bitcoin / ETH / Blockchain =====
  {
    name: "CoinDesk",
    category: "Blockchain",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/"
  },
  {
    name: "Cointelegraph",
    category: "Blockchain",
    url: "https://cointelegraph.com/rss"
  },
  {
    name: "Decrypt",
    category: "Blockchain",
    url: "https://decrypt.co/feed"
  },
  {
    name: "Bitcoin Magazine",
    category: "Bitcoin",
    url: "https://bitcoinmagazine.com/.rss/full/"
  },
  {
    name: "The Block",
    category: "Blockchain",
    url: "https://www.theblock.co/rss.xml"
  },

  // ===== DAO / Web3 culture =====
  {
    name: "Bankless",
    category: "DAO",
    url: "https://www.bankless.com/feed"
  },
  {
    name: "Mirror DAO-ish",
    category: "DAO",
    url: "https://mirror.xyz/feed/atom"
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
    return new Date(date || Date.now()).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

async function translateToRu(text) {
  if (!text || text.length < 2) return text;

  try {
    const url =
      "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(text.slice(0, 400)) +
      "&langpair=en|ru";

    const res = await fetch(url);
    const data = await res.json();

    const translated = data?.responseData?.translatedText;
    if (translated && !translated.includes("MYMEMORY WARNING")) {
      return translated;
    }
    return text;
  } catch {
    return text;
  }
}

async function fetchSource(source) {
  try {
    console.log(`Fetching: ${source.name}`);
    const feed = await parser.parseURL(source.url);

    const items = [];
    for (const [index, item] of (feed.items || []).slice(0, 6).entries()) {
      const titleEn = cleanText(item.title || "Untitled");
      const summaryEn = cleanText(
  item.contentSnippet || item.content || item["content:encoded"] || ""
).slice(0, 600);

      const titleRu = await translateToRu(titleEn);
      await new Promise((r) => setTimeout(r, 300));
      const summaryRu = await translateToRu(summaryEn);
      await new Promise((r) => setTimeout(r, 300));

      // Пытаемся достать картинку
      let imageURL = null;
      if (item.enclosure?.url && String(item.enclosure.url).startsWith("http")) {
        imageURL = item.enclosure.url;
      } else if (item["media:content"]?.$?.url) {
        imageURL = item["media:content"].$.url;
      } else if (item["media:thumbnail"]?.$?.url) {
        imageURL = item["media:thumbnail"].$.url;
      } else {
        const html = item["content:encoded"] || item.content || "";
        const match = String(html).match(/<img[^>]+src=["']([^"']+)["']/i);
        if (match && match[1].startsWith("http")) {
          imageURL = match[1];
        }
      }

      items.push({
        id: `${source.name}-${Date.now()}-${index}`,
        title: titleRu,
        source: source.name,
        category: source.category,
        date: formatDate(item.pubDate || item.isoDate),
        summary: summaryRu,
        url: item.link || null,
        imageURL: imageURL
      });
    }

    console.log(`OK: ${source.name} (${items.length})`);
    return items;
  } catch (error) {
    console.error(`FAIL: ${source.name} -> ${error.message}`);
    return [];
  }
}

async function main() {
  console.log("Start fetching + translating news...");

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

  const finalNews = unique.slice(0, 40);
  fs.writeFileSync("news.json", JSON.stringify(finalNews, null, 2), "utf8");
  console.log(`Saved ${finalNews.length} Russian news items`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
