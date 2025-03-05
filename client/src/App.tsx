import { Router, Route, Link, Switch as Routes } from "wouter";
import Dashboard from "@/pages/dashboard";
import KeywordsList from "@/pages/keywords-list";
import BlogsList from "@/pages/blogs-list";
import Editor from "@/pages/editor";
import ViewPost from "@/pages/view-post";
import NewPost from "@/pages/new-post";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import EditPost from "@/pages/edit-post";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { useIsMobile } from "@/hooks/use-mobile";

function AppContent() {
  const isMobile = useIsMobile();

  const navItems = [
    { href: "/keywords", label: "Manage Keywords" },
    { href: "/blogs", label: "View all posts" },
    { href: "/new", label: "Create New Post" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 bg-sidebar border-r border-sidebar-border">
        <div className="p-4">
          <Link to="/" className="font-semibold text-sidebar-foreground text-lg">
            Dashboard
          </Link>
          <nav className="mt-8 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "block py-2 px-3 rounded-md hover:bg-sidebar-accent text-sidebar-foreground text-sm font-medium transition-colors"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <header className="md:hidden border-b p-4 flex items-center">
          <MobileMenu items={navItems} />
          <Link to="/" className="mx-auto font-semibold text-lg">
            Dashboard
          </Link>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/keywords" element={<KeywordsList />} />
            <Route path="/blogs" element={<BlogsList />} />
            <Route path="/editor" element={<Editor />} />
            <Route path="/view/:id" element={<ViewPost />} />
            <Route path="/new" element={<NewPost />} />
            <Route path="/edit/:id" element={<EditPost />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="ui-theme">
      <Router>
        <AppContent />
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;