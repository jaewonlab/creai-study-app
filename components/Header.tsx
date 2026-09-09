import Link from "next/link";
import { auth } from "@/lib/auth";
import { getRunningSession } from "@/lib/session-state";
import { LogoutButton } from "./LogoutButton";

/** 로고는 이미지가 아니라 글자다. 원본 사이트도 텍스트로 찍는다. */
export function Logo({ sub }: { sub?: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-en text-[18px] font-semibold tracking-tight text-ink">
        CREAI<span className="text-accent">+</span>IT
      </span>
      {sub ? <span className="text-[13px] text-ink-2">{sub}</span> : null}
    </div>
  );
}

/** FR-104. 로그인한 사용자에게 지금 역할을 보여준다. */
export async function Header({ right }: { right?: React.ReactNode } = {}) {
  const session = await auth();
  const isAdmin = session?.user?.roles?.includes("admin") ?? false;
  const name = session?.user?.name ?? session?.user?.email ?? null;

  // FR-403. 1부가 끝난 뒤에도 장표를 다시 열 수 있어야 한다.
  // 주소를 직접 치게 두면 그 요구가 사실상 없는 것과 같다.
  const running = name ? await getRunningSession() : null;
  const showDeck = !!running?.deckUrl;

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <Link href="/">
          <Logo sub="AI 스터디 0기" />
        </Link>
        <div className="flex flex-wrap items-center gap-3 text-[13px] text-ink-2">
          {name ? <Link href="/mine" className="hover:text-ink">내 제출물</Link> : null}
          {isAdmin ? <Link href="/admin" className="btn btn-primary">운영진 관리</Link> : null}
          {showDeck ? (
            <Link href="/deck" className="hover:text-ink">
              장표
            </Link>
          ) : null}
          {name ? (
            <span className="flex items-center gap-2">
              <span
                className={
                  isAdmin
                    ? "rounded-md bg-accent-soft px-2 py-1 text-[12px] font-medium text-accent-strong"
                    : "rounded-md bg-[color:var(--bg)] px-2 py-1 text-[12px] text-ink-2"
                }
              >
                {isAdmin ? "운영진" : "참가자"}
              </span>
              <span className="text-ink-3">{name}</span>
            </span>
          ) : null}
          {right}
          {session?.user ? <LogoutButton /> : null}
        </div>
      </div>
    </header>
  );
}
