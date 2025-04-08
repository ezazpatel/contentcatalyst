import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch test mode status
  const { data: settings } = useQuery({ 
    queryKey: ['/api/settings'],
    refetchInterval: false
  });

  // Mutation to update test mode
  const { mutate: updateTestMode } = useMutation({
    mutationFn: async (testMode: boolean) => {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_mode: testMode })
      });
      if (!response.ok) throw new Error('Failed to update test mode');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
      toast({
        title: "Test Mode Updated",
        description: `Test mode has been ${!settings?.test_mode ? 'enabled' : 'disabled'}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update test mode.",
        variant: "destructive",
      });
    }
  });

  return (
    <nav className="border-b mb-8">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-1">Dashboard</h1>
            <p className="text-xl text-muted-foreground">Canada Things to Do</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Test Mode Indicator */}
            <div className="flex items-center gap-2 mr-4">
              <Switch
                checked={settings?.test_mode}
                onCheckedChange={(checked) => updateTestMode(checked)}
                aria-label="Toggle test mode"
              />
              <Badge 
                variant={settings?.test_mode ? "secondary" : "outline"}
                className="text-xs font-normal"
              >
                {settings?.test_mode ? "Test Mode" : "Production Mode"}
              </Badge>
            </div>

            <Link href="/">
              <Button variant="outline">Create New Post</Button>
            </Link>
            <Link href="/blogs">
              <Button variant="outline">View All Posts</Button>
            </Link>
            <Link href="/keywords">
              <Button variant="outline">Manage Keywords</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}