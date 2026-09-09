// FR-102, FR-103. 구글로 로그인하면 계정을 만들고 participant를 붙인다.
// ADMIN_EMAILS에 있으면 admin도 같이 붙는다.
// 동의는 로그인 화면에서 받고, 구글 왕복을 견디게 쿠키에 실어 보낸 뒤 여기서 consentedAt에 찍는다.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const CONSENT_COOKIE = "creai_consent";

/**
 * 동의 쿠키를 읽는다. 지우지 않는다.
 * signIn 콜백과 events.createUser가 둘 다 읽어야 하는데, 앞에서 지우면
 * 신규 계정이 만들어질 때 뒤쪽이 못 읽어서 첫 로그인이 미동의로 남는다.
 * 대신 쿠키 수명을 5분으로 짧게 둬서 다음 사람이 물려받을 창을 좁힌다.
 */
async function readConsentCookie(): Promise<boolean> {
  try {
    const jar = await cookies();
    return jar.get(CONSENT_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

/**
 * 동의를 계정에 옮겨 적은 뒤에 쿠키를 지운다.
 * 읽는 자리가 둘(signIn 콜백, events.createUser)이라 앞에서 지우면 뒤가 못 읽는다.
 * 그래서 쓰고 난 자리에서만 지운다. 안 지우면 같은 브라우저의 다음 사람이 물려받는다.
 */
async function dropConsentCookie(): Promise<void> {
  try {
    const jar = await cookies();
    jar.delete(CONSENT_COOKIE);
  } catch {
    /* 지우지 못해도 5분이면 만료된다 */
  }
}

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Auth.js v5는 기본으로 AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET를 찾는다.
  // 스펙이 정한 이름은 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET이라 명시적으로 넘긴다.
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      const email = user.email.toLowerCase();

      const consented = await readConsentCookie();

      const roles: ("participant" | "admin")[] = ["participant"];
      if (adminEmails().includes(email)) roles.push("admin");

      // 구글이 준 이메일은 대소문자가 섞일 수 있다. 정확히 일치로 찾으면 조용히 스킵된다.
      const existing = await prisma.user.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
      });
      if (existing) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            roles,
            consentedAt: existing.consentedAt ?? (consented ? new Date() : null),
          },
        });
        if (consented) await dropConsentCookie();
      }
      // 계정이 아직 없으면 어댑터가 만든 뒤 events.createUser에서 채운다.
      return true;
    },
    async jwt({ token }) {
      if (!token.email) return token;
      const u = await prisma.user.findFirst({
        where: { email: { equals: token.email, mode: "insensitive" } },
        select: { id: true, roles: true, consentedAt: true, name: true },
      });
      if (u) {
        token.uid = u.id;
        token.roles = u.roles;
        token.consented = !!u.consentedAt;
        token.name = u.name ?? token.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.uid as string) ?? "";
        session.user.roles = (token.roles as ("participant" | "admin")[]) ?? [];
        session.user.consented = !!token.consented;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email) return;
      const email = user.email.toLowerCase();
      const consented = await readConsentCookie();
      const roles: ("participant" | "admin")[] = ["participant"];
      if (adminEmails().includes(email)) roles.push("admin");
      await prisma.user.update({
        where: { id: user.id! },
        data: { roles, consentedAt: consented ? new Date() : null },
      });
      if (consented) await dropConsentCookie();
    },
  },
});

export async function requireUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user || !user.roles?.includes("admin")) return null;
  return user;
}
