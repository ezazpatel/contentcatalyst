import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Image as ImageIcon,
} from "lucide-react";

interface RichEditorProps {
  title: string;
  content: string;
  seoTitle: string;
  seoDescription: string;
  metaTags: string[];
  slug: string;
  onTitleChange: (value: string) => void;
  onContentChange: (value: string) => void;
  onSEOTitleChange: (value: string) => void;
  onSEODescriptionChange: (value: string) => void;
  onMetaTagsChange: (value: string[]) => void;
  onSlugChange: (value: string) => void;
}

export function RichEditor({
  title,
  content,
  seoTitle,
  seoDescription,
  metaTags,
  slug,
  onTitleChange,
  onContentChange,
  onSEOTitleChange,
  onSEODescriptionChange,
  onMetaTagsChange,
  onSlugChange,
}: RichEditorProps) {
  const [selectedTab, setSelectedTab] = useState("write");

  const handleFormat = (tag: string) => {
    const textarea = document.querySelector("textarea");
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    switch (tag) {
      case "b":
        onContentChange(`${before}**${selected}**${after}`);
        break;
      case "i":
        onContentChange(`${before}_${selected}_${after}`);
        break;
      case "h1":
        onContentChange(`${before}\n# ${selected}\n${after}`);
        break;
      case "h2":
        onContentChange(`${before}\n## ${selected}\n${after}`);
        break;
      case "li":
        onContentChange(`${before}\n- ${selected}\n${after}`);
        break;
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="space-y-4">
          <Input
            placeholder="Post Title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="text-2xl font-bold"
          />

          <Input
            placeholder="URL Slug"
            value={slug}
            onChange={(e) => onSlugChange(e.target.value)}
            className="font-mono text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {metaTags.map((tag, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={tag}
                  onChange={(e) => {
                    const newTags = [...metaTags];
                    newTags[index] = e.target.value;
                    onMetaTagsChange(newTags);
                  }}
                  placeholder="Meta Tag"
                  className="w-32"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newTags = metaTags.filter((_, i) => i !== index);
                    onMetaTagsChange(newTags);
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onMetaTagsChange([...metaTags, ""])}
            >
              Add Meta Tag
            </Button>
          </div>

          <Input
            placeholder="SEO Title"
            value={seoTitle}
            onChange={(e) => onSEOTitleChange(e.target.value)}
          />

          <Textarea
            placeholder="SEO Description"
            value={seoDescription}
            onChange={(e) => onSEODescriptionChange(e.target.value)}
            className="h-20"
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("b")}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("i")}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("h1")}
            title="Heading 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("h2")}
            title="Heading 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleFormat("li")}
            title="List"
          >
            <List className="h-4 w-4" />
          </Button>
          {/* Image upload button remains from original code */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {/* TODO: Image upload */}}
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={selectedTab === "write" ? "secondary" : "ghost"}
            onClick={() => setSelectedTab("write")}
          >
            Write
          </Button>
          <Button
            variant={selectedTab === "preview" ? "secondary" : "ghost"}
            onClick={() => setSelectedTab("preview")}
          >
            Preview
          </Button>
        </div>

        {selectedTab === "write" ? (
          <textarea
            className="w-full h-[400px] p-4 border rounded-md font-mono"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Write your content here using Markdown..."
          />
        ) : (
          <div
            className="w-full h-[400px] p-4 border rounded-md prose prose-sm overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}
      </Card>
    </div>
  );
}