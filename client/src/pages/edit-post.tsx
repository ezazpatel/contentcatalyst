import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateContent, generateSEOTitle, generateMetaDescription } from "@/lib/mock-ai";
import type { BlogPost, InsertBlogPost } from "@shared/schema";

export default function EditPost() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const { toast } = useToast();
  const isNew = !params?.id;

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
    enabled: !isNew,
  });

  const updatePost = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      if (isNew) {
        return await apiRequest("POST", "/api/posts", data);
      } else {
        return await apiRequest("PATCH", `/api/posts/${params?.id}`, data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post saved successfully",
      });
    },
  });

  const generateAIContent = async (keywords: string[]) => {
    try {
      const [content, title, description] = await Promise.all([
        generateContent(keywords),
        generateSEOTitle(keywords),
        generateMetaDescription(keywords),
      ]);

      updatePost.mutate({
        ...post!,
        content,
        title,
        seoTitle: title,
        seoDescription: description,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">
        {isNew ? "New Post" : "Edit Post"}
      </h1>

      <div className="grid gap-8">
        <BlogForm
          defaultValues={post}
          onSubmit={(data) => updatePost.mutate(data)}
          isLoading={updatePost.isPending}
        />

        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Content</h2>
          
          <div className="flex gap-4 mb-4">
            <Button
              onClick={() => generateAIContent(post?.keywords || [])}
              disabled={updatePost.isPending}
            >
              Generate AI Content
            </Button>
          </div>

          <Input
            placeholder="SEO Title"
            value={post?.seoTitle || ""}
            onChange={(e) =>
              updatePost.mutate({ ...post!, seoTitle: e.target.value })
            }
          />

          <Textarea
            placeholder="SEO Description"
            value={post?.seoDescription || ""}
            onChange={(e) =>
              updatePost.mutate({ ...post!, seoDescription: e.target.value })
            }
          />

          <RichEditor
            value={post?.content || ""}
            onChange={(content) => updatePost.mutate({ ...post!, content })}
          />
        </div>
      </div>
    </div>
  );
}
