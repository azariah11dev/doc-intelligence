"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ComputerDesktopIcon,
  FolderIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  TicketIcon,
  ArrowLeftStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

// Shared classes so every row lines up identically.
// The flex layout lives on the <Link> (the element that directly wraps the
// icon + label), not on the <li>.
const itemClass =
  "flex items-center gap-3 w-full px-4 py-2 text-[#c5c6c7] hover:text-[#45a29e] transition-colors cursor-pointer";
const iconClass = "w-5 h-5 shrink-0";

export default function SideBar() {
  const router = useRouter();
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
    localStorage.removeItem("email");
    localStorage.removeItem("conversation_id");
    localStorage.removeItem("open_conversation_id");
    router.push("/login");
  };

  return (
    <div className="fixed h-screen w-48 flex flex-col justify-between font-semibold py-4 bg-black z-40">
      {/* TOP SECTION */}
      <ul className="flex flex-col">
        <li className="text-sm text-[#c5c6c7] text-center px-2">
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

        <li>
          <Link href="/dashboard" className={itemClass}>
            <ComputerDesktopIcon className={iconClass} />
            <span>Dashboard</span>
          </Link>
        </li>

        <li>
          <Link href="/documents" className={itemClass}>
            <FolderIcon className={iconClass} />
            <span>Documents</span>
          </Link>
        </li>

        <li>
          <Link href="/chat" className={itemClass}>
            <ChatBubbleOvalLeftEllipsisIcon className={iconClass} />
            <span>Chat</span>
          </Link>
        </li>

        <li>
          <Link href="/chat_history" className={itemClass}>
            <ChatBubbleLeftRightIcon className={iconClass} />
            <span>Chat History</span>
          </Link>
        </li>

        {role?.toLowerCase() === "admin" && (
          <li>
            <Link href="/user-roles" className={itemClass}>
              <UserGroupIcon className={iconClass} />
              <span>User Roles</span>
            </Link>
          </li>
        )}
      </ul>

      {/* BOTTOM SECTION */}
      <ul className="flex flex-col">
        <li>
          <Link href="/ticket" className={itemClass}>
            <TicketIcon className={iconClass} />
            <span>Ticket</span>
          </Link>
        </li>

        <li>
          <Link
            href="/login"
            className={itemClass}
            onClick={(event) => {
              event.preventDefault();
              logoutBtn();
            }}
          >
            <ArrowLeftStartOnRectangleIcon className={iconClass} />
            <span>Logout</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}