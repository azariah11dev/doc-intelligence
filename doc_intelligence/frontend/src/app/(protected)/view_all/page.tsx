"use client";
import { useEffect, useState } from "react";

export default function ViewAll() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    async function loadAllTickets() {
        try {
            const res = await fetch("http://localhost:8000/contact/all_tickets", {
                method: "GET",
            });
            const data = await res.json();
            setTickets(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    function viewAnyAttachment(filepath) {
        if (!filepath) {
            alert("No attachment");
            return;
        }
        window.open(`http://localhost:8000/${filepath}`, "_blank");
    }

    useEffect(() => {
        loadAllTickets();
    }, []);

    const statusColor = (status) => {
        switch (status?.toLowerCase()) {
            case "open":
                return "text-red-500 font-semibold";
            case "pending":
                return "text-yellow-500 font-semibold";
            case "completed":
                return "text-green-500 font-semibold";
            default:
                return "text-gray-400";
        }
    };

    const backBtn = () => {
        window.location.assign("/submitted_tickets");
    };

    return(
        <div className="ml-48 p-10">
            <h1 className="text-2xl font-bold mb-6">All Tickets</h1>
            
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
                            <td className={`p-2 border ${statusColor(t.status)}`}>
                                {t.status}
                            </td>
                            <td className="p-2 border">
                                <button
                                    onClick={() => viewAnyAttachment(t.filepath)}
                                    className="bg-blue-800 text-white px-3 py-1 rounded"
                                >
                                    View
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="w-full flex item-end justify-end pt-2">
                <button
                className="hover:text-[#45a29e] transition-colors duration-300"
                onClick={backBtn}
                >
                    Back
                </button>
            </div>
        </div>
    );
}