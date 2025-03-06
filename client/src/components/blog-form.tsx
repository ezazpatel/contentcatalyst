import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { insertBlogPostSchema, type InsertBlogPost } from "@shared/schema";
import { format, isBefore, startOfMinute } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";
import { toast } from "@/hooks/use-toast";
import { useMemo } from "react";

interface BlogFormProps {
  defaultValues?: Partial<InsertBlogPost>;
  onSubmit: (data: InsertBlogPost) => Promise<void>;
  isLoading?: boolean;
}

export function BlogForm({ defaultValues, onSubmit, isLoading }: BlogFormProps) {
  const form = useForm<InsertBlogPost>({
    resolver: zodResolver(insertBlogPostSchema),
    defaultValues: {
      keywords: [""],
      affiliateLinks: [{ name: "", url: "" }],
      scheduledDate: new Date(Date.now() + 15 * 60 * 1000), // Default to 15 minutes from now
      ...defaultValues,
    },
  });

  const scheduledDate = form.watch("scheduledDate");

  const isDateValid = useMemo(() => {
    const now = startOfMinute(new Date());
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const utcDate = zonedTimeToUtc(scheduledDate, userTimezone);
    return !isBefore(utcDate, now);
  }, [scheduledDate]);

  const onSubmitWithValidation = async (data: InsertBlogPost) => {
    try {
      if (!isDateValid) {
        form.setError("scheduledDate", {
          type: "manual",
          message: "Please select a future date and time"
        });
        return;
      }
      await onSubmit(data);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description: "Failed to submit the post. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitWithValidation)} className="space-y-6 w-full max-w-2xl mx-auto px-4 sm:px-6">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Schedule</h3>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className={`w-full sm:w-auto ${!isDateValid ? "border-destructive text-destructive" : ""}`}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduledDate ? format(scheduledDate, "PPP") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={(date) => {
                    if (date) {
                      const newDate = date;
                      newDate.setHours(scheduledDate.getHours(), scheduledDate.getMinutes());
                      form.setValue("scheduledDate", newDate);
                    }
                  }}
                  disabled={(date) => isBefore(date, startOfMinute(new Date()))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Input
              type="time"
              value={scheduledDate ? format(scheduledDate, "HH:mm") : "00:00"}
              className={`w-full sm:w-auto ${!isDateValid ? "border-destructive text-destructive" : ""}`}
              onChange={(e) => {
                try {
                  const [hours, minutes] = e.target.value.split(":");
                  const newDate = new Date(scheduledDate);
                  newDate.setHours(parseInt(hours), parseInt(minutes));
                  form.setValue("scheduledDate", newDate);
                } catch (err) {
                  console.error("Invalid time format:", err);
                }
              }}
            />
          </div>
          {!isDateValid && (
            <p className="text-sm text-destructive">
              Please select a future date and time
            </p>
          )}
          {form.formState.errors.scheduledDate && (
            <p className="text-sm text-destructive">
              {form.formState.errors.scheduledDate.message}
            </p>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isLoading || !isDateValid}
          className="w-full sm:w-auto"
        >
          {isLoading ? "Adding..." : "Add Post"}
        </Button>
      </form>
    </Form>
  );
}