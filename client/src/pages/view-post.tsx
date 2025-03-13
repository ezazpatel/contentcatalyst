import React, { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { useQuery } from "@tanstack/react-query";

interface BlogPost {
  id: number;
  title: string;
  content: string;
  short_description: string;
  created_at: string;
  updated_at: string;
  featured: boolean;
  categories: string[];
  tags: string[];
  author: string;
  wordpressUrl: string;
  affiliate_links: Record<string, string>;
}

function ViewPost() {
  const [, params] = useRoute<{ id: string }>("/posts/:id");
  const postId = params?.id;

  const { data: post, isLoading, error } = useQuery<BlogPost>({
    queryKey: ["post", postId],
    queryFn: async () => {
      const response = await fetch(`/api/posts/${postId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post");
      }
      const data = await response.json();
      return data;
    },
    enabled: !!postId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto my-8 px-4">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Posts
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container mx-auto my-8 px-4">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/posts">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Posts
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <h2 className="text-2xl font-bold text-red-500 mb-2">
                Error Loading Post
              </h2>
              <p className="text-gray-600">
                {error ? (error as Error).message : "Post not found"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  }

  return (
    <div className="container mx-auto my-8 px-4 max-w-4xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/posts">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Posts
          </Link>
        </Button>
      </div>
      <Card>
        <CardContent className="p-6">
          <article className="prose lg:prose-xl prose-slate mx-auto">
            <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
            <div className="flex items-center text-sm text-gray-500 mb-4">
              {post.author && <span className="mr-3">By {post.author}</span>}
              <span>
                Published on {formatDate(post.created_at)}
                {post.updated_at !== post.created_at &&
                  ` (Updated on ${formatDate(post.updated_at)})`}
              </span>
            </div>
            <div className="mb-4">
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-block bg-gray-100 rounded-full px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <MarkdownRenderer content={post.content} />
          </article>
        </CardContent>
      </Card>
    </div>
  );
}

export default ViewPost;