"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import SideBar from "./comps/sideBar";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const accessToken = window.localStorage.getItem("access_token");

    if (!accessToken) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 text-[#c5c6c7] flex flex-col">
      <SideBar />

      <main className="flex-1 pt-16 pl-48 p-4">
        {children}
      </main>
    </div>
  );
}