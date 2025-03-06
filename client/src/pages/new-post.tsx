import { useState } from "react";
import { useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { Navbar } from "@/components/navbar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import type { InsertBlogPost } from "@shared/schema";

export default function NewPost() {
  const [, navigate] = useLocation();

  const createPost = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      const response = await apiRequest("POST", "/api/posts", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      navigate("/blogs");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-8">Create New Post</h1>
        <BlogForm 
          onSubmit={async (data) => {
            await createPost.mutateAsync(data);
          }}
          isLoading={createPost.isPending}
        />
      </div>
    </div>
  );
}