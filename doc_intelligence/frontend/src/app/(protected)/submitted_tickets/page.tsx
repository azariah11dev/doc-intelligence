"use client";

import { useEffect, useState } from "react";

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

export default function SubmittedTickets() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadTickets() {
        try {
            const res = await fetch("http://localhost:8000/contact/open_tickets", {
                method: "GET",
            });
            if (!res.ok) {
                throw new Error(`Failed to load tickets: ${res.status}`);
            }
            const data = await res.json();
            setTickets(data);
        } catch (err) {
            console.error(err);
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
            const res = await fetch(
                `http://localhost:8000/contact/update_status?${params}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                }
            );
            if (!res.ok) {
                throw new Error(`Failed to update ticket status: ${res.status}`);
            }

            setTickets(prev =>
                prev.map(t =>
                    t.id === id ? { ...t, status: newStatus } : t
                )
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
        window.open(`http://localhost:8000/${filepath}`, "_blank");
    }

    useEffect(() => {
        loadTickets();
    }, []);

    if (loading) return <div className="ml-48 p-10">Loading...</div>;

    const backBtn = () => {
        window.location.assign("/ticket");
    };

    const viewAllBtn = () => {
        window.location.assign("/view_all");
    };

    return (
        <div className="ml-48 p-10">
            <h1 className="text-2xl font-bold mb-6">Open Tickets</h1>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-800 text-white">
                        <th className="p-2 border">User</th>
                        <th className="p-2 border">Email</th>
                        <th className="p-2 border">Subject</th>
                        <th className="p-2 border">Description</th>
                        <th className="p-2 border">Priority</th>
                        <th className="p-2 border">Status</th>
                        <th className="p-2 border">Attachment</th>
                    </tr>
                </thead>

                <tbody>
                    {tickets.map((t, idx) => (
                        <tr key={idx} className="border">
                            <td className="p-2 border">{t.username}</td>
                            <td className="p-2 border">{t.email}</td>
                            <td className="p-2 border">{t.subject}</td>
                            <td className="p-2 border">{t.description}</td>
                            <td className="p-2 border">{t.priority}</td>

                            <td className="p-2 border">
                                <select
                                    value={t.status || "open"}
                                    onChange={(e) =>
                                        updateStatus(t.id, e.target.value)
                                    }
                                    className="bg-gray-900 text-white p-1"
                                >
                                    <option value="open">Open</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </td>

                            <td className="p-2 border">
                                <button
                                    onClick={() => viewAttachment(t.filepath)}
                                    className="bg-blue-800 text-white px-3 py-1 rounded"
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="w-full flex item-end justify-end pt-2 gap-[550px]">
                <button
                    className="hover:text-[#45a29e] transition-colors duration-300"
                    onClick={backBtn}
                >
                    Back
                </button>

                <button
                    className="hover:text-[#45a29e] transition-colors duration-300"
                    onClick={viewAllBtn}
                >
                    View All
                </button>
            </div>
        </div>
    );
}
