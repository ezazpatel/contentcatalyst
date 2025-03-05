import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Navbar } from "@/components/navbar";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function KeywordsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  // Create a map of keywords to their associated posts
  const keywordMap = new Map();
  posts?.forEach((post) => {
    post.keywords.forEach((keyword) => {
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, {
          keyword,
          status: post.status,
          publishDate: new Date(post.scheduledDate),
          blogTitle: post.title,
          blogId: post.id,
        });
      }
    });
  });

  const keywords = Array.from(keywordMap.values());
  const now = new Date();

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Manage Keywords</h1>
          <div className="w-full sm:w-auto">
            <Link href="/new">
              <Button className="w-full sm:w-auto">New Post</Button>
            </Link>
          </div>
        </div>

        <div className="rounded-md border">
          <ScrollArea className="w-full overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Keyword</TableHead>
                  <TableHead className="min-w-[100px]">Status</TableHead>
                  <TableHead className="min-w-[180px]">Date</TableHead>
                  <TableHead className="min-w-[200px]">Blog Title</TableHead>
                  <TableHead className="min-w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.map((entry) => {
                  const isPublished = entry.status === "published";
                  const isScheduled = !isPublished && entry.publishDate && entry.publishDate > now;

                  return (
                    <TableRow key={entry.keyword}>
                      <TableCell className="font-medium">{entry.keyword}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            isPublished
                              ? "bg-green-100 text-green-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isPublished ? "Published" : isScheduled ? "Scheduled" : "Draft"}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {entry.publishDate ? format(entry.publishDate, "PPP 'at' p") : "Not set"}
                      </TableCell>
                      <TableCell className="max-w-[300px] truncate">
                        {entry.blogTitle || "Not created"}
                      </TableCell>
                      <TableCell>
                        {entry.blogId ? (
                          <Link href={`/view/${entry.blogId}`}>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              View Post
                            </Button>
                          </Link>
                        ) : (
                          <Link href="/">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              Create Post
                            </Button>
                          </Link>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}