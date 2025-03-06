# Complete GPT Prompts Used for Blog Generation

## 1. Title and Outline Generation Prompt
```
You are a professional content writer creating factual, well-researched blog content. Your task is to write about: ${context}

Keywords to focus on: ${keywords.join(", ")}

Important Instructions:
1. Only include factual, verifiable information. No made-up stories or speculative content.
2. Use credible sources and current data where applicable.
3. Natural tone while maintaining professionalism.
4. Include the keyword phrases naturally without forcing them.
5. The blog post structure should naturally incorporate these affiliate products/services as section headings where appropriate: ${affiliateLinks.map(link => link.name).join(", ")}

Create a title and outline for a comprehensive blog post with these specifications:
1. Introduction
2. 6-8 main sections including affiliate products as section headings where relevant
3. 2-3 sub-sections for each main section
4. Conclusion

Respond in JSON format with these fields: 'title' and 'outline' (an array of section objects containing 'heading' and 'subheadings' array).
```

## 2. Introduction Generation Prompt
```
Write a factual, well-researched introduction for a blog post with the title: "${title}". 

Context: ${context}
Keywords: ${keywords.join(", ")}

Important Instructions:
1. Only include verifiable facts and data
2. No speculative or made-up content
3. Natural tone while maintaining professionalism
4. Include key statistics or data points where relevant

Also provide a compelling meta description under 155 characters.

Respond in JSON format with these fields: 'introduction' and 'description'.
```

## 3. Section Content Generation Prompt
For each section, the following prompt is used:
```
Write a factual, well-researched section for the heading "${section.heading}" that's part of an article titled "${title}".

Context: ${context}
Keywords: ${keywords.join(", ")}

Required subheadings:
${section.subheadings.join("\n")}

Important Instructions:
1. Only include verifiable facts and data
2. No speculative or made-up content
3. Natural tone while maintaining professionalism
4. Include relevant statistics and data points
${!matchingLink && affiliateLinks.length > 0 ? `5. If relevant, naturally incorporate ONE of these unused affiliate links:
${affiliateLinks
  .filter(link => !usedAffiliateLinks.has(link.name))
  .map(link => `   - [${link.name}](${link.url})`)
  .join('\n')}` : ''}

Format in markdown and make it informative and engaging.
```

## 4. Conclusion Generation Prompt
```
Write a factual, evidence-based conclusion for a blog post with the title: "${title}".

Context: ${context}
Keywords: ${keywords.join(", ")}

Important Instructions:
1. Summarize key points with supporting evidence
2. Include relevant statistics or data points discussed
3. No speculative or made-up content
4. End with actionable insights based on the presented facts

Format in markdown and end with a clear call to action.
```

Note: The system processes these prompts sequentially, building the complete blog post while tracking used affiliate links to ensure they're only used once and prominently displayed as section headers where appropriate.