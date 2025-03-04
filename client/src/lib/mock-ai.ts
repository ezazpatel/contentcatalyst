export async function generateContent(keywords: string[]): Promise<string> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return `
# ${keywords[0]} - Your Complete Guide

## Introduction
Welcome to our comprehensive guide about ${keywords[0]}. In this article, we'll explore everything you need to know about this fascinating topic.

## Why ${keywords[0]} Matters
Understanding ${keywords[0]} is crucial for anyone interested in travel and experiences. Let's dive into the details.

## Top Tips for ${keywords[0]}
1. Research thoroughly
2. Plan ahead
3. Consider your options

## Final Thoughts
${keywords[0]} offers incredible opportunities for adventure and growth. Start your journey today!
`;
}

export async function generateSEOTitle(keywords: string[]): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return `${keywords[0]}: Ultimate Guide (${new Date().getFullYear()} Edition)`;
}

export async function generateMetaDescription(keywords: string[]): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, 500));
  return `Discover everything you need to know about ${keywords[0]} in our comprehensive guide. Expert tips, insider advice, and practical strategies for ${new Date().getFullYear()}.`;
}
