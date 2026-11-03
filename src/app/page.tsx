"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  AlertCircle,
  RefreshCw,
  FileArchive,
  Globe,
  Clock,
  ArrowRight,
  CheckCircle2,
  BookOpen,
} from "lucide-react";

import { Navbar } from "@/components/layout/Navbar";
import {
  HeroVisual,
  HeroAnimation,
  TrainingFramework,
  HomeFooter,
} from "@/components/home";
import {
  ingestRepoSafe,
  getSessionsSafe,
  isApiError,
  type LearningSessionSummary,
} from "@/lib/api";
import { CONFIG } from "@/contracts";

type IngestMode = "url" | "zip";

/**
 * Ánh xạ mã lỗi API thành thông điệp tiếng Việt thân thiện theo spec/30_UI.md
 */
function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const code = error.error.code;
    switch (code) {
      case "ERR_INVALID_GITHUB_URL":
        return "URL kho lưu trữ GitHub không hợp lệ. Vui lòng nhập định dạng: https://github.com/owner/repository";
      case "ERR_EMPTY_REPOSITORY":
        return "Kho mã nguồn rỗng hoặc không chứa tệp mã nguồn hợp lệ để phân tích.";
      case "ERR_STREAM_QUOTA_EXCEEDED":
        return "Kho mã nguồn vượt quá dung lượng tối đa cho phép (15MB). Vui lòng tải file zip thu gọn.";
      case "ERR_UNSUPPORTED_LANGUAGE":
        return "Ngôn ngữ lập trình chính trong kho lưu trữ chưa được hỗ trợ phân tích chuyên sâu.";
      case "ERR_NO_ARCHITECTURAL_SLICE":
        return "Không tìm thấy lát cắt kiến trúc phù hợp trong mã nguồn để khởi tạo bài học.";
      case "ERR_CLIENT_NETWORK":
        return "Mất kết nối tới máy chủ SimpliFey. Vui lòng kiểm tra đường truyền mạng.";
      case "ERR_PERSISTENCE_UNAVAILABLE":
        return "Hệ thống lưu trữ đang bận hoặc tạm thời gián đoạn. Vui lòng thử lại sau giây lát.";
      case "ERR_UNAUTHENTICATED":
        return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.";
      default:
        return error.error.message || "Đã xảy ra lỗi trong quá trình quét mã nguồn.";
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Đã xảy ra lỗi không xác định khi kết nối với máy chủ.";
}

