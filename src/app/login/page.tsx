"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoginScreen } from "@/components/home/Home";
import { Navbar } from "@/components/layout/Navbar";
import { useWorkbench } from "@/store/workbench";

export default function LoginPage() {
  const auth = useWorkbench((s) => s.ui.auth);
  const router = useRouter();
  useEffect(() => { if (auth === "user") router.replace("/"); }, [auth, router]);
  return <><Navbar /><LoginScreen /></>;
}
