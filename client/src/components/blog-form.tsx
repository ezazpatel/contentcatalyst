import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, Trash } from "lucide-react";
import { insertBlogPostSchema, type InsertBlogPost } from "@shared/schema";
import { format } from "date-fns";
import {FormLabel, FormControl, FormItem, FormField, FormMessage} from "@/components/ui/form";


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
      internalLinks: [],
      scheduledDate: new Date(),
      status: "draft",
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Keyword Phrase</h3>
          {form.watch("keywords").map((_, index) => (
            <div key={index} className="flex gap-2">
              <Input
                {...form.register(`keywords.${index}`)}
                placeholder="Enter keyword phrase"
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
            <Plus className="h-4 w-4 mr-2" /> Add Keyword Phrase
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Internal Links (Optional)</h3>
          <p className="text-sm text-muted-foreground">Add links to related articles from your blog that should be referenced in this post.</p>
          {form.watch("internalLinks").map((_, index) => (
            <div key={index} className="flex gap-2">
              <Input
                {...form.register(`internalLinks.${index}.title`)}
                placeholder="Article title"
              />
              <Input
                {...form.register(`internalLinks.${index}.url`)}
                placeholder="Article URL"
              />
              <Input
                {...form.register(`internalLinks.${index}.description`)}
                placeholder="Context for linking (optional)"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const links = form.getValues("internalLinks");
                  links.splice(index, 1);
                  form.setValue("internalLinks", links);
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
              const links = form.getValues("internalLinks");
              form.setValue("internalLinks", [...links, { title: "", url: "", description: "" }]);
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Internal Link
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
                <Button
                  variant="outline"
                  className={form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime())
                    ? ""
                    : "border-red-500"}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime())
                    ? format(form.watch("scheduledDate"), "PPP")
                    : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime())
                    ? form.watch("scheduledDate")
                    : new Date()}
                  onSelect={(date) => form.setValue("scheduledDate", date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Input
              type="time"
              value={form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime())
                ? format(form.watch("scheduledDate"), "HH:mm")
                : "00:00"}
              className={
                !form.watch("scheduledDate") || !(form.watch("scheduledDate") instanceof Date) || isNaN(form.watch("scheduledDate").getTime())
                  ? "border-red-500"
                  : form.watch("scheduledDate") < new Date()
                    ? "border-red-500"
                    : ""
              }
              onChange={(e) => {
                try {
                  const [hours, minutes] = e.target.value.split(":");
                  const date = new Date(form.watch("scheduledDate"));
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    date.setHours(parseInt(hours), parseInt(minutes));
                    form.setValue("scheduledDate", date);
                  } else {
                    // If current date is invalid, create a new valid date
                    const newDate = new Date();
                    newDate.setHours(parseInt(hours), parseInt(minutes));
                    form.setValue("scheduledDate", newDate);
                  }
                } catch (err) {
                  console.error("Invalid time format:", err);
                }
              }}
            />
          </div>
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Keyword Context Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Provide context about the keyword phrase and what you expect from the blog"
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Adding..." : "Add Post"}
        </Button>
      </form>
    </Form>
  );
}