export default function Home() {
  const router = useRouter();

  // Mode: "url" (GitHub link) hoặc "zip" (File upload)
  const [mode, setMode] = useState<IngestMode>("url");
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/simplifey/nest-store-core"
  );
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Trạng thái quét & nạp
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>("");
  const [scanElapsed, setScanElapsed] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successSessionId, setSuccessSessionId] = useState<string | null>(null);

  // Danh sách phiên học gần đây (Bước 5: GET /api/sessions)
  const [recentSessions, setRecentSessions] = useState<LearningSessionSummary[]>(
    []
  );
  const [isLoadingSessions, setIsLoadingSessions] = useState<boolean>(true);
  const [resumingSessionId, setResumingSessionId] = useState<string | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Tải danh sách các phiên gần đây
  const loadRecentSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    const result = await getSessionsSafe({ limit: 3 });
    if (result.ok && result.data?.sessions) {
      setRecentSessions(result.data.sessions);
    } else {
      // Khi chưa có session hoặc đang ở chế độ dev bypass, duy trì mảng rỗng nhẹ nhàng
      setRecentSessions([]);
    }
    setIsLoadingSessions(false);
  }, []);

  useEffect(() => {
    loadRecentSessions();
  }, [loadRecentSessions]);

  // Quản lý đồng hồ đo thời gian quét
  useEffect(() => {
    if (isScanning) {
      setScanElapsed(0);
      timerRef.current = setInterval(() => {
        setScanElapsed((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isScanning]);

  // Xử lý nộp form quét dự án
  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessSessionId(null);

    if (mode === "url") {
      const trimmedUrl = repoUrl.trim();
      if (!trimmedUrl) {
        setErrorMessage("Vui lòng nhập đường dẫn kho chứa GitHub.");
        return;
      }

      // Kiểm tra định dạng cơ bản của GitHub URL
      const isGithub = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(?:\/)?$/i.test(
        trimmedUrl
      );
      if (!isGithub) {
        setErrorMessage(
          "URL không hợp lệ. Vui lòng nhập đúng dạng: https://github.com/owner/repository"
        );
        return;
      }

      setIsScanning(true);
      setScanStep("Đang kết nối kho chứa và nén luồng mã nguồn...");

      try {
        // Cập nhật text tiến độ mô phỏng các tầng xử lý
        const t1 = setTimeout(() => {
          setScanStep("Đang phân tích cú pháp AST qua Web Tree-sitter...");
        }, 1200);
        const t2 = setTimeout(() => {
          setScanStep("Đang tính toán PageRank và dựng đồ thị kiến trúc...");
        }, 2600);

        const result = await ingestRepoSafe({ repo_url: trimmedUrl });
        clearTimeout(t1);
        clearTimeout(t2);

        if (!result.ok) {
          setIsScanning(false);
          setErrorMessage(getErrorMessage(result.error));
          return;
        }

        const sessionId = result.data.session_id;
        setSuccessSessionId(sessionId);
        setScanStep("Quét thành công! Đang chuyển hướng vào bài học...");

        // Chuyển hướng mượt mà sang học tập
        setTimeout(() => {
          router.push(`/learn?session=${encodeURIComponent(sessionId)}`);
        }, 600);
      } catch (err) {
        setIsScanning(false);
        setErrorMessage(getErrorMessage(err));
      }
    } else {
      // Chế độ tải file .zip
      if (!zipFile) {
        setErrorMessage("Vui lòng chọn hoặc kéo thả tệp .zip dự án cần phân tích.");
        return;
      }

      // Kiểm tra giới hạn kích thước theo CONFIG.MAX_UPLOAD_BYTES (4.5MB)
      if (zipFile.size > CONFIG.MAX_UPLOAD_BYTES) {
        const maxMb = (CONFIG.MAX_UPLOAD_BYTES / (1024 * 1024)).toFixed(1);
        setErrorMessage(
          `Kích thước tệp (${(zipFile.size / (1024 * 1024)).toFixed(
            1
          )}MB) vượt quá hạn mức tối đa cho phép (${maxMb}MB).`
        );
        return;
      }

      setIsScanning(true);
      setScanStep("Đang giải nén và kiểm tra tệp tin an toàn...");

      try {
        const formData = new FormData();
        formData.append("archive", zipFile);

        const t1 = setTimeout(() => {
          setScanStep("Đang phân tích AST và lọc nhiễu tệp tin...");
        }, 1200);
        const t2 = setTimeout(() => {
          setScanStep("Đang dựng đồ thị kiến trúc và lát cắt Feynman...");
        }, 2600);

        const result = await ingestRepoSafe(formData);
        clearTimeout(t1);
        clearTimeout(t2);

        if (!result.ok) {
          setIsScanning(false);
          setErrorMessage(getErrorMessage(result.error));
          return;
        }

        const sessionId = result.data.session_id;
        setSuccessSessionId(sessionId);
        setScanStep("Phân tích hoàn tất! Đang mở buồng lái học tập...");

        setTimeout(() => {
          router.push(`/learn?session=${encodeURIComponent(sessionId)}`);
        }, 600);
      } catch (err) {
        setIsScanning(false);
        setErrorMessage(getErrorMessage(err));
      }
    }
  };

  // Kéo thả file .zip
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const dropped = e.dataTransfer.files[0];
      if (
        dropped.name.endsWith(".zip") ||
        dropped.type.includes("zip") ||
        dropped.type.includes("compressed")
      ) {
        setZipFile(dropped);
        setErrorMessage(null);
      } else {
        setErrorMessage("Chỉ hỗ trợ tệp lưu trữ định dạng .zip.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith(".zip")) {
        setZipFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Chỉ chấp nhận tệp nén đuôi .zip.");
      }
    }
  };

  // Mở lại phiên học cũ
  const handleResumeSession = async (sessionId: string) => {
    setResumingSessionId(sessionId);
    try {
      const res = await ingestRepoSafe({ session_id: sessionId });
      if (res.ok) {
        router.push(`/learn?session=${encodeURIComponent(sessionId)}`);
      } else {
        // Fallback mở trực tiếp trang learn
        router.push(`/learn?session=${encodeURIComponent(sessionId)}`);
      }
    } catch {
      router.push(`/learn?session=${encodeURIComponent(sessionId)}`);
    } finally {
      setResumingSessionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#131b2e] flex flex-col antialiased selection:bg-[#ff9640]/20 selection:text-[#944b00]">
      {/* 1. Global Navigation Header (Figma node 5:535) */}
      <Navbar />

      <main className="flex-1 flex flex-col items-center">
        {/* 2. Hero Section (Figma node 5:248) */}
        <section className="w-full max-w-[1344px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-12 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-12 lg:gap-x-12 items-center">
            {/* Left Column: Heading, Subtitle, Scanner Form, Lottie Animation */}
            <div className="lg:col-span-6 flex flex-col items-start gap-6 sm:gap-8 w-full max-w-[648px] mx-auto lg:mx-0">
              {/* Heading 1 & Description matching Figma node 5:251 */}
              <div className="flex flex-col gap-4">
                <h1 className="font-black text-[#131b2e] text-[40px] sm:text-[52px] lg:text-[62px] leading-[1.12] sm:leading-[1.15] lg:leading-[69.44px] tracking-[-1.55px]">
                  <span>Học thú vị hơn</span>
                  <br />
                  <span>
                    cùng{" "}
                    <span className="italic text-[#ff9640] inline-block font-black">
                      SimpliFey
                    </span>
                  </span>
                </h1>
                <p className="font-normal text-[#625e56] text-[18px] sm:text-[22px] leading-relaxed sm:leading-[35.75px] max-w-[540px]">
                  Người đồng hành, hỗ trợ phân tích và học tập từ chính mã nguồn của bạn.
                </p>
              </div>

              {/* Automatic Code Scanner Card with Ingest Integration (Figma node 5:256) */}
              <div
                className="bg-white border border-[#f3f4f6] drop-shadow-[0px_10px_15px_rgba(0,0,0,0.06)] flex flex-col gap-[14px] items-start max-w-[608px] p-[24.8px] rounded-[16px] w-full transition-shadow duration-200 hover:drop-shadow-[0px_14px_22px_rgba(0,0,0,0.09)]"
                data-node-id="5:256"
              >
                {/* Header title with scanner radar icon and Mode Toggle */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-[10px]">
                    <div className="flex items-center justify-center shrink-0 size-[20px]">
                      <Image
                        src="/assets/6cf87.svg"
                        alt="Phân tích"
                        width={18}
                        height={15}
                        className="block"
                      />
                    </div>
                    <h3 className="font-bold text-[#131b2e] text-[17px] leading-[25.5px] tracking-tight">
                      Phân tích mã nguồn tự động
                    </h3>
                  </div>

                  {/* Mode Selector Tabs: GitHub URL vs Zip File */}
                  <div className="flex items-center bg-[#f2f3ff] p-1 rounded-[8px] text-[13px] font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("url");
                        setErrorMessage(null);
                      }}
                      disabled={isScanning}
                      className={`px-3 py-1 rounded-[6px] transition-all flex items-center gap-1.5 ${
                        mode === "url"
                          ? "bg-white text-[#131b2e] shadow-sm font-bold"
                          : "text-[#625e56] hover:text-[#131b2e]"
                      }`}
                    >
                      <Globe className="size-3.5" />
                      <span>GitHub</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode("zip");
                        setErrorMessage(null);
                      }}
                      disabled={isScanning}
                      className={`px-3 py-1 rounded-[6px] transition-all flex items-center gap-1.5 ${
                        mode === "zip"
                          ? "bg-white text-[#131b2e] shadow-sm font-bold"
                          : "text-[#625e56] hover:text-[#131b2e]"
                      }`}
                    >
                      <FileArchive className="size-3.5" />
                      <span>File Zip</span>
                    </button>
                  </div>
                </div>

                {/* Form with input or drag & drop and CTA */}
                <form onSubmit={handleIngest} className="w-full">
                  {mode === "url" ? (
                    <div className="flex flex-col sm:flex-row gap-[12px] items-stretch sm:items-center w-full">
                      {/* Input field matching Figma node 5:265 */}
                      <div className="bg-[#f2f3ff] rounded-[8px] flex items-center flex-1 px-[14.8px] py-[12px] transition-all focus-within:ring-2 focus-within:ring-[#ff9640]/30 focus-within:bg-white border border-transparent focus-within:border-[#ff9640] overflow-hidden">
                        <div className="pr-[12px] flex items-center justify-center shrink-0 z-10 bg-inherit">
                          <Image
                            src="/assets/2f0de.svg"
                            alt="URL Icon"
                            width={16}
                            height={16}
                            className="shrink-0"
                          />
                        </div>
                        <div className="flex-1 overflow-hidden relative min-w-0">
                          <input
                            type="text"
                            value={repoUrl}
                            onChange={(e) => {
                              setRepoUrl(e.target.value);
                              if (errorMessage) setErrorMessage(null);
                            }}
                            disabled={isScanning}
                            placeholder="https://github.com/owner/repository"
                            aria-label="Repository URL"
                            className="w-full bg-transparent text-[14px] font-semibold text-[#131b2e] placeholder:text-[#99a1af] focus:outline-none disabled:opacity-60 cursor-text"
                          />
                        </div>
                      </div>

                      {/* CTA Button matching Figma node 5:273 */}
                      <button
                        type="submit"
                        disabled={isScanning}
                        className="group bg-[#ff9640] hover:bg-[#f2852e] hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-75 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-[8px] px-[24px] py-[14px] rounded-[8px] shrink-0 shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)] transition-all duration-200 ease-out origin-center select-none"
                      >
                        <span className="font-bold text-white text-[17px] leading-[25.5px] whitespace-nowrap">
                          {isScanning ? "Đang quét..." : "Quét Dự Án"}
                        </span>
                        {isScanning ? (
                          <div className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 12 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                            aria-hidden="true"
                          >
                            <path
                              d="M9.13125 6.75H0V5.25H9.13125L4.93125 1.05L6 0L12 6L6 12L4.93125 10.95L9.13125 6.75V6.75"
                              fill="white"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    /* Zip File Upload Dropzone */
                    <div className="flex flex-col gap-3 w-full">
                      <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-[10px] p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                          dragActive
                            ? "border-[#ff9640] bg-[#fff7ed]"
                            : "border-[#d8dbeb] bg-[#f9faff] hover:border-[#ff9640]/60 hover:bg-[#fff9f4]"
                        } ${isScanning ? "opacity-60 pointer-events-none" : ""}`}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".zip,application/zip"
                          onChange={handleFileChange}
                          className="hidden"
                          disabled={isScanning}
                        />
                        <div className="size-10 rounded-full bg-[#ff9640]/10 flex items-center justify-center text-[#ff9640]">
                          <Upload className="size-5" />
                        </div>
                        {zipFile ? (
                          <div className="flex items-center gap-2 text-[14px] font-bold text-[#131b2e]">
                            <FileArchive className="size-4 text-[#ff9640]" />
                            <span>{zipFile.name}</span>
                            <span className="text-[#887365] text-[12px] font-normal">
                              ({(zipFile.size / (1024 * 1024)).toFixed(2)} MB)
                            </span>
                          </div>
                        ) : (
                          <div className="text-center">
                            <p className="text-[14px] font-semibold text-[#131b2e]">
                              Kéo thả tệp .zip hoặc{" "}
                              <span className="text-[#ff9640] underline">
                                chọn tệp
                              </span>
                            </p>
                            <p className="text-[12px] text-[#625e56] mt-0.5">
                              Tối đa 4.5MB theo tiêu chuẩn cấu hình hệ thống
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={isScanning || !zipFile}
                          className="bg-[#ff9640] hover:bg-[#f2852e] hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-[8px] px-[24px] py-[12px] rounded-[8px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1)] transition-all text-white font-bold text-[15px]"
                        >
                          <span>{isScanning ? "Đang tải lên..." : "Bắt Đầu Quét Zip"}</span>
                          {isScanning ? (
                            <div className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin shrink-0" />
                          ) : (
                            <ArrowRight className="size-4 shrink-0" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </form>

                {/* Real-time Scanning Progress Indicator */}
                {isScanning && (
                  <div className="w-full bg-[#fff7ed] border border-[#ff9640]/30 rounded-[10px] p-3.5 flex flex-col gap-2 animate-fadeIn">
                    <div className="flex items-center justify-between text-[13px] font-bold text-[#944b00]">
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-[#ff9640] animate-ping" />
                        <span>{scanStep || "Đang xử lý..."}</span>
                      </div>
                      <span className="font-mono text-[#ff9640]">
                        {scanElapsed.toFixed(1)}s
                      </span>
                    </div>
                    {/* Animated Progress Bar */}
                    <div className="w-full bg-[#ffe4d1] h-1.5 rounded-full overflow-hidden">
                      <div className="bg-[#ff9640] h-full rounded-full animate-pulse w-3/4" />
                    </div>
                  </div>
                )}

                {/* Error Banner with Friendly Vietnamese Message */}
                {errorMessage && (
                  <div className="w-full bg-red-50 border border-red-200 rounded-[10px] p-3.5 flex items-start gap-3 text-red-800 text-[13.5px] leading-relaxed">
                    <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-bold text-red-900">Không thể phân tích kho chứa</p>
                      <p className="text-red-700 mt-0.5">{errorMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-red-500 hover:text-red-800 font-semibold text-[12px] underline shrink-0"
                    >
                      Đóng
                    </button>
                  </div>
                )}

                {/* Success Notification */}
                {successSessionId && (
                  <div className="w-full bg-emerald-50 border border-emerald-200 rounded-[10px] p-3 flex items-center gap-2.5 text-emerald-800 text-[13.5px]">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      Phân tích thành công! Đang chuyển hướng vào buồng lái...
                    </span>
                  </div>
                )}
              </div>

              {/* Recent Sessions Section (Tiếp tục học - Bước 5) */}
              <div className="w-full flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#131b2e]">
                    <Clock className="size-4 text-[#ff9640]" />
                    <h4 className="font-bold text-[15px] tracking-tight">
                      Phiên học gần đây
                    </h4>
                  </div>
                  <Link
                    href="/roadmap"
                    className="text-[13px] font-semibold text-[#ff9640] hover:text-[#e6761c] flex items-center gap-1 transition-colors"
                  >
                    <span>Xem tất cả lộ trình</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>

                {isLoadingSessions ? (
                  /* Loading Shimmer State */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="bg-white border border-[#f0f1f5] rounded-[12px] p-3.5 flex flex-col gap-2.5 animate-pulse"
                      >
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                        <div className="h-2 bg-gray-100 rounded-full w-full mt-1" />
                      </div>
                    ))}
                  </div>
                ) : recentSessions.length > 0 ? (
                  /* Success State with Recent Sessions */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    {recentSessions.map((session) => {
                      const progressPct =
                        session.total_nodes > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (session.completed_count / session.total_nodes) *
                                  100
                              )
                            )
                          : 0;
                      const isResuming =
                        resumingSessionId === session.session_id;

                      return (
                        <div
                          key={session.session_id}
                          className="bg-white border border-[#eaecef] hover:border-[#ff9640]/50 drop-shadow-[0px_2px_4px_rgba(0,0,0,0.04)] rounded-[12px] p-3.5 flex flex-col justify-between gap-3 transition-all hover:shadow-md"
                        >
                          <div className="flex flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-bold text-[14px] text-[#131b2e] truncate max-w-[180px]">
                                {session.repo_name}
                              </h5>
                              <span className="text-[11px] font-bold text-[#ff9640] bg-[#fff7ed] px-2 py-0.5 rounded-full">
                                {progressPct}%
                              </span>
                            </div>
                            <p className="text-[12px] text-[#625e56]">
                              {session.completed_count}/{session.total_nodes} bài đã
                              vượt qua
                              {session.failed_count > 0 &&
                                ` • ${session.failed_count} cần ôn`}
                            </p>
                          </div>

                          {/* Progress line */}
                          <div className="w-full bg-[#f2f3ff] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#ff9640] h-full rounded-full transition-all duration-300"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                            <span className="text-[11px] text-[#99a1af]">
                              {new Date(session.last_active_at).toLocaleDateString(
                                "vi-VN"
                              )}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                handleResumeSession(session.session_id)
                              }
                              disabled={isResuming}
                              className="text-[12px] font-bold text-[#ff9640] hover:text-[#e6761c] flex items-center gap-1 disabled:opacity-50"
                            >
                              <span>{isResuming ? "Đang mở..." : "Học tiếp"}</span>
                              <ArrowRight className="size-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* Empty State when no previous sessions */
                  <div className="bg-[#f9faff] border border-dashed border-[#d8dbeb] rounded-[12px] p-4 flex items-center gap-3">
                    <BookOpen className="size-5 text-[#887365] shrink-0" />
                    <p className="text-[13px] text-[#625e56]">
                      Chưa có phiên học nào. Nhập liên kết GitHub ở trên hoặc tải file
                      zip để bắt đầu phân tích mã nguồn đầu tiên của bạn!
                    </p>
                  </div>
                )}
              </div>

              {/* Interactive Lottie Character Animation (Figma node 5:280) */}
              <div className="w-full flex items-center justify-center pt-2 sm:pt-4">
                <HeroAnimation />
              </div>
            </div>

            {/* Right Column: Hero Graphic Canvas & 3 Floating Badges (Figma node 5:431) */}
            <div className="lg:col-span-6 flex items-center justify-center w-full">
              <HeroVisual />
            </div>
          </div>
        </section>

        {/* 3. Training Framework Section (Figma node 5:480) */}
        <TrainingFramework />
      </main>

      {/* 4. Global Footer (Figma node 5:526) */}
      <HomeFooter />
    </div>
  );
}
