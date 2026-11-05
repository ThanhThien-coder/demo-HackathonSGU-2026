import { redirect } from "next/navigation";

// Đăng ký = đăng nhập GitHub (30 Mục 2): chuyển sang /login.
export default function RegisterPage() {
  redirect("/login");
}
