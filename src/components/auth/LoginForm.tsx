"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { signInWithGithub } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "auth_failed") {
        setErrorMsg("Đăng nhập GitHub không thành công hoặc đã bị hủy. Vui lòng thử lại.");
      }
    }
  }, []);

  const handleGithubLogin = async () => {
    try {
      setIsGithubLoading(true);
      setErrorMsg(null);
      await signInWithGithub("/roadmap");
    } catch (err) {
      setIsGithubLoading(false);
      setErrorMsg("Không thể chuyển hướng đến GitHub. Vui lòng kiểm tra lại kết nối mạng.");
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !email.includes("@")) {
      setErrorMsg("Vui lòng nhập địa chỉ email hợp lệ.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setIsLoading(true);
    // Giả lập xử lý đăng nhập client-side UX
    setTimeout(() => {
      setIsLoading(false);
      setSuccessMsg("Đăng nhập thành công! Đang chuyển hướng...");
      setTimeout(() => {
        router.push("/roadmap");
      }, 800);
    }, 900);
  };

  return (
    <>
      {/* 1. Header Thông tin */}
      <div className="flex flex-col items-center text-center gap-1.5" data-node-id="5:1116">
        <span className="font-bold text-[#944b00] text-[13px] tracking-[0.65px] uppercase">
          CHÀO MỪNG TRỞ LẠI
        </span>
        <h1 className="font-black text-[#131b2e] text-[32px] sm:text-[36px] tracking-[-0.9px] leading-[1.2]">
          Đăng nhập tài khoản
        </h1>
        <p className="font-normal text-[#625e56] text-[15px] leading-[22.5px] max-w-[340px] mt-1">
          Tiếp tục hành trình học kiến trúc mã nguồn và luyện kỹ năng cùng SimpliFey.
        </p>
      </div>

      {/* 2. Form Đăng nhập */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" data-node-id="5:1122">
        {/* Thông báo lỗi nếu có */}
        {errorMsg && (
          <div className="bg-[#fef2f2] border border-[#fecaca] text-[#e7000b] text-[13px] font-medium px-4 py-2.5 rounded-[8px] animate-in fade-in duration-200">
            {errorMsg}
          </div>
        )}

        {/* Thông báo thành công */}
        {successMsg && (
          <div className="bg-[#ecfdf5] border border-[#a7f3d0] text-[#00bc7d] text-[13px] font-medium px-4 py-2.5 rounded-[8px] flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Nút Đăng nhập nhanh với GitHub OAuth (D-44) */}
        <button
          type="button"
          onClick={handleGithubLogin}
          disabled={isGithubLoading || isLoading}
          className="group w-full flex items-center justify-center gap-3 py-3 px-6 rounded-[8px] border border-[#d1d5db] bg-white hover:bg-[#f9fafb] hover:border-[#9ca3af] active:scale-[0.98] text-[#131b2e] text-[15px] font-bold shadow-sm transition-all duration-200 ease-out disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isGithubLoading ? (
            <Loader2 className="size-5 animate-spin text-[#131b2e]" />
          ) : (
            <svg
              className="size-5 shrink-0 fill-current text-[#131b2e]"
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
          <span>{isGithubLoading ? "Đang kết nối GitHub..." : "Đăng nhập với GitHub"}</span>
        </button>

        {/* Đường phân cách HOẶC */}
        <div className="relative flex items-center justify-center my-1">
          <div className="border-t border-[#e5e7eb] w-full" />
          <span className="bg-white px-3 text-[12px] font-semibold text-[#99a1af] uppercase tracking-wider absolute">
            hoặc email
          </span>
        </div>

        {/* Trường Email */}
        <Input
          label="Email học tập"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="ban@sinhvien.edu.vn"
          required
          autoComplete="email"
          leftIcon={<Mail className="size-4 text-[#99a1af]" />}
        />

        {/* Trường Mật khẩu */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="login-password"
              className="text-[14px] font-semibold text-[#131b2e] select-none"
            >
              Mật khẩu
            </label>
            <Link
              href="#forgot-password"
              onClick={(e) => {
                e.preventDefault();
                alert("Tính năng khôi phục mật khẩu đang được phát triển.");
              }}
              className="text-[13px] font-semibold text-[#ff9640] hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>

          <div className="relative flex items-center w-full rounded-[8px] bg-[#f2f3ff] border border-transparent transition-all duration-150 focus-within:border-[#ff9640] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#ff9640]/20">
            <div className="absolute left-3.5 flex items-center justify-center text-[#99a1af] pointer-events-none">
              <Lock className="size-4" />
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full bg-transparent px-4 py-3 pl-10 pr-10 text-[14px] font-medium text-[#131b2e] placeholder:text-[#99a1af] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              className="absolute right-3.5 flex items-center justify-center text-[#99a1af] hover:text-[#131b2e] transition-colors focus:outline-none"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {/* Checkbox Duy trì đăng nhập */}
        <div className="flex items-center gap-2 pt-1" data-node-id="5:1152">
          <input
            id="remember-me"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="size-4 rounded-[4px] border-[#d1d5db] text-[#ff9640] accent-[#ff9640] focus:ring-[#ff9640] cursor-pointer"
          />
          <label
            htmlFor="remember-me"
            className="text-[13px] font-normal text-[#625e56] cursor-pointer select-none"
          >
            Duy trì trạng thái đăng nhập trên thiết bị này
          </label>
        </div>

        {/* Nút Đăng nhập */}
        <button
          type="submit"
          disabled={isLoading || isGithubLoading}
          className="group w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-[8px] bg-[#ff9640] hover:bg-[#f2852e] hover:scale-[1.02] active:scale-[0.98] text-[#301400] text-[16px] font-bold shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <span>Đăng Nhập</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </form>

      {/* 3. Phân cách & Link chuyển sang Đăng ký */}
      <div
        className="border-t border-[#f3f4f6] pt-6 flex items-center justify-center gap-1.5 text-[14px]"
        data-node-id="5:1163"
      >
        <span className="font-normal text-[#625e56]">Chưa có tài khoản SimpliFey?</span>
        <Link
          href="/register"
          className="font-bold text-[#ff9640] hover:underline transition-colors"
        >
          Đăng ký ngay
        </Link>
      </div>
    </>
  );
}
