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
  Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [localTitle, setLocalTitle] = useState(title);
  const [localContent, setLocalContent] = useState(content);
  const [localSeoTitle, setLocalSeoTitle] = useState(seoTitle);
  const [localSeoDescription, setLocalSeoDescription] = useState(seoDescription);
  const [localMetaTags, setLocalMetaTags] = useState(metaTags);
  const [localSlug, setLocalSlug] = useState(slug);
  const { toast } = useToast();

  const handleSave = () => {
    onTitleChange(localTitle);
    onContentChange(localContent);
    onSEOTitleChange(localSeoTitle);
    onSEODescriptionChange(localSeoDescription);
    onMetaTagsChange(localMetaTags);
    onSlugChange(localSlug);

    toast({
      title: "Changes saved",
      description: "Your changes have been saved successfully.",
    });
  };

  const handleFormat = (command: string) => {
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    if (!editor) return;

    document.execCommand(command, false);
    setLocalContent(editor.innerHTML);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card className="p-4">
        <div className="space-y-4">
          <Input
            placeholder="Post Title"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="text-2xl font-bold"
          />

          <Input
            placeholder="URL Slug"
            value={localSlug}
            onChange={(e) => setLocalSlug(e.target.value)}
            className="font-mono text-sm"
          />

          <div className="flex flex-wrap gap-2">
            {localMetaTags.map((tag, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={tag}
                  onChange={(e) => {
                    const newTags = [...localMetaTags];
                    newTags[index] = e.target.value;
                    setLocalMetaTags(newTags);
                  }}
                  placeholder="Meta Tag"
                  className="w-32"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newTags = localMetaTags.filter((_, i) => i !== index);
                    setLocalMetaTags(newTags);
                  }}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocalMetaTags([...localMetaTags, ""])}
            >
              Add Meta Tag
            </Button>
          </div>

          <Input
            placeholder="SEO Title"
            value={localSeoTitle}
            onChange={(e) => setLocalSeoTitle(e.target.value)}
          />

          <Textarea
            placeholder="SEO Description"
            value={localSeoDescription}
            onChange={(e) => setLocalSeoDescription(e.target.value)}
            className="h-20"
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFormat('bold')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFormat('italic')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFormat('formatBlock')}
              title="Heading 1"
            >
              <Heading1 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFormat('formatBlock')}
              title="Heading 2"
            >
              <Heading2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleFormat('insertUnorderedList')}
              title="List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {/* TODO: Image upload */}}
              title="Insert Image"
            >
              <ImageIcon className="h-4 w-4" />
            </Button>
          </div>

          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>

        <div
          contentEditable
          className="min-h-[400px] p-4 border rounded-md prose prose-sm max-w-none focus:outline-none"
          dangerouslySetInnerHTML={{ __html: localContent }}
          onInput={(e) => setLocalContent(e.currentTarget.innerHTML)}
        />
      </Card>
    </div>
  );
}