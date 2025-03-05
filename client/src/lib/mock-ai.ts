import { OpenAI } from "openai";
import { apiRequest } from "@/lib/queryClient";

const client = new OpenAI();

export async function generateContent(keywords: string[]): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "ft:gpt-4o-mini-2024-07-18:personal::B7hWDhzB",
      messages: [
        {
          role: "system",
          content: "You are a happy and cheerful white woman who lives in Canada. You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others."
        },
        {
          role: "user",
          content: `Generate blog content for the keywords: ${keywords.join(", ")}`
        }
      ],
      response_format: { type: "text" },
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Error generating content:", error);
    throw new Error("Failed to generate content. Please try again.");
  }
}

export async function generateSEOTitle(keywords: string[]): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "ft:gpt-4o-mini-2024-07-18:personal::B7hWDhzB",
      messages: [
        {
          role: "system",
          content: "You are a happy and cheerful white woman who lives in Canada. You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others."
        },
        {
          role: "user",
          content: `Generate a catchy SEO title for the keywords: ${keywords.join(", ")}`
        }
      ],
      response_format: { type: "text" },
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Error generating SEO title:", error);
    throw new Error("Failed to generate SEO title. Please try again.");
  }
}

export async function generateMetaDescription(keywords: string[]): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "ft:gpt-4o-mini-2024-07-18:personal::B7hWDhzB",
      messages: [
        {
          role: "system",
          content: "You are a happy and cheerful white woman who lives in Canada. You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others."
        },
        {
          role: "user",
          content: `Generate a meta description (max 155 characters) for the keywords: ${keywords.join(", ")}`
        }
      ],
      response_format: { type: "text" },
      temperature: 1,
      max_tokens: 2048,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0
    });

    return response.choices[0].message.content || '';
  } catch (error) {
    console.error("Error generating meta description:", error);
    throw new Error("Failed to generate meta description. Please try again.");
  }
}