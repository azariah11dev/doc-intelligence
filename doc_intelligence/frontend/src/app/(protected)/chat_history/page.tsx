"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Conversation = {
    id: string;
    username: string;
    created_at: string;
    last_updated: string;
};

export default function ChatHistory() {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    async function loadConversations() {
        try {
            const res = await fetch("http://localhost:8000/chat/conversations");
            const data = await res.json();
            setConversations(data);
        } catch (err) {
            console.error("Failed to load conversations:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadConversations();
    }, []);

    function openConversation(id: string) {
        localStorage.setItem("open_conversation_id", id);
        router.push("/chat");
    }

    return (
        <div className="ml-48 p-10 max-w-3xl">
            <h1 className="text-2xl font-bold mb-6">Chat History</h1>

            {loading && <p>Loading...</p>}

            {!loading && conversations.length === 0 && (
                <p className="opacity-70">No conversations yet.</p>
            )}

            <div className="space-y-4">
                {conversations.map((c) => (
                    <div
                        key={c.id}
                        className="p-4 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition"
                        onClick={() => openConversation(c.id)}
                    >
                        <div className="text-lg font-semibold">
                            Conversation with {c.username}
                        </div>

                        <div className="text-sm opacity-70">
                            Created: {new Date(c.created_at).toLocaleString()}
                        </div>

                        <div className="text-sm opacity-70">
                            Last Updated: {new Date(c.last_updated).toLocaleString()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
