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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 w-full max-w-2xl mx-auto px-4 sm:px-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Keywords</h3>
          {form.watch("keywords").map((_, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1">
                <Input
                  {...form.register(`keywords.${index}`)}
                  placeholder="Enter keyword"
                  className="w-full"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => {
                  const keywords = form.getValues("keywords");
                  keywords.splice(index, 1);
                  form.setValue("keywords", keywords);
                }}
                className="self-end sm:self-auto"
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
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Keyword
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Affiliate Links (Optional)</h3>
          {form.watch("affiliateLinks").map((_, index) => (
            <div key={index} className="flex flex-col sm:flex-row gap-2">
              <Input
                {...form.register(`affiliateLinks.${index}.name`)}
                placeholder="Link name (optional)"
                className="flex-1"
              />
              <Input
                {...form.register(`affiliateLinks.${index}.url`)}
                placeholder="URL (optional)"
                className="flex-1"
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
                className="self-end sm:self-auto"
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
            className="w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" /> Add Affiliate Link
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Schedule</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline"
                  className={`w-full sm:w-auto ${form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime()) 
                    ? "" 
                    : "border-red-500"}`}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime())
                    ? format(form.watch("scheduledDate"), "PPP")
                    : "Select a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
              className={`w-full sm:w-auto ${form.watch("scheduledDate") instanceof Date && !isNaN(form.watch("scheduledDate").getTime()) 
                ? "" 
                : "border-red-500"}`}
              onChange={(e) => {
                try {
                  const [hours, minutes] = e.target.value.split(":");
                  const date = new Date(form.watch("scheduledDate"));
                  if (date instanceof Date && !isNaN(date.getTime())) {
                    date.setHours(parseInt(hours), parseInt(minutes));
                    form.setValue("scheduledDate", date);
                  } else {
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

        <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
          {isLoading ? "Adding..." : "Add Post"}
        </Button>
      </form>
    </Form>
  );
}