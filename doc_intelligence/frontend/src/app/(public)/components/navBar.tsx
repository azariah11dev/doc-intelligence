"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 w-full h-16 bg-transparent backdrop-blur-md flex flex-row items-center justify-between px-8 z-50 border-b border-[#1f2833]">
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="TaskForge logo" className="w-8 h-8" />
        <span className="text-[#c5c6c7] font-bold text-xl hover:text-[#45a29e] transition-colors">
          <Link href="/">Doc Intelligence</Link>
        </span>
      </div>

      <ul className="flex gap-8 text-[#c5c6c7] font-semibold">
        <li>
          <Link href="/features" className="hover:text-[#45a29e] transition-colors">
            Features
          </Link>
        </li>
        <li>
          <Link href="/about" className="hover:text-[#45a29e] transition-colors">
            About
          </Link>
        </li>
        <li>
          <Link href="/contacts" className="hover:text-[#45a29e] transition-colors">
            Contacts
          </Link>
        </li>
        <li>
          <Link href="/login" className="hover:text-[#45a29e] transition-colors">
            Login
          </Link>
        </li>
      </ul>
    </nav>
  );
}