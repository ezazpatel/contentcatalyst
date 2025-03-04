import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { insertBlogPostSchema, type InsertBlogPost } from "@shared/schema";
import { format } from "date-fns";

interface BlogFormProps {
  defaultValues?: Partial<InsertBlogPost>;
  onSubmit: (data: InsertBlogPost) => void;
  isLoading?: boolean;
}

export function BlogForm({ defaultValues, onSubmit, isLoading }: BlogFormProps) {
  const form = useForm<InsertBlogPost>({
    resolver: zodResolver(insertBlogPostSchema),
    defaultValues: {
      keywords: [""],
      affiliateLinks: [],
      scheduledDate: new Date(),
      status: "draft",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Keywords</h3>
          {form.watch("keywords").map((_, index) => (
            <div key={index} className="flex gap-2">
              <Input
                {...form.register(`keywords.${index}`)}
                placeholder="Enter keyword"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const keywords = form.getValues("keywords");
                  keywords.splice(index, 1);
                  form.setValue("keywords", keywords);
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const keywords = form.getValues("keywords");
              form.setValue("keywords", [...keywords, ""]);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Keyword
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Affiliate Links (Optional)</h3>
          {form.watch("affiliateLinks").map((_, index) => (
            <div key={index} className="flex gap-2">
              <Input
                {...form.register(`affiliateLinks.${index}.name`)}
                placeholder="Link name (optional)"
              />
              <Input
                {...form.register(`affiliateLinks.${index}.url`)}
                placeholder="URL (optional)"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const links = form.getValues("affiliateLinks");
                  links.splice(index, 1);
                  form.setValue("affiliateLinks", links);
                }}
              >
                <Trash className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const links = form.getValues("affiliateLinks");
              form.setValue("affiliateLinks", [...links, { name: "", url: "" }]);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Affiliate Link
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Schedule</h3>
          <div className="flex gap-4 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(form.watch("scheduledDate"), "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("scheduledDate")}
                  onSelect={(date) => form.setValue("scheduledDate", date!)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={format(form.watch("scheduledDate"), "HH:mm")}
              onChange={(e) => {
                const [hours, minutes] = e.target.value.split(":");
                const date = form.watch("scheduledDate");
                date.setHours(parseInt(hours), parseInt(minutes));
                form.setValue("scheduledDate", date);
              }}
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Post"}
        </Button>
      </form>
    </Form>
  );
}