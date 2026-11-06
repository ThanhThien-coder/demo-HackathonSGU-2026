import { BookOpen } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { PageHeader } from "@/components/ui/Page";

const STEPS = [
  ["Dán link repo", "Bản đồ tối đa 20 node dựng bằng code thuần (Tree-sitter, đồ thị gọi hàm, PageRank), 0 token. Mỗi node là một lát cắt nghiệp vụ xuyên file."],
  ["Đọc X-Ray", "AI phân tích từng node: kỹ năng, điểm hay, điểm dở (gắn nhãn “Nhận định của AI”). Mọi văn bản AI đều qua cổng gác chặn tên bịa và công nghệ ngoài repo — không bảo đảm đúng nghĩa 100%."],
  ["Trả lời câu hỏi Feynman", "Câu hỏi nhắm đúng kỹ năng bạn còn yếu. Tối đa 3 lượt, có gợi ý theo bậc, đáp án chỉ hiện khi câu kết thúc."],
  ["Mài mòn kỹ năng", "Điểm kỹ năng nhạt dần theo thời gian không luyện (chỉ hiển thị), không có nút ôn tập."],
] as const;

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="anim-fade-up mx-auto max-w-4xl px-6 py-10">
        <PageHeader icon={<BookOpen className="h-5 w-5" />} title="Cách học với SimpliFey" description="Bốn bước từ một link repo tới việc tự giải thích được kiến trúc." />
        <ol className="stagger mt-6 grid gap-3 sm:grid-cols-2">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="sf-card rounded-xl p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-2 font-mono text-sm font-bold text-on-accent">{i + 1}</span>
              <p className="mt-3 font-bold text-text">{t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-subtle">Hỗ trợ kiểm chứng: TypeScript/JavaScript và Python. Số liệu độ trễ / token trên giao diện là số đo thật của từng lần chạy.</p>
      </main>
    </>
  );
}
