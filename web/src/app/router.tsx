import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Providers } from './providers';
import { AppLayout } from './layouts/AppLayout';
import { AdminRoute, ProtectedRoute, PublicRoute } from './ProtectedRoute';
import { PageLoader as FortifyPageLoader } from '@shared/components/ui/PageLoader';

function PageLoader() {
  return <FortifyPageLoader label="Abrindo página…" />;
}
const DashboardPage = lazy(() => import('@features/dashboard/pages/DashboardPage'));
const ContractsPage = lazy(() => import('@features/contracts/pages/ContractsPage'));
const TemplatesPage = lazy(() => import('@features/contracts/pages/TemplatesPage'));
const TemplateDetailPage = lazy(() => import('@features/contracts/pages/TemplateDetailPage'));
const NewTemplatePage = lazy(() => import('@features/contracts/pages/NewTemplatePage'));
const NewContractPage = lazy(() => import('@features/contracts/pages/NewContractPage'));
const ContractDetailPage = lazy(() => import('@features/contracts/pages/ContractDetailPage'));
const ObrasPage = lazy(() => import('@features/obras/pages/ObrasPage'));
const ObraDetailPage = lazy(() => import('@features/obras/pages/ObraDetailPage'));
const ReportsPage = lazy(() => import('@features/reports/pages/ReportsPage'));
const SettingsPage = lazy(() => import('@features/settings/pages/SettingsPage'));
const UsersPage = lazy(() => import('@features/users/pages/UsersPage'));
const SignaturesPage = lazy(() => import('@features/signatures/pages/SignaturesPage'));
const PublicSignPage = lazy(() => import('@features/signatures/pages/PublicSignPage'));
const TermsPage = lazy(() => import('@features/legal/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@features/legal/pages/PrivacyPage'));
const LandingPage = lazy(() => import('@features/marketing/pages/LandingPage'));
const LoginPage = lazy(() => import('@features/auth/pages/LoginPage'));
const SignupPage = lazy(() => import('@features/auth/pages/SignupPage'));
const ForgotPasswordPage = lazy(() => import('@features/auth/pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@features/auth/pages/ResetPasswordPage'));
const NotFoundPage = lazy(() => import('@features/errors/pages/NotFoundPage'));

export function AppRouter() {
  return (
    <Providers>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/assinatura/:token" element={<PublicSignPage />} />
            <Route path="/termos" element={<TermsPage />} />
            <Route path="/privacidade" element={<PrivacyPage />} />
            <Route element={<PublicRoute />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/criar-conta" element={<SignupPage />} />
              <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
              <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="inicio" element={<DashboardPage />} />
                <Route path="contratos" element={<ContractsPage />} />
                <Route path="contratos/assinaturas" element={<SignaturesPage />} />
                <Route path="contratos/assinaturas/:id" element={<ContractDetailPage />} />
                <Route path="contratos/templates" element={<TemplatesPage />} />
                <Route path="contratos/templates/novo" element={<NewTemplatePage />} />
                <Route path="contratos/templates/:id" element={<TemplateDetailPage />} />
                <Route path="contratos/novo" element={<NewContractPage />} />
                <Route path="contratos/:id" element={<ContractDetailPage />} />
                <Route path="assinaturas" element={<Navigate to="/contratos/assinaturas" replace />} />
                <Route path="gerenciador" element={<Navigate to="/contratos" replace />} />
                <Route path="obras" element={<ObrasPage />} />
                <Route path="obras/:id" element={<ObraDetailPage />} />
                <Route path="relatorios" element={<ReportsPage />} />
                <Route path="configuracoes" element={<SettingsPage />} />
                <Route element={<AdminRoute />}>
                  <Route path="usuarios" element={<UsersPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </Providers>
  );
}
