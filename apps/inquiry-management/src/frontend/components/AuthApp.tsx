import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { routes } from "../../shared/routes";
import { BootstrapPage } from "./BootstrapPage";
import { ForbiddenPage } from "./ForbiddenPage";
import { AuthGuard, BootstrapGuard } from "./Guard";
import { SignInPage } from "./SignInPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useBootstrap } from "@gasboost/bootstrap/react";
import { AuthProvider } from "../contexts/AuthContext";

export function AuthApp({
  sessionEffects,
}: {
  sessionEffects?: import("react").ReactNode;
}) {
  return (
    <Routes>
      <Route path={routes.system.bootstrap} element={<BootstrapRoute />} />
      <Route element={<BootstrapGuard />}>
        <Route
          element={
            <AuthProvider>
              {sessionEffects}
              <SessionRoutes />
            </AuthProvider>
          }
        >
          <Route path={routes.auth.signIn} element={<EmailSignInRoute />} />
          <Route
            path={routes.auth.forgotPassword}
            element={<ForgotPasswordPage />}
          />
          <Route
            path={routes.auth.resetPassword}
            element={<ResetPasswordPage />}
          />
          <Route element={<AuthGuard />}>
            <Route path={routes.home} element={<Account />} />
            <Route path={routes.system.forbidden} element={<ForbiddenPage />} />
          </Route>
          <Route path="*" element={<Navigate to={routes.home} replace />} />
        </Route>
      </Route>
    </Routes>
  );
}

function Account() {
  const { user, signOut, isLoading } = useAuth();
  const [failed, setFailed] = useState(false);
  return (
    <main className="space-y-4 p-6">
      <h1>GAS BOOST</h1>
      <p>{user?.name}</p>
      {failed && (
        <p role="alert">ログアウトできませんでした。再試行してください。</p>
      )}
      <Button
        disabled={isLoading}
        onClick={() => {
          setFailed(false);
          void signOut().catch(() => setFailed(true));
        }}
      >
        ログアウト
      </Button>
    </main>
  );
}

function BootstrapRoute() {
  const { initialized } = useBootstrap();
  const navigate = useNavigate();
  if (initialized) return <Navigate to={routes.auth.signIn} replace />;
  return (
    <BootstrapPage
      onInitialized={() => navigate(routes.auth.signIn, { replace: true })}
    />
  );
}

function SessionRoutes() {
  const { isSessionRestoreFailed } = useAuth();
  return isSessionRestoreFailed ? <EmailSignInRoute /> : <Outlet />;
}

function EmailSignInRoute() {
  const { user, isLoading, isSessionRestoreFailed } = useAuth();
  if (isLoading) return <p role="status">認証を確認しています...</p>;
  if (user && !isSessionRestoreFailed)
    return <Navigate to={routes.home} replace />;
  return (
    <div className="space-y-4">
      <SignInPage />
      <Link to={routes.auth.forgotPassword}>パスワードを設定・再設定する</Link>
    </div>
  );
}
