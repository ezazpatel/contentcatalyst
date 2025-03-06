import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertBlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock } from "lucide-react";

export default function NewPost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      return await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      navigate("/blogs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const checkScheduledMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/check-scheduled");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: data.message || "Successfully checked for scheduled posts",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to check for scheduled posts",
        variant: "destructive",
      });
    },
  });

  const handleCheckScheduled = () => {
    checkScheduledMutation.mutate();
  };

  const defaultValues: InsertBlogPost = {
    title: "",
    content: "",
    keywords: [""],
    affiliateLinks: [{ name: "", url: "" }],
    scheduledDate: new Date(),
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    headings: [],
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Create a New Blog Post
          </h1>
          <Button 
            onClick={handleCheckScheduled}
            disabled={checkScheduledMutation.isPending}
            variant="outline"
            className="flex items-center gap-2"
          >
            <CalendarClock className="h-4 w-4" />
            {checkScheduledMutation.isPending ? "Checking..." : "Check Scheduled Posts"}
          </Button>
        </div>
        <div className="mt-8">
          <BlogForm
            defaultValues={defaultValues}
            onSubmit={(data) => createPost.mutate(data as InsertBlogPost)}
            isLoading={createPost.isPending}
          />
        </div>
      </main>
    </div>
  );
}