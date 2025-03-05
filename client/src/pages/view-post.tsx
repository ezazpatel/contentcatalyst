import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

export default function ViewPost() {
  const [, params] = useRoute<{ id: string }>("/view/:id");
  const [, navigate] = useLocation();
  const postId = params?.id ? parseInt(params.id) : null;

  if (!postId) {
    navigate("/blogs");
    return null;
  }

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/posts/${postId}`],
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!post) {
    return <div className="container mx-auto px-4 py-8">Post not found. <Button onClick={() => navigate("/blogs")}>Back to Posts</Button></div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto">
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Keywords: {post.keywords.join(", ")}
                </div>
                <CardTitle className="text-2xl sm:text-3xl">{post.title}</CardTitle>
              </div>
              <Button variant="outline" onClick={() => navigate("/blogs")} className="shrink-0">
                Back to Posts
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm sm:prose-base lg:prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {post.affiliateLinks.length > 0 && (
              <div className="mt-8 border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Related Links</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {post.affiliateLinks.map((link, index) => (
                    <li key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-words">
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 text-sm text-muted-foreground space-y-1">
              <p>Status: {post.status}</p>
              <p>Scheduled: {format(new Date(post.scheduledDate), "PPP")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}