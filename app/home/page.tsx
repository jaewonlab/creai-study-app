import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { HomeWatcher } from "./HomeWatcher";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <>
      {await Header()}
      <main className="mx-auto max-w-5xl px-5 py-16">
        <div className="card p-10 text-center">
          <p className="text-[15px] text-ink-2">오늘은 세션이 없습니다</p>
          <Link href="/mine" className="btn mt-5">지난 내 제출물 보기</Link>
        </div>
      </main>
      <HomeWatcher />
    </>
  );
}
