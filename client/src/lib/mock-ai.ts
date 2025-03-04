
import { apiRequest } from "@/lib/queryClient";

export async function generateContent(keywords: string[]): Promise<string> {
  try {
    const response = await apiRequest("/api/generate", {
      method: "POST",
      body: JSON.stringify({ keywords, type: "content" }),
    });
    return response.content;
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content. Please try again.");
  }
}

export async function generateSEOTitle(keywords: string[]): Promise<string> {
  try {
    const response = await apiRequest("/api/generate", {
      method: "POST",
      body: JSON.stringify({ keywords, type: "title" }),
    });
    return response.content;
  } catch (error) {
    console.error("Error generating SEO title:", error);
    throw new Error("Failed to generate SEO title. Please try again.");
  }
}

export async function generateMetaDescription(keywords: string[]): Promise<string> {
  try {
    const response = await apiRequest("/api/generate", {
      method: "POST",
      body: JSON.stringify({ keywords, type: "description" }),
    });
    return response.content;
  } catch (error) {
    console.error("Error generating meta description:", error);
    throw new Error("Failed to generate meta description. Please try again.");
  }
}
