import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Link } from "wouter";

export default function ViewPost() {
  const [match, params] = useRoute<{ id: string }>("/view/:id");
  const { toast } = useToast();

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${params?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post");
      }
      return response.json();
    },
    enabled: !!params?.id,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch post",
        variant: "destructive",
      });
    },
  });

  if (!match) {
    return <Link href="/blogs">Redirecting to blogs...</Link>;
  }

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  console.log('ViewPost: Query state:', { isLoading, post: post?.id });

  if (!post) {
    console.log('ViewPost: No post found');
    return (
      <div className="container mx-auto py-8">
        Post not found. <Link href="/blogs"><Button>Back to Posts</Button></Link>
      </div>
    );
  }

  const imageMatches = post.content?.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];

  console.log('[Image Debug]', {
    postId: post.id,
    title: post.title,
    totalImages: imageMatches.length,
    images: imageMatches.map(img => {
      const match = img.match(/!\[([^\]]*)\]\(([^)]*)\)/);
      if (!match) return null;
      return {
        alt: match[1],
        url: match[2],
        raw: img
      };
    }).filter(Boolean),
    affiliateImages: post.affiliateImages?.length || 0,
    affiliateUrls: post.affiliateImages?.map(img => ({
      url: img.affiliateUrl,
      alt: img.alt,
      imageUrl: img.url
    }))
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <Link href="/blogs">
          <Button variant="outline">Back to Posts</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-lg max-w-none prose-img:max-w-full prose-img:mx-auto prose-img:rounded-lg">
            <MarkdownRenderer
              content={post.content.replace(/^#\s+.*\n/, '')}
              affiliateImages={post.affiliateImages}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}