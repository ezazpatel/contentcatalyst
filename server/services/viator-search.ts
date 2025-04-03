import { VIATOR_BASE_URL } from "./viator-api";

interface ViatorSearchResult {
  productCode: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  webURL: string;
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
  25871,
  28792,
  4413,
  22870,
  51622,
  22871,
  5643,
  4401,
  5419,
  5420,
  260,
  50891,
  5421,
  28470,
  817,
  611,
  262,
  50645,
  50647,
  4403,
  25663,
  50494,
  25664,
  23636,
  23637,
  261,
  50914,
  23789,
  22363,
  22366,
  22562,
  617,
  618,
  22365,
  50579,
  4408,
  616,
  30423,
  29722,
  263,
  50915,
  51539,
  51561,
  51749,
  28610,
  622,
  50495,
  50908,
  623,
  51581,
  28773,
  773,
  50582,
  50648,
  264,
  28611,
  50497,
  625,
  626,
  4808,
];

export async function searchViatorProducts(
  keyword: string,
  limit: number = 10,
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

    return data.products.results;
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
