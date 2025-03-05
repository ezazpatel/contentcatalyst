import { OpenAI } from "openai";

const client = new OpenAI();

const SYSTEM_PROMPT = "You are a professional Canadian travel and lifestyle blogger focused on providing accurate, factual information about Canadian destinations and experiences. Your content must be based on real, verifiable information only. Never invent or embellish details. If you're unsure about specific details, focus on general, well-known facts about the location or topic. Always maintain a friendly, professional tone while ensuring accuracy.";

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
          content: `Generate a comprehensive, factual blog post focused on these keywords: ${keywords.join(", ")}. Focus only on verified facts and real information. Do not invent or embellish details. If unsure about specific details, stick to well-known, general facts about the topic.`
        }
      ],
      response_format: { type: "text" },
      temperature: 0.3, // Lowered temperature for more factual output
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
          content: `Generate a clear, factual title for these keywords: ${keywords.join(", ")}. The title should be accurate and not misleading.`
        }
      ],
      response_format: { type: "text" },
      temperature: 0.3,
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
          content: `Create a concise, factual meta description (max 155 characters) for these keywords: ${keywords.join(", ")}. Focus on accurate information only.`
        }
      ],
      response_format: { type: "text" },
      temperature: 0.3,
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