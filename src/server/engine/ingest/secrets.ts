import { CONFIG } from "@/contracts";
import { maskSensitive } from "@/lib/moderation";

const REDACTED_SECRET = "<REDACTED_SECRET>";

// 1. Regex cho khối private key theo ING-110
const PRIVATE_KEY_BLOCK_REGEX =
  /^[ \t]*-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[\s\S]*?^[ \t]*-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----[^\r\n]*/gm;

// 1b. Khối private key nằm trong 1 dòng (chuỗi có "\n" dạng chữ): thay cả đoạn (ING-110)
const INLINE_PRIVATE_KEY_REGEX =
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----(?:(?!-----END)[^\r\n])*-----END (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g;

// 2. Regex cho các token bí mật (AWS, GitHub, OpenAI, JWT, Google AI, Stripe, Slack)
const SECRET_TOKEN_REGEX =
  /(?:AKIA[0-9A-Z]{16}|\b(?:ghp|gho|ghs|ghu)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b|\bsk-[A-Za-z0-9_-]{20,}\b|\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b|\bxox[abprs]-[A-Za-z0-9-]{10,}\b)/g;

// 3. Regex cho phép gán secret (ING-110: K có tiền tố và hậu tố, có thể nằm trong cặp nháy;
//    khớp JWT_SECRET, SECRET_KEY, DB_PASSWORD_PROD, "password":, 'apiKey':)
const ASSIGNMENT_SECRET_REGEX =
  /([A-Za-z0-9_]*(?:password|passwd|pwd|secret|api_?key|token|private_?key|access_?key)(?:_[A-Za-z0-9]+)*["'`]?\s*[:=]\s*)(["'`])([^"'`\r\n\s]+)\2/gi;

// 4. Regex cho chuỗi kết nối database / message broker / URL có user:pass
const CONNECTION_STRING_REGEX =
  /((?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqp|https?):\/\/)([^:/\s]+):([^@\s]+)(@)/gi;

// ING-113: Regex kiểm tra cờ injection
const INJECTION_REGEX =
  /(ignore|disregard|forget)\s+(all\s+)?(the\s+)?(previous|above|prior)\s+(instructions?|prompts?)|you\s+are\s+now\b|system\s+prompt|<\/?\s*(system|instructions?)\s*>/i;

/**
 * Đếm số ký tự newline (\n) trong chuỗi
 */
function countNewlines(str: string): number {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "\n") {
      count++;
    }
  }
  return count;
}

/**
 * Đếm số lần chuỗi con xuất hiện
 */
function countOccurrences(str: string, substr: string): number {
  if (!str || !substr) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(substr, pos)) !== -1) {
    count++;
    pos += substr.length;
  }
  return count;
}

/**
 * Che các secret trong mã nguồn theo docs/spec/10_ENGINE_INGEST.md Mục 11 (ING-110)
 */
export function redactSecrets(code: string): { code: string; count: number } {
  let result = code;
  let count = 0;

  // Bước 1: Khối Private Key
  result = result.replace(PRIVATE_KEY_BLOCK_REGEX, (block) => {
    count++;
    const lines = block.split("\n");
    const redactedLines = lines.map((line) => {
      const indentMatch = line.match(/^[ \t]*/);
      const indent = indentMatch ? indentMatch[0] : "";
      return `${indent}${REDACTED_SECRET}`;
    });
    return redactedLines.join("\n");
  });

  // Bước 1b: Khối private key viết trong 1 dòng
  result = result.replace(INLINE_PRIVATE_KEY_REGEX, () => {
    count++;
    return REDACTED_SECRET;
  });

  // Bước 2: Token bí mật
  result = result.replace(SECRET_TOKEN_REGEX, (match) => {
    if (match === REDACTED_SECRET) {
      return match;
    }
    count++;
    return REDACTED_SECRET;
  });

  // Bước 3: Phép gán secret
  result = result.replace(
    ASSIGNMENT_SECRET_REGEX,
    (fullMatch, prefix, quote, value) => {
      if (value === REDACTED_SECRET) {
        return fullMatch;
      }
      if (value.length >= CONFIG.SECRET_MIN_VALUE_LENGTH) {
        count++;
        return `${prefix}${quote}${REDACTED_SECRET}${quote}`;
      }
      return fullMatch;
    }
  );

  // Bước 4: Chuỗi kết nối URL
  result = result.replace(
    CONNECTION_STRING_REGEX,
    (fullMatch, scheme, user, pass, at) => {
      if (pass === REDACTED_SECRET) {
        return fullMatch;
      }
      count++;
      return `${scheme}${user}:${REDACTED_SECRET}${at}`;
    }
  );

  return { code: result, count };
}

/**
 * Kiểm tra xem chuỗi có chứa prompt injection hay không theo docs/spec/10_ENGINE_INGEST.md Mục 11 (ING-113)
 */
export function hasInjectionText(code: string): boolean {
  if (!code) return false;
  return INJECTION_REGEX.test(code);
}

/**
 * Làm sạch mã nguồn kết hợp redactSecrets, kiểm tra bảo toàn dòng và maskSensitive (spec 04 Mục 13 ý 5, spec 10 Mục 11 ý 3)
 */
export function redactAndMaskCode(rawCode: string): {
  code: string;
  count: number;
  linePreserved: boolean;
} {
  const originalLineCount = countNewlines(rawCode);

  // 1. Che secret theo ING-110
  const { code: redactedSecretsCode, count: secretCount } =
    redactSecrets(rawCode);

  if (countNewlines(redactedSecretsCode) !== originalLineCount) {
    return {
      code: rawCode,
      count: 0,
      linePreserved: false,
    };
  }

  // 2. Che PII và từ xấu bằng maskSensitive
  const asterisksBefore = countOccurrences(redactedSecretsCode, "***");
  const finalCode = maskSensitive(redactedSecretsCode);
  const asterisksAfter = countOccurrences(finalCode, "***");
  const sensitiveAdded = Math.max(0, asterisksAfter - asterisksBefore);

  if (countNewlines(finalCode) !== originalLineCount) {
    return {
      code: rawCode,
      count: 0,
      linePreserved: false,
    };
  }

  return {
    code: finalCode,
    count: secretCount + sensitiveAdded,
    linePreserved: true,
  };
}
