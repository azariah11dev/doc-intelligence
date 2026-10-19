"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";

export default function TicketPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("");

  useEffect(() => {
    setRole(localStorage.getItem("role"));
  }, []);

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    setMessage("");
    setIsError(false);

    try {
      const formData = new FormData();
      formData.append("subject", subject);
      formData.append("description", description);
      formData.append("priority", priority);

      // Fixed: the original `return` here meant tickets with an attachment were never sent
      if (file) {
        formData.append("file", file);
      }

      const response = await apiFetch("/contact/ticket", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setMessage("Ticket submitted successfully");
        setSubject("");
        setDescription("");
        setPriority("");
        setFile(null);
      } else {
        setIsError(true);
        setMessage(data.detail || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage("Error submitting ticket");
    } finally {
      setUploading(false);
    }
  }

  const fieldClass =
    "w-full bg-[#0b0c10] text-[#c5c6c7] border border-[#1f2833] rounded px-3 py-2 text-sm " +
    "placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#45a29e] focus:border-[#45a29e]";

  return (
    <div className="ml-48 px-10 py-12 text-[#c5c6c7]">
      <div className="mx-auto w-full max-w-2xl space-y-8">
        <h1 className="font-bold text-3xl text-center text-white">
          Raise An IT Ticket
        </h1>

        <div className="bg-[#0b0c10] border border-[#1f2833] rounded-lg p-8">
          <form onSubmit={submitTicket} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject
              </label>
              <select
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Select a subject</option>
                <option value="chat">Chat</option>
                <option value="chat_history">Chat history</option>
                <option value="sidebar">Sidebar</option>
                <option value="dashboard">Dashboard</option>
                <option value="documents">Documents</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your issue"
                required
                rows={5}
                className={`${fieldClass} resize-y`}
              ></textarea>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <select
                id="priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                required
                className={fieldClass}
              >
                <option value="">Select a priority</option>
                <option value="high">High</option>
                <option value="mid">Mid</option>
                {/* Value changed from "end" to "low" - make sure your backend accepts it */}
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="attachment" className="text-sm font-medium">
                Add relevant attachment{" "}
                <span className="text-gray-500 font-normal">(optional)</span>
              </label>
              <input
                id="attachment"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4 file:rounded file:border-0
                  file:bg-[#1f2833] file:text-[#c5c6c7] file:text-sm
                  hover:file:bg-[#45a29e] hover:file:text-[#0b0c10] file:cursor-pointer file:transition-colors"
              />
            </div>

            <div className="w-full flex justify-center pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="bg-[#45a29e] text-[#0b0c10] font-semibold px-6 py-2 rounded
                  hover:bg-[#66fcf1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>

            {message && (
              <p
                className={`text-sm text-center ${
                  isError ? "text-red-400" : "text-teal-300"
                }`}
              >
                {message}
              </p>
            )}
          </form>
        </div>

        {role?.toLowerCase() === "admin" && (
          <div className="flex justify-center">
            <Link
              href="/submitted_tickets"
              className="text-sm text-[#45a29e] hover:text-[#66fcf1] transition-colors"
            >
              View Tickets →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}