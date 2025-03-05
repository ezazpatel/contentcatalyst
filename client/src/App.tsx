import { Router, Route } from "wouter";
import Dashboard from "./pages/dashboard";
import KeywordsList from "./pages/keywords-list";
import BlogsList from "./pages/blogs-list";
import EditPost from "./pages/edit-post";
import ViewPost from "./pages/view-post";
import NewPost from "./pages/new-post";
import Editor from "./pages/editor";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/toaster";
import { cn } from "./lib/utils";
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
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Router>
        <div className="flex h-screen bg-background text-foreground">
          <aside className="w-64 border-r border-border hidden md:block">
            <nav className="p-4 space-y-2">
              <a href="/" className="block p-2 hover:bg-accent rounded-md">Dashboard</a>
              <a href="/keywords" className="block p-2 hover:bg-accent rounded-md">Keywords</a>
              <a href="/blogs" className="block p-2 hover:bg-accent rounded-md">Blogs</a>
            </nav>
          </aside>
          <div className="flex-1 flex flex-col">
            <header className="h-14 border-b border-border flex items-center px-4 md:px-6">
              <div className="md:hidden mr-2">
                <button className="p-2" aria-label="Menu">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" x2="20" y1="12" y2="12"></line>
                    <line x1="4" x2="20" y1="6" y2="6"></line>
                    <line x1="4" x2="20" y1="18" y2="18"></line>
                  </svg>
                </button>
              </div>
              <h1 className="text-lg font-semibold">Blog Management</h1>
            </header>
            <main className="flex-1 p-4 md:p-6 overflow-auto">
              <Route path="/"><Dashboard /></Route>
              <Route path="/keywords"><KeywordsList /></Route>
              <Route path="/blogs"><BlogsList /></Route>
              <Route path="/edit/:id"><EditPost /></Route>
              <Route path="/view/:id"><ViewPost /></Route>
              <Route path="/new"><NewPost /></Route>
            </main>
          </div>
        </div>
      </Router>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;