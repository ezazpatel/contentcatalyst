import apiFetch from '@wordpress/api-fetch';
import type { BlogPost } from '@shared/schema';

export async function publishToWordPress(post: BlogPost) {
  try {
    // Configure WordPress API
    apiFetch.use(apiFetch.createRootURLMiddleware(process.env.WORDPRESS_API_URL));
    apiFetch.use(apiFetch.createNonceMiddleware(process.env.WORDPRESS_NONCE));

    // Create WordPress post
    const response = await apiFetch({
      path: '/wp/v2/posts',
      method: 'POST',
      data: {
        title: post.title,
        content: post.content,
        status: 'publish',
        excerpt: post.excerpt,
        meta: {
          _yoast_wpseo_metadesc: post.seoDescription,
          _yoast_wpseo_title: post.seoTitle,
        },
      },
    });

    return response;
  } catch (error) {
    console.error('Error publishing to WordPress:', error);
    throw new Error('Failed to publish to WordPress');
  }
}
