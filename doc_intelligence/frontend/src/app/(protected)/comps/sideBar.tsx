"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function SideBar() {
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setUsername(localStorage.getItem("username"));
    setRole(localStorage.getItem("role"));

    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateString = now?.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const timeString = now?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const logoutBtn = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("access_token");
    window.location.assign("/login");
  };
  
  return (
    <div className="fixed h-screen w-48 flex flex-col gap-20 font-semibold pt-4 bg-black z-40">
      <ul className="gap-9 text-center">
        <li className="text-sm text-[#c5c6c7]">
            <span className="hover:text-[#45a29e] transition-colors font-bold text-lg">
              {username} ({role})
            </span>
            <div className="mt-2 mb-4">
                {now && (
                    <>
                        <span>{dateString}</span> • <span>{timeString}</span>
                    </>
                )}
            </div>
        </li>

        <li className="p-4 hover:text-[#45a29e] cursor-pointer">
          <Link href="/dashboard">Dashboard</Link>
        </li>

        <li className="p-4 hover:text-[#45a29e] cursor-pointer">
          <Link href="/documents">Documents</Link>
        </li>

        <li className="p-4 hover:text-[#45a29e] cursor-pointer">
          <Link href="/chat">Chat</Link>
        </li>

        {/* ADMIN ONLY ITEM */}
        {role?.toLowerCase() === "admin" && (
          <li className="p-4 hover:text-[#45a29e] cursor-pointer">
            <Link href="/user-roles">User Roles</Link>
          </li>
        )}
      </ul>
      <ul className="gap-9 text-center">
        <li className="p-4 hover:text-[#45a29e] cursor-pointer">
          <Link href="/ticket">Ticket</Link>
        </li>

        <li>
          <Link
            href="/login"
            className="text-[#c5c6c7] hover:text-[#45a29e] transition-colors"
            onClick={(event) => {
              event.preventDefault();
              logoutBtn();
            }}
          >
            Logout
          </Link>
        </li>
      </ul>
    </div>
  );
}