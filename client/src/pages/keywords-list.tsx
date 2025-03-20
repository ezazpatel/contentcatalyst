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
import { useState } from "react";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { CSVUpload } from "@/components/csv-upload"; // Added import

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
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedKeyword, setSelectedKeyword] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteKeyword = useMutation({
    mutationFn: async (keyword: string) => {
      const response = await fetch(`/api/keywords/${encodeURIComponent(keyword)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete keyword");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Keyword deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete keyword",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Create a map of keywords to their associated posts
  const keywordMap = new Map<string, KeywordEntry>();
  posts?.forEach((post) => {
    post.keywords.forEach((keyword) => {
      // Always update with the most recent post for this keyword
      const existingEntry = keywordMap.get(keyword);
      const newDate = new Date(post.scheduledDate || post.publishedDate || 0);

      if (!existingEntry || newDate > existingEntry.publishDate) {
        keywordMap.set(keyword, {
          keyword,
          status: post.status,
          publishDate: newDate,
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

  // Added createPosts mutation -  needs to be defined elsewhere and likely uses a backend API.
  const createPosts = useMutation({
    mutationFn: async (posts: InsertBlogPost[]) => {
      //Implementation to send posts to backend goes here.  Requires a backend API endpoint.
      const res = await fetch('/api/posts/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(posts)
      })
      if (!res.ok) throw new Error("Failed to create posts");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Posts created successfully",
      });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: `Failed to create posts: ${err.message}`,
        variant: "destructive",
      });
    }
  })


  type InsertBlogPost = {
    title: string;
    content: string;
    keywords: string[];
    scheduledDate?: string;
  }

  return (
    <div>
      <div className="container mx-auto py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Keywords</h1>
          <div className="flex space-x-4">
            <CSVUpload
              onUpload={(data) => {
                // Handle bulk uploads
                // This will go through the dashboard's create post mutation
                const typedData = data as InsertBlogPost[];
                createPosts.mutate(typedData);
              }}
            />
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
                    <div className="flex gap-2">
                      {entry.blogId ? (
                        <Link href={`/view/${entry.blogId}`}>
                          <Button variant="outline" size="sm">View Post</Button>
                        </Link>
                      ) : (
                        <Link href="/">
                          <Button variant="outline" size="sm">Create Post</Button>
                        </Link>
                      )}
                      {entry.status !== "published" && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setSelectedKeyword(entry.keyword);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Keyword</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this keyword and all associated drafts? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteKeyword.mutate(selectedKeyword)}
                disabled={deleteKeyword.isPending}
              >
                {deleteKeyword.isPending ? "Deleting..." : "Delete"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}