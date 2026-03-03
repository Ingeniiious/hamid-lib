import { auth } from "@/lib/auth";

export default auth.middleware({
  loginUrl: "/auth",
});

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
