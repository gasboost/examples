export const routes = {
  home: "/",
  customers: "/customers",
  auth: {
    signIn: "/sign-in",
    signUp: "/sign-up",
    forgotPassword: "/forgot-password",
    resetPassword: "/reset-password",
  },
  system: {
    forbidden: "/forbidden",
    bootstrap: "/bootstrap",
    unauthorized: "/unauthorized",
  },
} as const;
