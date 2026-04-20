import axios from "axios";
import { parseStringPromise } from "xml2js";

const ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const API_KEY = process.env.PUBMED_API_KEY || "";

/**
 * Search PubMed and return structured publications.
 * @param {string} query - Expanded search query
 * @param {number} maxResults - Number of IDs to fetch (50–100)
 * @returns {Promise<Publication[]>}
 */
export async function searchPubMed(query, maxResults = 80) {
  try {
    // Step 1: Get IDs
    const searchParams = {
      db: "pubmed",
      term: query,
      retmax: maxResults,
      sort: "pub date",
      retmode: "json",
    };
    if (API_KEY) searchParams.api_key = API_KEY;

    const searchRes = await axios.get(ESEARCH_URL, {
      params: searchParams,
      timeout: 15000,
    });

    const ids = searchRes.data?.esearchresult?.idlist || [];
    if (ids.length === 0) return [];

    // Step 2: Fetch details for all IDs (batch in 50s to avoid URI limit)
    const batchSize = 50;
    const publications = [];

    for (let i = 0; i < ids.length; i += batchSize) {
      const batch = ids.slice(i, i + batchSize);
      const fetchParams = {
        db: "pubmed",
        id: batch.join(","),
        retmode: "xml",
      };
      if (API_KEY) fetchParams.api_key = API_KEY;

      const fetchRes = await axios.get(EFETCH_URL, {
        params: fetchParams,
        timeout: 20000,
      });

      const parsed = await parseStringPromise(fetchRes.data, { explicitArray: true });
      const articles = parsed?.PubmedArticleSet?.PubmedArticle || [];

      for (const article of articles) {
        try {
          const medline = article.MedlineCitation?.[0];
          const articleData = medline?.Article?.[0];
          const pmid = medline?.PMID?.[0]?._ || medline?.PMID?.[0];

          const title = articleData?.ArticleTitle?.[0]?._ || articleData?.ArticleTitle?.[0] || "";
          const abstractTexts = articleData?.Abstract?.[0]?.AbstractText || [];
          const abstract = abstractTexts
            .map((t) => (typeof t === "string" ? t : t._ || ""))
            .join(" ")
            .trim();

          const authorList = articleData?.AuthorList?.[0]?.Author || [];
          const authors = authorList.slice(0, 4).map((a) => {
            const last = a.LastName?.[0] || "";
            const initials = a.Initials?.[0] || "";
            return `${last} ${initials}`.trim();
          });

          const journal = articleData?.Journal?.[0]?.Title?.[0] || "";
          const pubDateEl =
            articleData?.Journal?.[0]?.JournalIssue?.[0]?.PubDate?.[0];
          const year =
            parseInt(pubDateEl?.Year?.[0] || pubDateEl?.MedlineDate?.[0] || "0") || 0;

          if (!title || !pmid) continue;

          publications.push({
            id: `pubmed_${pmid}`,
            title: title.replace(/\.$/, ""),
            authors,
            year,
            source: "PubMed",
            abstract: abstract || "Abstract not available.",
            url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
            journal,
          });
        } catch {
          // Skip malformed articles
        }
      }
    }

    return publications;
  } catch (err) {
    console.error("[PubMed]", err.message);
    return [];
  }
}
