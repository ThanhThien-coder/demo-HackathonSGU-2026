// Dùng được ở server component (layout.tsx) — không đánh dấu "use client".
export const PREFS_KEY = "sf.prefs";

/** Chạy trước khi vẽ trang: đọc chủ đề đã lưu và gán lên <html>. Chuỗi hằng, không chứa dữ liệu người dùng. */
export const THEME_INIT_SCRIPT =
  `try{var p=JSON.parse(localStorage.getItem("${PREFS_KEY}")||"{}");if(p&&(p.theme==="light"||p.theme==="dark"))document.documentElement.dataset.theme=p.theme;}catch(e){}`;

