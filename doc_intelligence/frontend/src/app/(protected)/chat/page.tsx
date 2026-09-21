"use client";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

const model_provider: Record<string, string> = {
    "GPT-4o": "openai",
    "GPT-4o-mini": "openai",
    "o3-mini": "openai",
    "Gemini-1.5-Pro": "google",
    "Gemini-1.5-Flash": "google",
    "Gemini-2.0-Flash": "google",
    "Claude-3.5-Sonnet": "claude",
    "Claude-3.5-Haiku": "claude",
    "Claude-3-Opus": "claude",
    "qwen3.6:27b": "ollama"
};

export default function Chat() {
    const [model, setModel] = useState("qwen3.6:27b");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function updateLastMessage(fn: (content: string) => string) {
        setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: fn(last.content) };
            return updated;
        });
    }

    async function chatInfo() {
        const q = question.trim();
        if (!q || loading) return;

        setQuestion("");
        setLoading(true);
        // Add the user message and an empty assistant message to stream into
        setMessages((prev) => [
            ...prev,
            { role: "user", content: q },
            { role: "assistant", content: "" },
        ]);

        try {
            const response = await fetch("http://localhost:8000/response_generation/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: q,
                    username: localStorage.getItem("username"),
                    rewrite_model: "qwen2.5:3b",
                    generation_model: model,
                    provider: model_provider[model],
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                updateLastMessage((content) => content + chunk);
            }
        } catch (err) {
            console.error("Chat error:", err);
            updateLastMessage(() => "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="ml-48 h-screen p-10 max-w-4xl flex flex-col gap-6">
            <div className="flex-1 overflow-y-auto space-y-2">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`p-2 rounded whitespace-pre-wrap ${
                            m.role === "user" ? "bg-gray-700" : "bg-gray-800"
                        }`}
                    >
                        {m.content}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            <section className="flex justify-center">
                <div className="w-[762px] space-y-3">
                    <textarea
                        placeholder="Chat with your documents"
                        className="w-full h-[70px] bg-transparent border border-gray-700 p-2 rounded resize-none"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                    />

                    <div className="flex flex-row items-center gap-3">
                        <label htmlFor="models" className="text-sm opacity-70">
                            Choose a model
                        </label>

                        <select
                            id="models"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="p-2 bg-gray-800 text-[#c5c6c7] border border-gray-600 rounded"
                        >
                            {Object.keys(model_provider).map((m) => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>

                        <button
                            onClick={chatInfo}
                            disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? "..." : "Send"}
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}