/**
 * NEXORA — MAPA PARA DESARROLLADORES
 * Propósito: Define rutas, protección de acceso y composición de pantallas de la aplicación.
 * Datos/efectos detectados: Sin acceso directo SDK a entidades detectado.
 * Dependencias: Revisar imports y consumidores; sin invoke literal detectado.
 * Límites: Preservar contratos; ver docs/NEXORA-REGRESSION-MATRIX.md. Runtime no certificado.
 * Referencia: docs/NEXORA-INVENTORY.md (base 54e8532).
 * /invite/accept solo informa precondiciones y permanece bloqueada hasta aceptación backend certificada.
 */
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
import Quotes from '@/pages/Quotes.jsx';
import QuoteDetail from '@/pages/QuoteDetail.jsx';
import Sales from '@/pages/Sales.jsx';
import Expenses from '@/pages/Expenses';
import Settings from '@/pages/Settings.jsx';
import Catalog from '@/pages/Catalog';
import PlatformAdmin from '@/pages/PlatformAdmin';
import Warehouses from '@/pages/Warehouses';
import Tracking from '@/pages/Tracking';
import ConsultingPortal from '@/pages/ConsultingPortal';

/** Aceptación pendiente: no almacenar ni transmitir tokens hasta contar con endpoint y QA seguros. */
function InvitationAcceptance() {
  const { user } = useAuth();
  return <main className="min-h-screen bg-background p-5 sm:p-8"><div className="max-w-xl mx-auto border rounded-lg p-6 space-y-4">
    <h1 className="text-2xl font-semibold">Acceso a Nexora</h1>
    <p>La invitación debe corresponder al correo de tu cuenta, estar vigente y ser aceptada una sola vez. La autorización se comprueba en el servidor.</p>
    <p className="text-sm">{user?.email ? `Sesión actual: ${user.email}` : 'Iniciá sesión con el correo al que fue dirigida la invitación.'}</p>
    <label className="grid gap-1 text-sm"><span>Código de invitación</span><input aria-label="Código de invitación" disabled placeholder="Aceptación no disponible" className="border rounded-md p-2 bg-muted" /></label>
    <button type="button" disabled className="rounded-md bg-muted text-muted-foreground px-4 py-2 cursor-not-allowed">Verificar y aceptar invitación</button>
    <p role="status" className="text-sm text-amber-800">La aceptación está bloqueada hasta verificar el backend, los permisos por empresa y la protección contra usos duplicados. No se creó ninguna membresía.</p>
  </div></main>;
}

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
      {/* La ruta Consulting NO utiliza el panel administrativo ni los menús operativos. */}
      <Route path="/consulting" element={<ConsultingPortal />} />
      <Route path="/invite/accept" element={<InvitationAcceptance />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/purchases/:id" element={<PurchaseDetail />} />
        <Route path="/imports" element={<ImportBatches />} />
        <Route path="/tracking" element={<Tracking />} />
        <Route path="/warehouses" element={<Warehouses />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/pricing" element={<PricingEngine />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/quotes" element={<Quotes />} />
        <Route path="/quotes/:id" element={<QuoteDetail />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/platform" element={<PlatformAdmin />} />
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