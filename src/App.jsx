import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Suppliers from '@/pages/Suppliers';
import Purchases from '@/pages/Purchases';
import PurchaseDetail from '@/pages/PurchaseDetail';
import ImportBatches from '@/pages/ImportBatches';
import Inventory from '@/pages/Inventory';
import PricingEngine from '@/pages/PricingEngine';
import Customers from '@/pages/Customers';
import Quotes from '@/pages/Quotes';
import QuoteDetail from '@/pages/QuoteDetail';
import Sales from '@/pages/Sales';
import Expenses from '@/pages/Expenses';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/purchases/:id" element={<PurchaseDetail />} />
        <Route path="/imports" element={<ImportBatches />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/pricing" element={<PricingEngine />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/:id" element={<QuoteDetail />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App