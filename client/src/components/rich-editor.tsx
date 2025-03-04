import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Image as ImageIcon,
} from "lucide-react";

interface RichEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function RichEditor({ value, onChange }: RichEditorProps) {
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
        onChange(`${before}**${selected}**${after}`);
        break;
      case "i":
        onChange(`${before}_${selected}_${after}`);
        break;
      case "h1":
        onChange(`${before}\n# ${selected}\n${after}`);
        break;
      case "h2":
        onChange(`${before}\n## ${selected}\n${after}`);
        break;
      case "li":
        onChange(`${before}\n- ${selected}\n${after}`);
        break;
    }
  };

  return (
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
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Write your content here using Markdown..."
        />
      ) : (
        <div
          className="w-full h-[400px] p-4 border rounded-md prose prose-sm overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      )}
    </Card>
  );
}
