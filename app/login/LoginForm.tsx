"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

// FR-101. 체크박스를 체크하지 않으면 구글 버튼을 누를 수 없다.
export function LoginForm() {
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start(destination: "/" | "/admin") {
    if (!agreed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/consent", { method: "POST", signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("consent failed");
      await signIn("google", { redirectTo: destination }, { prompt: "select_account" });
    } catch {
      setError("로그인을 시작하지 못했습니다. 연결을 확인하고 다시 눌러 주세요.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-[3px] h-4 w-4 accent-[var(--accent)]"
        />
        <span className="text-[13.5px] leading-relaxed">
          대화 기록 저장 및 운영진 검토 목적의 문서화에 동의합니다.
        </span>
      </label>

      <button className="btn btn-primary w-full" disabled={!agreed || busy} onClick={() => start("/")}>
        {busy ? "이동 중" : "구글로 시작하기"}
      </button>
      <button className="btn w-full" disabled={!agreed || busy} onClick={() => start("/admin")}>
        운영진 로그인
      </button>
      <p className="text-[13px] text-ink-2">운영진은 등록된 Google 계정으로 로그인해 주세요. 운영진 권한이 있어야 관리 화면에 들어갈 수 있습니다.</p>
      {error ? <p role="alert" className="text-[14px] text-[color:var(--warn)]">{error}</p> : null}

      <ul className="flex flex-col gap-1.5 text-[12px] leading-relaxed text-ink-3">
        <li>무엇을 저장하나. 세션 녹음의 전사본과 요약, 인클래스 제출물, 출석</li>
        <li>무엇에 쓰나. 회차 운영 기록과 다음 회차·다음 기수 개선</li>
        <li>언제까지 두나. 0기가 끝나고 6개월 뒤에 지웁니다</li>
        <li>지워 달라고 하면. 운영진에게 말하면 계정과 제출물을 지웁니다</li>
      </ul>
    </div>
  );
}
