import { auth } from "@/lib/auth";
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { Logo } from "@/components/Header";
import { LogoutButton } from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ consent?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  // 이미 로그인된 계정에는 폼을 다시 안 보여준다.
  // 여기서 리디렉션하면 /home에서 뒤로 가기를 눌렀을 때 다시 앞으로 튕겨서
  // 뒤로 가기가 영영 안 먹는 것처럼 보인다. 그래서 안내만 띄운다.
  if (session?.user?.consented) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <div className="card w-full max-w-[420px] p-8">
          <div className="mb-6">
            <Logo />
          </div>
          <p className="mb-6 text-[14.5px] text-ink-2">
            {session.user.name ?? session.user.email}(으)로 로그인되어 있습니다.
          </p>
          <Link href="/" className="btn btn-primary w-full">
            들어가기
          </Link>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            {session.user.roles?.includes("admin") ? (
              <Link href="/admin" className="btn">운영진 관리</Link>
            ) : <p className="text-[13px] text-ink-2">현재 계정은 참가자 계정입니다.</p>}
            <LogoutButton />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <div className="card w-full max-w-[420px] p-8">
        <div className="mb-7 flex flex-col items-start gap-3">
          <Logo />
          <h1 className="text-[22px] font-semibold tracking-tight">AI 스터디 0기</h1>
        </div>

        {sp.consent ? (
          <p className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-[13px] text-accent-strong">
            동의가 저장되지 않았습니다. 아래에서 다시 확인해 주세요.
          </p>
        ) : null}

        {sp.error ? (
          <p role="alert" className="mb-4 rounded-lg bg-accent-soft px-3 py-2 text-[14px] text-accent-strong">
            로그인을 완료하지 못했습니다. 이전 배포 주소에서 시작했거나 인증 시간이 만료됐을 수 있습니다.
            지금 열린 로그인 화면에서 다시 시작해 주세요. 반복되면 운영진에게 알려 주세요.
          </p>
        ) : null}

        <LoginForm />
      </div>
    </main>
  );
}
