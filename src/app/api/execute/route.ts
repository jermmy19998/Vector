import { NextResponse } from "next/server";
import type {
  FindingRecord,
  MonitorRecord,
  ExecutionRecord,
  SourceSetting,
} from "@/components/vector-store";

export const runtime = "nodejs";

type RawItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  updatedAt?: string;
  text: string;
  authors?: string[];
  institutions?: string[];
  subjects?: string[];
  abstract?: string;
  category?: string;
  citation?: string;
  doi?: string;
  version?: string;
};
const decode = (value: string) =>
  value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const tag = (xml: string, name: string) =>
  decode(
    xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, `i`))?.[1] ??
      "",
  );

async function fetchJson(
  url: string,
  extraHeaders: Record<string, string> = {},
) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Vector Research Automation/0.1 (https://www.gray.org.cn)",
      ...extraHeaders,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Vector Research Automation/0.1 (https://www.gray.org.cn)",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}
async function fetchJsonWithRetry(
  url: string,
  attempts = 3,
  headers: Record<string, string> = {},
) {
  let last = "";
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fetchJson(url, headers);
    } catch (error) {
      last = error instanceof Error ? error.message : "Request failed";
      if (!last.includes("HTTP 429") || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 900 * (attempt + 1)));
    }
  }
  throw new Error(last || "Request failed");
}
type ExecuteMonitor = MonitorRecord & {
  sourceSettings?: Record<string, SourceSetting>;
};
async function fetchProvider(
  id: string,
  monitor: ExecuteMonitor,
): Promise<RawItem[]> {
  const query = monitor.includeKeywords.join(" ");
  const limit = Math.min(monitor.maxResults, 50);
  if (id === "pubmed") {
    const search = await fetchJson(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=${limit}&sort=pub+date`,
    );
    const ids: string[] = search.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];
    const summary = await fetchJson(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`,
    );
    return ids
      .map((uid) => summary.result?.[uid])
      .filter(Boolean)
      .map((item: any) => ({
        id: String(item.uid),
        title: decode(item.title ?? ""),
        url: `https://pubmed.ncbi.nlm.nih.gov/${item.uid}/`,
        source: "PubMed",
        publishedAt: new Date(
          (item.sortpubdate ?? item.epubdate ?? item.pubdate ?? "").replace(
            /\//g,
            "-",
          ) || Date.now(),
        ).toISOString(),
        authors: (item.authors ?? [])
          .map((author: any) => author.name)
          .filter(Boolean),
        institutions: [],
        subjects: (item.pubtype ?? []).filter(Boolean),
        text: `${decode(item.title ?? "")} ${(item.authors ?? []).map((author: any) => author.name).join(" ")} ${item.fulljournalname ?? ""}`,
      }));
  }
  if (id === "openreview") {
    const data = await fetchJson(
      `https://api2.openreview.net/notes/search?term=${encodeURIComponent(query)}&limit=${limit}`,
    );
    const value = (field: any): string =>
      typeof field === "string"
        ? field
        : typeof field?.value === "string"
          ? field.value
          : "";
    return (data.notes ?? [])
      .map((note: any) => {
        const content = note.forumContent ?? note.content ?? {};
        const title = value(content.title);
        const abstract = value(content.abstract) || value(content.summary);
        const forum = note.forum ?? note.id;
        const subjects = Array.isArray(content.keywords?.value)
          ? content.keywords.value
          : [];
        const authors = Array.isArray(content.authors?.value)
          ? content.authors.value
          : Array.isArray(content.authorids?.value)
            ? content.authorids.value
            : [];
        return {
          id: String(forum),
          title,
          url: `https://openreview.net/forum?id=${forum}`,
          source: "OpenReview",
          publishedAt: new Date(
            note.tcdate ?? note.cdate ?? Date.now(),
          ).toISOString(),
          authors,
          institutions: [],
          subjects,
          text: `${title} ${abstract} ${subjects.join(" ")}`,
        };
      })
      .filter((item: RawItem) => Boolean(item.title));
  }
  if (id === "crossref") {
    const data = await fetchJson(
      `https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=${limit}&sort=published&order=desc`,
    );
    return (data.message?.items ?? []).map((item: any) => ({
      id: String(item.DOI ?? item.URL),
      title: item.title?.[0] ?? "",
      url: item.URL ?? `https://doi.org/${item.DOI}`,
      source: "Crossref",
      publishedAt: new Date(
        item.created?.["date-time"] ?? Date.now(),
      ).toISOString(),
      authors: (item.author ?? []).map((author: any) =>
        [author.given, author.family].filter(Boolean).join(" "),
      ),
      institutions: (item.author ?? [])
        .flatMap((author: any) => author.affiliation ?? [])
        .map((item: any) => item.name)
        .filter(Boolean),
      subjects: item.subject ?? [],
      text: `${item.title?.[0] ?? ""} ${item.abstract ?? ""} ${(item.subject ?? []).join(" ")}`,
    }));
  }
  if (id === "openalex") {
    const data = await fetchJson(
      `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=${limit}&sort=publication_date:desc`,
    );
    return (data.results ?? []).map((item: any) => ({
      id: String(item.id),
      title: item.title ?? "",
      url: item.doi ?? item.primary_location?.landing_page_url ?? item.id,
      source: "OpenAlex",
      publishedAt: new Date(item.publication_date ?? Date.now()).toISOString(),
      authors: (item.authorships ?? [])
        .map((author: any) => author.author?.display_name)
        .filter(Boolean),
      institutions: (item.authorships ?? [])
        .flatMap((author: any) => author.institutions ?? [])
        .map((institution: any) => institution.display_name)
        .filter(Boolean),
      subjects: [
        ...(item.concepts ?? []).map((x: any) => x.display_name),
        ...(item.keywords ?? []).map((x: any) => x.display_name),
      ].filter(Boolean),
      text: `${item.title ?? ""} ${(item.keywords ?? []).map((x: any) => x.display_name).join(" ")}`,
    }));
  }
  if (id === "github") {
    const data = await fetchJson(
      `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${limit}`,
    );
    return (data.items ?? []).map((item: any) => ({
      id: String(item.id),
      title: item.full_name,
      url: item.html_url,
      source: "GitHub",
      publishedAt: new Date(item.updated_at).toISOString(),
      authors: item.owner?.login ? [item.owner.login] : [],
      institutions: [],
      subjects: item.topics ?? [],
      text: `${item.full_name} ${item.description ?? ""} ${(item.topics ?? []).join(" ")}`,
    }));
  }
  if (id === "semantic") {
    const key =
      monitor.sourceSettings?.semantic?.apiKey?.trim() ||
      process.env.SEMANTIC_SCHOLAR_API_KEY;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 10)}&fields=title,abstract,authors,publicationDate,url,fieldsOfStudy,venue`;
    try {
      const data = await fetchJsonWithRetry(
        url,
        3,
        key ? { "x-api-key": key } : {},
      );
      return (data.data ?? []).map((item: any) => ({
        id: String(item.paperId),
        title: item.title ?? "",
        url:
          item.url ?? `https://www.semanticscholar.org/paper/${item.paperId}`,
        source: "Semantic Scholar",
        publishedAt: new Date(item.publicationDate ?? Date.now()).toISOString(),
        authors: (item.authors ?? [])
          .map((author: any) => author.name)
          .filter(Boolean),
        institutions: [],
        subjects: item.fieldsOfStudy ?? [],
        abstract: item.abstract ?? undefined,
        text: `${item.title ?? ""} ${item.abstract ?? ""} ${(item.fieldsOfStudy ?? []).join(" ")}`,
      }));
    } catch (error) {
      if (String(error).includes("429"))
        throw new Error(
          key
            ? "Semantic Scholar API rate limit (429); verify the API key or retry later"
            : "Semantic Scholar API rate limit (429); configure an API key in Sources",
        );
      throw error;
    }
  }
  if (id === "huggingface") {
    const token = monitor.sourceSettings?.huggingface?.apiKey?.trim();
    const headers: Record<string, string> = token
      ? { Authorization: `Bearer ${token}` }
      : {};
    const primary = `https://huggingface.co/api/papers?query=${encodeURIComponent(query)}&limit=${limit}`;
    const fallback = `https://huggingface.co/api/daily_papers?limit=${limit}`;
    let data: any;
    try {
      data = await fetchJsonWithRetry(primary, 2, headers);
    } catch (primaryError) {
      try {
        data = await fetchJsonWithRetry(fallback, 2, headers);
      } catch {
        const detail =
          primaryError instanceof Error
            ? primaryError.message
            : "Request failed";
        throw new Error(
          `${detail}; configure a Hugging Face access token in Sources or check the network connection`,
        );
      }
    }
    return (data ?? [])
      .map((item: any) => item.paper ?? item)
      .map((item: any) => ({
        id: String(item.id ?? item.paperId),
        title: item.title ?? "",
        url:
          item.url ??
          `https://huggingface.co/papers/${item.id ?? item.paperId}`,
        source: "Hugging Face Papers",
        publishedAt: new Date(
          item.publishedAt ?? item.published_at ?? Date.now(),
        ).toISOString(),
        authors: (item.authors ?? [])
          .map((author: any) =>
            typeof author === "string" ? author : author.name,
          )
          .filter(Boolean),
        institutions: [],
        subjects: [],
        abstract: item.summary ?? item.abstract ?? undefined,
        text: `${item.title ?? ""} ${item.summary ?? item.abstract ?? ""}`,
      }));
  }
  if (id === "biorxiv") {
    const xml = await fetchText(
      `https://connect.biorxiv.org/biorxiv_xml.php?subject=${encodeURIComponent(query)}`,
    );
    return [
      ...xml.matchAll(/<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g),
    ]
      .slice(0, limit)
      .map((match) => {
        const block = match[1];
        const url =
          tag(block, "link") ||
          block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ||
          "https://www.biorxiv.org/";
        return {
          id: tag(block, "guid") || tag(block, "id") || url,
          title: tag(block, "title"),
          url,
          source: "bioRxiv",
          publishedAt: new Date(
            tag(block, "pubDate") || tag(block, "published") || Date.now(),
          ).toISOString(),
          authors: tag(block, "creator").split(/,\s*/).filter(Boolean),
          institutions: [],
          subjects: [],
          abstract: tag(block, "description"),
          text: `${tag(block, "title")} ${tag(block, "description")}`,
        };
      });
  }
  if (id === "rsshub") {
    const feedUrl = monitor.sourceSettings?.rsshub?.baseUrl?.trim();
    if (!feedUrl)
      throw new Error(
        "Configure a complete RSSHub feed URL in Sources before running",
      );
    let parsed: URL;
    try {
      parsed = new URL(feedUrl);
    } catch {
      throw new Error("RSSHub feed URL is invalid");
    }
    if (!["http:", "https:"].includes(parsed.protocol))
      throw new Error("RSSHub feed URL must use HTTP or HTTPS");
    const xml = await fetchText(parsed.toString());
    return [
      ...xml.matchAll(/<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g),
    ]
      .slice(0, limit)
      .map((match) => {
        const block = match[1];
        const itemUrl =
          tag(block, "link") ||
          block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ||
          parsed.toString();
        const title = tag(block, "title");
        const description =
          tag(block, "description") ||
          tag(block, "summary") ||
          tag(block, "content");
        return {
          id: tag(block, "guid") || tag(block, "id") || itemUrl,
          title,
          url: itemUrl,
          source: "RSSHub",
          publishedAt: new Date(
            tag(block, "pubDate") ||
              tag(block, "published") ||
              tag(block, "updated") ||
              Date.now(),
          ).toISOString(),
          authors: [tag(block, "author") || tag(block, "creator")].filter(
            Boolean,
          ),
          institutions: [],
          subjects: [],
          abstract: description,
          text: `${title} ${description}`,
        };
      })
      .filter((item) => Boolean(item.title));
  }
  if (id === "arxiv") {
    const xml = await fetchText(
      `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=${limit}&sortBy=submittedDate&sortOrder=descending`,
    );
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((match) => {
      const block = match[1];
      const url = tag(block, "id");
      const arxivId =
        url.split("/abs/")[1] ?? url.split("/api/query?id_list=")[1] ?? url;
      const authors = [
        ...block.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g),
      ].map((item) => decode(item[1]));
      const subjects = [
        ...block.matchAll(/<category[^>]+term=["']([^"']+)["']/g),
      ].map((item) => item[1]);
      const primary =
        block.match(
          /<arxiv:primary_category[^>]+term=["']([^"']+)["']/i,
        )?.[1] ??
        subjects[0] ??
        "";
      const abstract = tag(block, "summary");
      const version = arxivId.match(/v(\d+)$/)?.[1] ?? "1";
      const published = tag(block, "published");
      const updated = tag(block, "updated") || published;
      return {
        id: url,
        title: tag(block, "title"),
        url,
        source: "arXiv",
        publishedAt: new Date(published || Date.now()).toISOString(),
        updatedAt: new Date(updated || published || Date.now()).toISOString(),
        authors,
        institutions: [],
        subjects,
        abstract,
        category: primary,
        citation: `arXiv:${arxivId.replace(/v\d+$/, "")} [${primary}]`,
        doi: `https://doi.org/10.48550/arXiv.${arxivId.replace(/v\d+$/, "")}`,
        version: `v${version}`,
        text: `${tag(block, "title")} ${abstract} ${subjects.join(" ")}`,
      };
    });
  }
  throw new Error("Provider execution is not implemented yet");
}

