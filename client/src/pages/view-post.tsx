import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Link } from 'wouter';
import { Loader } from 'lucide-react';

export default function ViewPost() {
  const [, params] = useRoute('/posts/:id');
  const postId = params?.id;

  const { data: post, isLoading, error } = useQuery({
    queryKey: ['post', postId],
    queryFn: async () => {
      if (!postId) return null;
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch post');
      }
      return response.json();
    },
    enabled: !!postId,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load post. Please try again.',
        variant: 'destructive',
      });
    }
  }, [error]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Post not found</h1>
        <Button asChild>
          <Link href="/posts">Back to Posts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button asChild variant="outline" size="sm">
          <Link href="/posts">Back to Posts</Link>
        </Button>
      </div>

      <div className="bg-card rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-4">{post.title}</h1>

        <div className="flex items-center text-sm text-muted-foreground mb-6">
          <span>Published: {new Date(post.created_at).toLocaleDateString()}</span>
          {post.updated_at && (
            <span className="ml-4">
              Updated: {new Date(post.updated_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="prose dark:prose-invert max-w-none">
          <MarkdownRenderer content={post.content} />
        </div>

        {post.wordpress_url && (
          <div className="mt-8 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              This post was also published on WordPress:{' '}
              <a 
                href={post.wordpress_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View on WordPress
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}