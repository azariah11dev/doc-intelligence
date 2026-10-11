"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function TicketPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
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

    try {
      const formData = new FormData();
      formData.append("username", localStorage.getItem("username") || "");
      formData.append("email", localStorage.getItem("email") || "");
      formData.append("subject", subject);
      formData.append("description", description);
      formData.append("priority", priority);

      if (file) {
        formData.append("file", file);
        return;
      }

      const response = await fetch("http://localhost:8000/contact/ticket", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Ticket submitted successfully");
      } else {
        setMessage(data.detail || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error submitting ticket");
    } finally {
      setUploading(false);
    }
  }

    function PageNav() {
        window.location.href = "/submitted_tickets"
    }

  return (
    <div className="ml-48 p-10 space-y-10 max-w-4xl flex flex-col">
      <h1 className="font-bold text-[29px] text-center">
        Raise An IT Ticket
      </h1>

      <div className="flex flex-col gap-8">
        <form onSubmit={submitTicket} className="flex flex-col gap-6">

          <div className="flex flex-col gap-2">
            <label htmlFor="subject">Subject:</label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-1/3 bg-[#020321] h-[30px]"
            >
              <option value=""></option>
              <option value="chat">Chat</option>
              <option value="chat_history">Chat history</option>
              <option value="sidebar">Sidebar</option>
              <option value="dashboard">Dashboard</option>
              <option value="documents">Documents</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="description">Description:</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue"
              className="h-[100px] text-black bg-gray-100"
            ></textarea>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="priority">Priority:</label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-1/3 bg-[#020321] h-[30px]"
            >
              <option value=""></option>
              <option value="high">High</option>
              <option value="mid">Mid</option>
              <option value="end">End</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label>Add relevant attachment:</label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full pt-2 text-sm mb-4 text-gray-300"
            />
          </div>

          <div className="w-full flex justify-center">
            <button
                type="submit"
                disabled={uploading}
                className="bg-[#020321] text-white px-4 py-2 rounded hover:bg-[#0b0c10] transition-colors"
            >
                {uploading ? "Submitting..." : "Submit Ticket"}
            </button>
          </div>

          {message && <p className="text-green-400">{message}</p>}
        </form>

        {role?.toLowerCase() === "admin" && (
          <div className="w-full">
            <button
            onClick={PageNav}
            className="p-2 hover:text-[#45a29e] cursor-pointer"
            >
              View Tickets
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
