"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiFetch, openProtectedFile } from "@/lib/api";

type Ticket = {
    id: string;
    username: string;
    email: string;
    subject: string | null;
    description: string | null;
    priority: string | null;
    status: string | null;
    filepath: string | null;
};

function priorityBadge(priority: string | null): string {
    switch (priority?.toLowerCase()) {
        case "high":
            return "bg-red-500/10 text-red-400 border-red-500/30";
        case "mid":
            return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
        case "low":
        case "end":
            return "bg-teal-500/10 text-teal-300 border-teal-500/30";
        default:
            return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
}

export default function SubmittedTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function loadTickets() {
        try {
            const res = await apiFetch("/contact/open_tickets", {
                method: "GET",
            });
            if (!res.ok) {
                throw new Error(`Failed to load tickets: ${res.status}`);
            }
            const data = await res.json();
            setTickets(data);
        } catch (err) {
            console.error(err);
            setError(
                err instanceof Error ? err.message : "Could not reach the server"
            );
        } finally {
            setLoading(false);
        }
    }

    async function updateStatus(id: string, newStatus: string) {
        try {
            const params = new URLSearchParams({
                ticket_id: id,
                new_status: newStatus,
            });
            const res = await apiFetch(
                `/contact/update_status?${params}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                }
            );
            if (!res.ok) {
                throw new Error(`Failed to update ticket status: ${res.status}`);
            }

            setTickets((prev) =>
                prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
            );
        } catch (err) {
            console.error("Failed to update ticket status:", err);
            window.alert("Could not update ticket status. Please try again.");
        }
    }

    function viewAttachment(filepath: string | null) {
        if (!filepath) {
            alert("No attachment");
            return;
        }
        const filename = filepath.split(/[/\\]/).pop();
        if (!filename) {
            alert("Invalid attachment path");
            return;
        }
        void openProtectedFile(
            `/contact/tickets/files/${encodeURIComponent(filename)}`
        );
    }

    useEffect(() => {
        loadTickets();
    }, []);

    return (
        <div className="ml-48 px-10 py-12 text-[#c5c6c7]">
            <div className="mx-auto w-full max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white">Open Tickets</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {loading ? "Loading..." : `${tickets.length} open`}
                        </p>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                        <Link
                            href="/ticket"
                            className="text-[#45a29e] hover:text-[#66fcf1] transition-colors"
                        >
                            ← Back
                        </Link>
                        <Link
                            href="/view_all"
                            className="text-[#45a29e] hover:text-[#66fcf1] transition-colors"
                        >
                            View All →
                        </Link>
                    </div>
                </div>

                {/* Table card */}
                <div className="bg-[#0b0c10] border border-[#1f2833] rounded-lg overflow-hidden">
                    {loading ? (
                        <p className="px-6 py-5 text-sm text-gray-500">Loading tickets...</p>
                    ) : error ? (
                        <p className="px-6 py-5 text-sm text-red-400">{error}</p>
                    ) : tickets.length === 0 ? (
                        <p className="px-6 py-5 text-sm text-gray-500">No open tickets</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#1f2833] text-xs uppercase tracking-wide text-gray-500">
                                        <th className="text-left font-medium px-6 py-3">User</th>
                                        <th className="text-left font-medium px-6 py-3">Email</th>
                                        <th className="text-left font-medium px-6 py-3">Subject</th>
                                        <th className="text-left font-medium px-6 py-3">Description</th>
                                        <th className="text-left font-medium px-6 py-3">Priority</th>
                                        <th className="text-left font-medium px-6 py-3">Status</th>
                                        <th className="text-left font-medium px-6 py-3">Attachment</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#1f2833]">
                                    {tickets.map((t) => (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-gray-800/60 transition-colors"
                                        >
                                            <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                                                {t.username}
                                            </td>
                                            <td className="px-6 py-4 text-gray-400">{t.email}</td>
                                            <td className="px-6 py-4 capitalize whitespace-nowrap">
                                                {t.subject?.replace(/_/g, " ")}
                                            </td>
                                            <td className="px-6 py-4 max-w-xs text-gray-300">
                                                <div className="line-clamp-2" title={t.description || ""}>
                                                    {t.description}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`inline-block px-2 py-0.5 rounded-full border text-xs capitalize ${priorityBadge(
                                                        t.priority
                                                    )}`}
                                                >
                                                    {t.priority || "—"}
                                                </span>
                                            </td>

                                            <td className="px-6 py-4">
                                                <select
                                                    value={t.status || "open"}
                                                    onChange={(e) => updateStatus(t.id, e.target.value)}
                                                    className="bg-[#0b0c10] text-[#c5c6c7] border border-[#1f2833] rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#45a29e]"
                                                >
                                                    <option value="open">Open</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </td>

                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => viewAttachment(t.filepath)}
                                                    disabled={!t.filepath}
                                                    className="text-xs border border-[#45a29e] text-[#45a29e] px-3 py-1 rounded hover:bg-[#45a29e] hover:text-[#0b0c10] transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#45a29e]"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}