function matches(item: RawItem, monitor: MonitorRecord) {
  const text = item.text.toLowerCase();
  const includes = monitor.includeKeywords.map((x) => x.toLowerCase());
  const excludes = monitor.excludeKeywords.map((x) => x.toLowerCase());
  if (excludes.some((word) => text.includes(word))) return false;
  return monitor.matchMode === "all"
    ? includes.every((word) => text.includes(word))
    : includes.some((word) => text.includes(word));
}

export async function POST(request: Request) {
  const startedAt = new Date().toISOString();
  try {
    const monitor = (await request.json()) as ExecuteMonitor;
    const errors: string[] = [];
    const raw: RawItem[] = [];
    for (const sourceId of monitor.sourceIds) {
      try {
        raw.push(...(await fetchProvider(sourceId, monitor)));
      } catch (error) {
        errors.push(
          `${sourceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
    for (const url of monitor.customSourceUrls) {
      try {
        const xml = await fetchText(url);
        raw.push(
          ...[
            ...xml.matchAll(
              /<(?:item|entry)[^>]*>([\s\S]*?)<\/(?:item|entry)>/g,
            ),
          ]
            .slice(0, monitor.maxResults)
            .map((match) => {
              const block = match[1];
              const link =
                tag(block, "link") ||
                block.match(/<link[^>]+href=["']([^"']+)/i)?.[1] ||
                "";
              return {
                id: tag(block, "guid") || tag(block, "id") || link,
                title: tag(block, "title"),
                url: link,
                source: new URL(url).hostname,
                publishedAt: new Date(
                  tag(block, "pubDate") ||
                    tag(block, "published") ||
                    Date.now(),
                ).toISOString(),
                text: `${tag(block, "title")} ${tag(block, "description") || tag(block, "summary")}`,
              };
            }),
        );
      } catch (error) {
        errors.push(
          `${url}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }
    const unique = [...new Map(raw.map((item) => [item.id, item])).values()];
    const matched = unique
      .filter((item) => matches(item, monitor))
      .slice(0, monitor.maxResults);
    const fetchedAt = new Date().toISOString();
    const findings: FindingRecord[] = matched.map((item) => ({
      id: `${monitor.id}:${item.source}:${item.id}`,
      monitorId: monitor.id,
      title: item.title,
      url: item.url,
      source: item.source,
      fetchedAt,
      publishedAt: item.publishedAt,
      updatedAt: item.updatedAt,
      keywords: monitor.includeKeywords.filter((word) =>
        item.text.toLowerCase().includes(word.toLowerCase()),
      ),
      authors: item.authors ?? [],
      institutions: item.institutions ?? [],
      subjects: item.subjects ?? [],
      abstract: item.abstract,
      category: item.category,
      citation: item.citation,
      doi: item.doi,
      version: item.version,
    }));
    const execution: ExecutionRecord = {
      id: crypto.randomUUID(),
      monitorId: monitor.id,
      monitorName: monitor.name,
      startedAt,
      finishedAt: new Date().toISOString(),
      status:
        errors.length === 0
          ? "success"
          : unique.length > 0
            ? "partial"
            : "failed",
      scanned: unique.length,
      findings: findings.length,
      errors,
    };
    return NextResponse.json({ execution, findings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Execution failed" },
      { status: 500 },
    );
  }
}
