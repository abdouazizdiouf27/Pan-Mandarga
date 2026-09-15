import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      const path = req.nextUrl.pathname;
      // Public admin route: login page itself
      if (path === "/admin/login" || path === "/admin/setup") return true;
      // Everything else under /admin or /api/admin requires a token
      if (path.startsWith("/admin") || path.startsWith("/api/admin")) {
        return !!token;
      }
      return true;
    },
  },
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
