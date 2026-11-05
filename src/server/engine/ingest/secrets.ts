// 10 Mục 11 — che secret (Zero-Leak, bảo toàn dòng) và gắn cờ injection.
import { CONFIG } from "@/contracts/config";

export const MASK = "<REDACTED_SECRET>";

const PRIVATE_KEY_BLOCK =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g;

const TOKEN_PATTERNS: RegExp[] = [
  /AKIA[0-9A-Z]{16}/g,
  /\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{36}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{22,}\b/g,
  /\bsk-[A-Za-z0-9_-]{20,}\b/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
];

// K: tên biến chứa password|secret|token… (không đứng sau '-' hay chữ để tránh 'current-password')
const KEY_VALUE =
  /((?<![A-Za-z0-9_-])["'`]?[A-Za-z0-9_]*(?:password|passwd|pwd|secret|api_?key|token|private_?key|access_?key)(?:_[A-Za-z0-9]+)*["'`]?\s*[:=]\s*)(["'`])([^"'`\n]*)\2/gi;

const URL_CRED = /((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp|https?):\/\/[^:/\s]+:)([^@/\s]+)(@)/gi;

export function redactSecrets(code: string): { code: string; count: number } {
  let count = 0;
  let out = code.replace(PRIVATE_KEY_BLOCK, (block) => {
    count++;
    const lines = block.split("\n");
    if (lines.length === 1) return MASK;
    return lines.map((l) => `${/^\s*/.exec(l)![0]}${MASK}`).join("\n");
  });
  for (const re of TOKEN_PATTERNS) out = out.replace(re, () => { count++; return MASK; });
  out = out.replace(KEY_VALUE, (full, head: string, q: string, value: string) => {
    if (value.length < CONFIG.SECRET_MIN_VALUE_LENGTH || value === MASK) return full;
    count++;
    return `${head}${q}${MASK}${q}`;
  });
  out = out.replace(URL_CRED, (full, a: string, pw: string, at: string) => {
    if (pw === MASK) return full;
    count++;
    return `${a}${MASK}${at}`;
  });
  return { code: out, count };
}

// ING-113
const INJECTION_RE =
  /(ignore|disregard|forget)\s+(all\s+)?(the\s+)?(previous|above|prior)\s+(instructions?|prompts?)|you\s+are\s+now\b|system\s+prompt|<\/?\s*(system|instructions?)\s*>/i;
export const hasInjectionText = (code: string): boolean => INJECTION_RE.test(code);
