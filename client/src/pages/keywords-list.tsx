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
import { useState } from "react";
import { ArrowUpDown } from "lucide-react";

type KeywordEntry = {
  keyword: string;
  status: string;
  publishDate: Date;
  blogTitle: string;
  blogId: number;
};

type SortField = "publishDate" | "keyword" | "status";
type SortOrder = "asc" | "desc";

export default function KeywordsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  const [sortField, setSortField] = useState<SortField>("publishDate");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Create a map of keywords to their associated posts
  const keywordMap = new Map<string, KeywordEntry>();
  posts?.forEach((post) => {
    post.keywords.forEach((keyword) => {
      if (!keywordMap.has(keyword)) {
        keywordMap.set(keyword, {
          keyword,
          status: post.status,
          publishDate: new Date(post.scheduledDate || 0),
          blogTitle: post.title || "",
          blogId: post.id,
        });
      }
    });
  });

  const keywords = Array.from(keywordMap.values());
  const now = new Date();

  // Sort keywords based on current sort field and order
  const sortedKeywords = [...keywords].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case "publishDate":
        comparison = a.publishDate.getTime() - b.publishDate.getTime();
        break;
      case "keyword":
        comparison = a.keyword.localeCompare(b.keyword);
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Keywords</h1>
          <div className="flex space-x-4">
            <Link href="/new">
              <Button>New Post</Button>
            </Link>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead onClick={() => toggleSort("publishDate")} className="cursor-pointer">
                Date <ArrowUpDown className="inline h-4 w-4" />
              </TableHead>
              <TableHead onClick={() => toggleSort("keyword")} className="cursor-pointer">
                Keyword <ArrowUpDown className="inline h-4 w-4" />
              </TableHead>
              <TableHead onClick={() => toggleSort("status")} className="cursor-pointer">
                Status <ArrowUpDown className="inline h-4 w-4" />
              </TableHead>
              <TableHead>Blog Title</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedKeywords.map((entry) => {
              const isPublished = entry.status === "published";
              const isScheduled = !isPublished && entry.publishDate > now;

              return (
                <TableRow key={entry.keyword}>
                  <TableCell>
                    {entry.publishDate ? format(entry.publishDate, "PPP 'at' p") : "Not set"}
                  </TableCell>
                  <TableCell>{entry.keyword}</TableCell>
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
                  <TableCell>{entry.blogTitle || "Not created"}</TableCell>
                  <TableCell>
                    {entry.blogId ? (
                      <Link href={`/view/${entry.blogId}`}>
                        <Button variant="outline" size="sm">View Post</Button>
                      </Link>
                    ) : (
                      <Link href="/">
                        <Button variant="outline" size="sm">Create Post</Button>
                      </Link>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}