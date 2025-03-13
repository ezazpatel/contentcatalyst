import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Save,
  Link,
  Heading1,
  Heading2,
  Heading3
} from "lucide-react";
import { MarkdownRenderer } from "./markdown-renderer";

interface RichEditorProps {
  initialContent: string;
  initialTitle: string;
  initialSlug?: string;
  initialDescription?: string;
  onSave: (data: { 
    content: string; 
    title: string; 
    slug?: string; 
    description?: string; 
  }) => void;
}

export function RichEditor({
  initialContent = "",
  initialTitle = "",
  initialSlug = "",
  initialDescription = "",
  onSave
}: RichEditorProps) {
  const [localContent, setLocalContent] = useState(initialContent);
  const [localTitle, setLocalTitle] = useState(initialTitle);
  const [localSlug, setLocalSlug] = useState(initialSlug);
  const [localDescription, setLocalDescription] = useState(initialDescription);

  useEffect(() => {
    setLocalContent(initialContent);
    setLocalTitle(initialTitle);
    setLocalSlug(initialSlug);
    setLocalDescription(initialDescription);
  }, [initialContent, initialTitle, initialSlug, initialDescription]);

  const handleSave = () => {
    onSave({
      content: localContent,
      title: localTitle,
      slug: localSlug,
      description: localDescription,
    });
  };

  const insertMarkdown = (markdown: string) => {
    const textarea = document.getElementById('markdown-editor') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let newText = '';

    switch(markdown) {
      case 'bold':
        newText = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        newText = `*${selectedText || 'italic text'}*`;
        break;
      case 'link':
        newText = `[${selectedText || 'link text'}](url)`;
        break;
      case 'h1':
        newText = `# ${selectedText || 'Heading 1'}`;
        break;
      case 'h2':
        newText = `## ${selectedText || 'Heading 2'}`;
        break;
      case 'h3':
        newText = `### ${selectedText || 'Heading 3'}`;
        break;
      case 'ul':
        newText = `\n- ${selectedText || 'List item'}\n- Another item\n`;
        break;
      case 'ol':
        newText = `\n1. ${selectedText || 'List item'}\n2. Another item\n`;
        break;
      default:
        newText = selectedText;
    }

    const updatedContent = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
    setLocalContent(updatedContent);

    // Set selection to end of inserted markdown
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + newText.length;
      textarea.selectionStart = newCursorPos;
      textarea.selectionEnd = newCursorPos;
    }, 0);
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

          <Textarea
            placeholder="Description"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            className="h-20 text-sm"
          />

          <Tabs defaultValue="editor">
            <TabsList className="mb-2">
              <TabsTrigger value="editor">Markdown Editor</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="editor">
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('bold')}
                  title="Bold"
                >
                  <Bold className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('italic')}
                  title="Italic"
                >
                  <Italic className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('link')}
                  title="Link"
                >
                  <Link className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('h1')}
                  title="Heading 1"
                >
                  <Heading1 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('h2')}
                  title="Heading 2"
                >
                  <Heading2 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('h3')}
                  title="Heading 3"
                >
                  <Heading3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('ul')}
                  title="Bullet List"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => insertMarkdown('ol')}
                  title="Numbered List"
                >
                  <ListOrdered className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                id="markdown-editor"
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm p-4 resize-y"
                placeholder="Write your content using Markdown..."
              />
            </TabsContent>
            <TabsContent value="preview">
              <div className="min-h-[400px] border rounded p-4">
                <MarkdownRenderer content={localContent} />
              </div>
            </TabsContent>
          </Tabs>

          <Button onClick={handleSave} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            Save Post
          </Button>
        </div>
      </Card>
    </div>
  );
}