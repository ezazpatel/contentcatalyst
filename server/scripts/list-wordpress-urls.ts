
import { storage } from "../storage";

async function listWordpressUrls() {
  try {
    const posts = await storage.getAllBlogPosts();
    const publishedPosts = posts.filter(post => post.wordpressUrl);
    
    console.log(`Found ${publishedPosts.length} posts with WordPress URLs:\n`);
    publishedPosts.forEach(post => {
      console.log(`Title: ${post.title}`);
      console.log(`WordPress URL: ${post.wordpressUrl}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error fetching WordPress URLs:', error);
  }
}

listWordpressUrls();
