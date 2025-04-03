import { VIATOR_BASE_URL } from "./viator-api";

interface ViatorDestination {
  ref: string; // The destination identifier as a string
  primary: boolean;
}

interface ViatorSearchResult {
  productCode: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  webURL: string;
  destinations?: ViatorDestination[];
}

interface ViatorSearchResponse {
  products: {
    results: ViatorSearchResult[];
  };
  totalCount: number;
}

// Hardcoded list of all known Canadian destination IDs
const CANADA_DESTINATION_IDS = [
  75, // Canada
  25871, // Newfoundland & Labrador
  28792, // St John's
  4413, // Sydney
  22870, // New Brunswick
  51622, // Hopewell Cape
  22871, // Saint John
  5643, // Prince Edward Island
  4401, // Charlottetown
  5419, // Yukon
  5420, // Whitehorse
  260, // Alberta (region)
  50891, // Canmore
  5421, // Jasper
  28470, // Edmonton
  817, // Calgary
  611, // Banff
  262, // Nova Scotia
  50645, // Kejimkujik National Park
  50647, // Cape Breton Island
  4403, // Halifax
  25663, // Manitoba
  50494, // Winnipeg
  25664, // Churchill
  23636, // Northwest Territories
  23637, // Yellowknife
  261, // British Columbia (region)
  50914, // Revelstoke
  23789, // Sunshine Coast
  22363, // Kootenay Rockies
  22366, // Kelowna & Okanagan Valley
  22562, // Kamloops
  617, // Victoria
  618, // Whistler
  22365, // Squamish
  50579, // Pemberton
  4408, // Prince Rupert
  616, // Vancouver
  30423, // Vancouver Island
  29722, // Fraser Valley
  263, // Ontario (region)
  50915, // Collingwood
  51539, // Huntsville
  51561, // Orillia
  51749, // Muskoka Lakes
  28610, // Peterborough & the Kawarthas
  622, // Ottawa
  50495, // Kingston
  50908, // Barrie
  623, // Toronto
  51581, // Muskoka District
  28773, // Windsor
  773, // Niagara Falls & Around
  50582, // Algonquin Provincial Park
  50648, // London
  264, // Quebec (region)
  28611, // Mont Tremblant
  50497, // Tadoussac
  625, // Montreal
  626, // Quebec City
  4808, // Trois-Rivieres
];

export async function searchViatorProducts(
  keyword: string,
  limit: number = 100,
  finalLimit: number = 10,
): Promise<ViatorSearchResult[]> {
  if (!process.env.VIATOR_API_KEY) {
    return [];
  }

  try {
    console.log(
      "🔍 Searching Viator products for Canada with keyword:",
      keyword,
    );

    const requestBody = {
      searchTerm: keyword,
      currency: "CAD",
      productFiltering: {
        ancestorDestinationIds: CANADA_DESTINATION_IDS,
      },
      searchTypes: [
        {
          searchType: "PRODUCTS",
          pagination: {
            start: 1,
            count: Math.min(limit, 50),
          },
        },
      ],
    };

    const response = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
      method: "POST",
      headers: {
        "exp-api-key": process.env.VIATOR_API_KEY!,
        Accept: "application/json;version=2.0",
        "Accept-Language": "en-US",
        "Content-Type": "application/json",
        "campaign-value": process.env.VIATOR_CAMPAIGN_ID || "",
      },
      body: JSON.stringify(requestBody),
    });

    console.log("📡 Search API Response Status:", response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error("Viator API response error:", {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      return [];
    }

    const data: ViatorSearchResponse = JSON.parse(responseText);
    if (!data.products || !Array.isArray(data.products.results)) {
      return [];
    }

    // Filter results: only keep products whose primary destination (from destinations.primary) is in the Canada list.
    const filteredResults = data.products.results.filter((product) => {
      if (!product.destinations || product.destinations.length === 0) {
        return false;
      }
      const primaryDestination = product.destinations.find((d) => d.primary);
      if (!primaryDestination) {
        return false;
      }
      // Convert the ref string to a number
      const destId = Number(primaryDestination.ref);
      return CANADA_DESTINATION_IDS.includes(destId);
    });

    console.log(
      `Filtered products count: ${filteredResults.length} out of ${data.products.results.length}`,
    );
    // Sort products by rating and review count to get the best matches
    const sortedResults = filteredResults.sort((a, b) => {
      const scoreA = (a.rating || 0) * Math.log(a.reviewCount || 1);
      const scoreB = (b.rating || 0) * Math.log(b.reviewCount || 1);
      return scoreB - scoreA;
    });

    // Return only the top N results (default 10)
    return sortedResults.slice(0, finalLimit);
  } catch (error) {
    console.error("Error searching Viator products:", error);
    return [];
  }
}

export async function getViatorAffiliateUrl(
  productCode: string,
): Promise<string | null> {
  try {
    if (!productCode) {
      return null;
    }

    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        "exp-api-key": process.env.VIATOR_API_KEY!,
        Accept: "application/json;version=2.0",
        "Accept-Language": "en-US",
        "campaign-value": process.env.VIATOR_CAMPAIGN_ID || "",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Failed to fetch product ${productCode}: ${response.statusText}`,
      );
      return null;
    }

    const data = await response.json();
    const baseUrl = data.webURL || data.bookingUrl || data.productUrl;

    if (!baseUrl) {
      console.error(
        "No URL found for product:",
        productCode,
        "Response:",
        JSON.stringify(data),
      );
      return null;
    }

    const url = new URL(baseUrl);
    url.searchParams.set("mcid", "42383");
    url.searchParams.set("pid", process.env.VIATOR_CAMPAIGN_ID || "P00217628");
    url.searchParams.set("medium", "api");
    url.searchParams.set("api_version", "2.0");

    return url.toString();
  } catch (error) {
    console.error("Error constructing affiliate URL:", error);
    return null;
  }
}
