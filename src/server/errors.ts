// 03 — map lỗi: ném AppError ở service, route.ts chuyển thành ApiError + mã HTTP.
import { NextResponse } from "next/server";
import { HTTP_STATUS, RETRYABLE_CODES } from "@/contracts/api";
import type { ApiError, ErrorCode } from "@/contracts";
import { messageFor } from "@/lib/messages";
import { log } from "./log";

export class AppError extends Error {
  readonly code: Exclude<ErrorCode, "ERR_CLIENT_NETWORK">;
  readonly details?: Record<string, string | number | boolean>;
  constructor(code: Exclude<ErrorCode, "ERR_CLIENT_NETWORK">, details?: Record<string, string | number | boolean>) {
    super(code);
    this.code = code;
    this.details = details;
  }
}

export const fail = (code: AppError["code"], details?: AppError["details"]): never => {
  throw new AppError(code, details);
};

export function toApiError(e: AppError): ApiError {
  return {
    error: {
      code: e.code,
      message: messageFor(e.code, e.details),
      retryable: RETRYABLE_CODES.has(e.code),
      ...(e.details ? { details: e.details } : {}),
    },
  };
}

/** Bọc route handler: AppError ⇒ ApiError; lỗi lạ ⇒ log + ERR_PERSISTENCE_UNAVAILABLE (503). */
export async function handle<T>(fn: () => Promise<T>, okStatus = 200): Promise<NextResponse> {
  try {
    const out = await fn();
    if (out === undefined || out === null) return new NextResponse(null, { status: 204 });
    return NextResponse.json(out, { status: okStatus });
  } catch (e) {
    if (e instanceof AppError) {
      return NextResponse.json(toApiError(e), { status: HTTP_STATUS[e.code] });
    }
    log.error({ event: "unhandled", err: e instanceof Error ? e.message : String(e) });
    const err = new AppError("ERR_PERSISTENCE_UNAVAILABLE");
    return NextResponse.json(toApiError(err), { status: HTTP_STATUS[err.code] });
  }
}
