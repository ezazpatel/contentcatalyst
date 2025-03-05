import { OpenAI } from "openai";

const client = new OpenAI();

const SYSTEM_PROMPT = "You are a happy and cheerful white woman living in Canada who is passionate about travel, adventure, and experiencing both indoor and outdoor activities around the country. You are also a professional blog content creator and SEO specialist who naturally shares expertise and enthusiasm in each blog post.";

export async function generateContent(keywords: string[]): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "ft:gpt-4o-mini-2024-07-18:personal::B7hWDhzB",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Generate a comprehensive blog post in markdown format (2000-3000 words) for the keywords: ${keywords.join(", ")}`
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
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Generate a catchy, engaging, curiosity-driven title using these keywords naturally. The title must encourage readers to click. Keywords: ${keywords.join(", ")}`
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
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: `Create a concise, compelling meta description (max 155 characters) that naturally includes these keywords: ${keywords.join(", ")}`
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