import { Navbar } from "@/components/layout/Navbar";

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
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-extrabold">Cách học với SimpliFey</h1>
        <ol className="mt-6 flex flex-col gap-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-xl border border-line bg-panel p-4"><p className="font-bold"><span className="mr-2 text-amber">{i + 1}.</span>{t}</p><p className="mt-1 text-sm text-muted">{d}</p></li>
          ))}
        </ol>
        <p className="mt-6 text-xs text-muted">Hỗ trợ kiểm chứng: TypeScript/JavaScript và Python. Số liệu độ trễ / token trên giao diện là số đo thật của từng lần chạy.</p>
      </main>
    </>
  );
}
