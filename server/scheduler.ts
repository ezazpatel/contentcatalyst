
import { BlogPost, BlogPostStatus } from "../shared/schema";
import { storage } from "./storage";

interface GenerationResult {
  content: string;
}

export async function generateBlogPost(post: BlogPost): Promise<GenerationResult | null> {
  try {
    // First update the post status to generating
    await storage.updateBlogPost(post.id, {
      status: BlogPostStatus.GENERATING
    });
    
    // Example blog post content generation
    const sections = post.keywords && post.keywords.length > 0 
      ? post.keywords.map(keyword => `## ${keyword}\n\nContent about ${keyword}...`)
      : ['## Section 1\n\nDefault section content...'];
    
    const introduction = `# ${post.title}\n\n${post.description || 'Introduction to the blog post...'}\n\n`;
    const conclusion = '\n\n## Conclusion\n\nThank you for reading this blog post!';
    
    const content = introduction + sections.join('\n\n') + conclusion;
    
    // Return the generated content
    return {
      content
    };
  } catch (error) {
    console.error("Error generating blog post:", error);
    return null;
  }
}

// Function to schedule blog post generation and publishing
export async function scheduleBlogPosts() {
  try {
    // Get all scheduled posts that are due for publication
    const now = new Date();
    const blogPosts = await storage.getAllBlogPosts();
    
    const scheduledPosts = blogPosts.filter(post => {
      if (post.status !== BlogPostStatus.SCHEDULED) return false;
      
      const scheduledDate = new Date(post.scheduledDate);
      return scheduledDate <= now;
    });
    
    // Generate each scheduled post
    for (const post of scheduledPosts) {
      console.log(`Generating scheduled post: ${post.title}`);
      const result = await generateBlogPost(post);
      
      if (result) {
        await storage.updateBlogPost(post.id, {
          content: result.content,
          status: BlogPostStatus.PUBLISHED
        });
        console.log(`Published scheduled post: ${post.title}`);
      }
    }
  } catch (error) {
    console.error("Error in scheduled post generation:", error);
  }
}
