// Đọc JSON có comment và dấu phẩy thừa (tsconfig, jsconfig, package.json hỏng nhẹ) — ING-120, lỗi B-25.
// Bỏ comment có xét chuỗi: "https://..." , "@/*" , "src/**/*" nằm trong chuỗi nên giữ nguyên.

/**
 * Bỏ BOM, comment `//`, `/* *\/` và dấu phẩy thừa trước `]` hoặc `}`; nội dung trong chuỗi "..." giữ nguyên.
 * Số dòng không đổi (comment nhiều dòng giữ lại ký tự xuống dòng).
 */
export function stripJsonc(input: string): string {
  const src = input.replace(/^﻿/, "");
  let out = "";
  let i = 0;
  const n = src.length;

  while (i < n) {
    const ch = src[i];

    if (ch === '"') {
      let j = i + 1;
      while (j < n && src[j] !== '"') {
        if (src[j] === "\\") j++;
        j++;
      }
      out += src.slice(i, j + 1);
      i = j + 1;
      continue;
    }

    if (ch === "/" && src[i + 1] === "/") {
      while (i < n && src[i] !== "\n" && src[i] !== "\r") i++;
      continue;
    }

    if (ch === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end === -1 ? n : end + 2;
      for (let k = i; k < stop; k++) {
        if (src[k] === "\n") out += "\n";
      }
      i = stop;
      continue;
    }

    if (ch === ",") {
      // Dấu phẩy thừa: sau nó chỉ còn khoảng trắng hoặc comment rồi tới ] hoặc }
      let j = i + 1;
      for (;;) {
        while (j < n && /\s/.test(src[j])) j++;
        if (src[j] === "/" && src[j + 1] === "/") {
          while (j < n && src[j] !== "\n") j++;
        } else if (src[j] === "/" && src[j + 1] === "*") {
          const end = src.indexOf("*/", j + 2);
          j = end === -1 ? n : end + 2;
        } else {
          break;
        }
      }
      if (src[j] === "]" || src[j] === "}") {
        i++;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return out;
}

/** Parse JSON có comment và dấu phẩy thừa. Ném lỗi nếu vẫn không hợp lệ. */
export function parseJsonc<T = unknown>(input: string): T {
  return JSON.parse(stripJsonc(input)) as T;
}
