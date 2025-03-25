import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';

const queryClient = new QueryClient()

// Placeholder Navbar component - replace with actual implementation
const Navbar = () => {
  return <div>This is a placeholder navbar</div>;
}


export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Navbar />
      </Router>
    </QueryClientProvider>
  );
}