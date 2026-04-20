import axios from "axios";

const BASE_URL = "https://api.openalex.org/works";
const EMAIL = process.env.OPENALEX_EMAIL || "curalink@research.ai"; // polite pool

/**
 * Search OpenAlex for publications.
 * @param {string} query
 * @param {number} perPage - up to 200
 * @param {number} fromYear - filter recency
 * @returns {Promise<Publication[]>}
 */
export async function searchOpenAlex(query, perPage = 80, fromYear = 2018) {
  try {
    const params = {
      search: query,
      "per-page": Math.min(perPage, 200),
      page: 1,
      sort: "relevance_score:desc",
      filter: `from_publication_date:${fromYear}-01-01`,
      mailto: EMAIL,
    };

    const res = await axios.get(BASE_URL, { params, timeout: 15000 });
    const works = res.data?.results || [];

    return works.map((w) => {
      const authors = (w.authorships || []).slice(0, 4).map(
        (a) => a.author?.display_name || "Unknown"
      );

      const year = w.publication_year || 0;
      const abstract = rebuildAbstract(w.abstract_inverted_index) || "Abstract not available.";
      const journal =
        w.primary_location?.source?.display_name ||
        w.host_venue?.display_name ||
        "";
      const citations = w.cited_by_count || 0;
      const url =
        w.primary_location?.landing_page_url ||
        w.doi ||
        `https://openalex.org/${w.id}`;

      return {
        id: `openalex_${w.id?.replace("https://openalex.org/", "")}`,
        title: w.title || "Untitled",
        authors,
        year,
        source: "OpenAlex",
        abstract,
        url,
        citations,
        journal,
      };
    });
  } catch (err) {
    console.error("[OpenAlex]", err.message);
    return [];
  }
}

/**
 * Reconstruct abstract from OpenAlex's inverted index format.
 * @param {Record<string, number[]>|null} invertedIndex
 */
function rebuildAbstract(invertedIndex) {
  if (!invertedIndex) return null;
  const positions = [];
  for (const [word, locs] of Object.entries(invertedIndex)) {
    for (const pos of locs) {
      positions.push({ pos, word });
    }
  }
  positions.sort((a, b) => a.pos - b.pos);
  return positions.map((p) => p.word).join(" ");
}
