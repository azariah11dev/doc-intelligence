"use client";
import { useEffect, useState } from "react";

export default function Dashboard() {
  const [greeting, setGreeting] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number>(0);

  useEffect(() => {
    setUsername(localStorage.getItem("username"));

    // Greeting logic
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) setGreeting("Morning");
    else if (hour >= 11 && hour < 16) setGreeting("Afternoon");
    else if (hour >= 16 && hour < 22) setGreeting("Evening");
    else setGreeting("Night");

    // Fetch document count
    const fetchDocs = async () => {
      try {
        const res = await fetch("http://localhost:8000/upload/files");
        const data = await res.json();

        if (data && typeof data.count === "number") {
          setDocCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch document count:", err);
      }
    };

    fetchDocs();
  }, []);

  return (
    <div className="ml-48 p-10 text-[#c5c6c7]">
      {/* Greeting */}
      <section className="mb-10 text-center">
        <h2 className="text-3xl font-bold">
          Good {greeting}, {username}
        </h2>
        <p className="text-gray-400 mt-2">
          Here's what's happening with your documents.
        </p>
      </section>

      {/* Summary Card */}
      <section className="mb-12">
        <h3 className="text-xl font-semibold mb-4">Uploaded Documents</h3>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-[#0b0c10] border border-[#1f2833] p-6 rounded-lg text-center">
            <p className="text-4xl font-bold text-white">{docCount}</p>
            <p className="text-gray-400 mt-2">Documents</p>
          </div>
        </div>
      </section>

      {/* Recent Documents */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold">Recent Documents</h3>
          <button className="text-[#45a29e] hover:text-[#66fcf1]">
            View all →
          </button>
        </div>

        <div className="bg-[#0b0c10] border border-[#1f2833] rounded-lg p-6">
          <p className="text-gray-400">Placeholder for pulling all files</p>
        </div>
      </section>
    </div>
  );
}
