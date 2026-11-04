"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  GitBranch,
  ShieldCheck,
  Brain,
} from "lucide-react";
import { signInWithGithub } from "@/lib/supabase/client";

export function LoginForm() {
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGithubLogin = async () => {
    try {
      setIsGithubLoading(true);
      setErrorMsg(null);

      let destination = "/roadmap";
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const nextParam = params.get("next");
        if (nextParam && nextParam.startsWith("/")) {
          destination = nextParam;
        }
      }

      await signInWithGithub(destination);
    } catch (err) {
      setIsGithubLoading(false);
      setErrorMsg(
        "Không thể chuyển hướng đến GitHub. Vui lòng kiểm tra lại kết nối mạng."
      );
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full" data-node-id="5:1116">
      {/* 1. Header Thông tin */}
      <div className="flex flex-col items-center text-center gap-2">
        <span className="font-bold text-[#944b00] text-[12.5px] tracking-[0.7px] uppercase bg-[#fff7ed] px-3 py-1 rounded-full border border-[#ff9640]/30">
          XÁC THỰC AN TOÀN · GITHUB OAUTH
        </span>
        <h1 className="font-black text-[#131b2e] text-[30px] sm:text-[34px] tracking-[-0.9px] leading-[1.2]">
          Đăng nhập SimpliFey
        </h1>
        <p className="font-normal text-[#625e56] text-[14.5px] leading-[22px] max-w-[360px]">
          Tiếp tục hành trình phân tích kiến trúc mã nguồn và kiểm thử hiểu biết
          qua phương pháp Feynman.
        </p>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="bg-[#fef2f2] border border-[#fecaca] text-[#e7000b] text-[13px] font-medium px-4 py-2.5 rounded-[8px] animate-in fade-in duration-200">
          {errorMsg}
        </div>
      )}

      {/* 2. Điểm nổi bật khi đăng nhập */}
      <div className="bg-[#f9faff] border border-[#eaedff] rounded-[12px] p-4 flex flex-col gap-2.5 text-xs text-[#131b2e]">
        <div className="flex items-center gap-2 text-[#554337]">
          <GitBranch className="size-4 text-[#ff9640] shrink-0" />
          <span>Phân tích trực tiếp các kho mã nguồn GitHub của bạn</span>
        </div>
        <div className="flex items-center gap-2 text-[#554337]">
          <Brain className="size-4 text-[#ff9640] shrink-0" />
          <span>Lưu vết hồ sơ năng lực 16 kỹ năng SWE theo Bayesian BKT</span>
        </div>
        <div className="flex items-center gap-2 text-[#554337]">
          <ShieldCheck className="size-4 text-[#ff9640] shrink-0" />
          <span>Xác thực tiêu chuẩn bảo mật qua Supabase OAuth</span>
        </div>
      </div>

      {/* 3. Nút Đăng nhập chính với GitHub OAuth (spec/30_UI.md Mục 2) */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={isGithubLoading}
          className="group w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-[10px] bg-[#131b2e] hover:bg-[#1f293d] active:scale-[0.98] text-white text-[15px] font-bold shadow-md hover:shadow-lg transition-all duration-200 ease-out disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGithubLoading ? (
            <Loader2 className="size-5 animate-spin text-white" />
          ) : (
            <svg
              className="size-5 shrink-0 fill-current text-white"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
          )}
          <span>
            {isGithubLoading
              ? "Đang chuyển hướng sang GitHub..."
              : "Đăng nhập bằng tài khoản GitHub"}
          </span>
        </button>
      </div>

      {/* 4. Bản dùng thử Offline Demo */}
      <div className="bg-[#fff7ed] border border-[#ff9640]/40 rounded-[10px] p-3 text-center text-xs text-[#944b00]">
        <span>Chưa có tài khoản GitHub? </span>
        <Link
          href="/learn?offline=1"
          className="font-bold underline hover:text-[#723900] transition-colors"
        >
          Trải nghiệm ngay bản Demo Offline (?offline=1)
        </Link>
      </div>

      {/* 5. Quay về trang chủ */}
      <div className="flex items-center justify-center pt-2 border-t border-[#f3f4f6]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#625e56] hover:text-[#ff9640] transition-colors"
        >
          <ArrowLeft className="size-3.5" />
          <span>Quay lại trang chủ SimpliFey</span>
        </Link>
      </div>
    </div>
  );
}
