"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type availableFile = {
  path: string;
  name: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [greeting, setGreeting] = useState("");
  const [username, setUsername] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number>(0);

  // File Management
  const [files, setFiles] = useState<availableFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filesError, setFilesError] = useState("");

  useEffect(() => {
    setUsername(localStorage.getItem("username"));

    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) setGreeting("Morning");
    else if (hour >= 11 && hour < 16) setGreeting("Afternoon");
    else if (hour >= 16 && hour < 22) setGreeting("Evening");
    else setGreeting("Night");

    const fetchDocs = async () => {
      try {
        const res = await fetch("http://localhost:8000/upload/files");
        const data = await res.json();

        if (typeof data.count === "number") {
          setDocCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch document count:", err);
      }
    };

    const recentDocs = async () => {
      setFilesLoading(true);
      setFilesError("");
      try {
        const response = await fetch("http://localhost:8000/upload/recent_files");
        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const data = await response.json();

        // Backend returns an array, not { files: [...] }
        const parsed: availableFile[] = data.map((p: string) => ({
          path: p,
          name: p.split(/[\\/]/).pop() || p,
        }));

        setFiles(parsed);
      } catch (error) {
        setFilesError(
          error instanceof Error ? error.message : "Could not reach the server"
        );
      } finally {
        setFilesLoading(false);
      }
    };

    fetchDocs();
    recentDocs();
  }, []);

  function docPagenav() {
    router.push("/documents");
  }

  function viewDocumentattachment(filepath: string | null) {
        if (!filepath) {
            alert("No attachment");
            return;
        }
        const filename = filepath.split(/[/\\]/).pop();
        if (!filename) {
            alert("Invalid attachment path");
            return;
        }
        window.open(
            `http://localhost:8000/upload/files/view/${encodeURIComponent(filename)}`,
            "_blank",
            "noopener,noreferrer"
        );
    }

  return (
    <div className="ml-48 px-10 py-12 text-[#c5c6c7]">
      <div className="mx-auto w-full max-w-5xl space-y-12">
        {/* Greeting */}
        <section className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">
            Good {greeting}
            {username ? `, ${username}` : ""}
          </h2>
          <p className="text-gray-400">
            Here&apos;s what&apos;s happening with your documents.
          </p>
        </section>

        {/* Summary Cards */}
        <section className="space-y-4">
          <h3 className="text-xl font-semibold">Overview</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-[#0b0c10] border border-[#1f2833] p-6 rounded-lg text-center">
              <p className="text-4xl font-bold text-white">{docCount}</p>
              <p className="text-gray-400 mt-2 text-sm">Uploaded Documents</p>
            </div>
          </div>
        </section>

        {/* Recent Documents */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Recent Documents</h3>
            <button
              onClick={docPagenav}
              className="text-sm text-[#45a29e] hover:text-[#66fcf1] transition-colors">
              View all →
            </button>
          </div>

          <div className="bg-[#0b0c10] border border-[#1f2833] rounded-lg overflow-hidden">
            {filesLoading ? (
              <p className="px-6 py-5 text-sm text-gray-500">
                Loading documents...
              </p>
            ) : filesError ? (
              <p className="px-6 py-5 text-sm text-red-400">{filesError}</p>
            ) : files.length === 0 ? (
              <p className="px-6 py-5 text-sm text-gray-500">
                No documents uploaded yet
              </p>
            ) : (
              <ul className="divide-y divide-[#1f2833]">
                {files.map((f) => (
                  <li
                    key={f.path}
                    onDoubleClick={() => viewDocumentattachment(f.path)}
                    className="px-6 py-3 text-sm hover:bg-gray-800/60 transition-colors flex items-center justify-between gap-6"
                  >
                    <span className="truncate font-medium">{f.name}</span>
                    <span className="text-gray-500 text-xs truncate max-w-[40%]">
                      {f.path}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}