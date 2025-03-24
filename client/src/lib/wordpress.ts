
import type { BlogPost } from '@shared/schema';

export async function publishToWordPress(post: BlogPost) {
  const response = await fetch('/api/wordpress/publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(post)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to publish to WordPress');
  }

  return response.json();
}
