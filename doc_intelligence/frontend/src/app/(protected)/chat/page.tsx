"use client";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import modelProvider from "../comps/model_provider.json" with { type: "json" };
import {
    LightBulbIcon,
    ChatBubbleOvalLeftIcon,
    EyeIcon
} from "@heroicons/react/24/outline";

type Message = { role: "user" | "assistant"; content: string; thinking?: string };

const THINK_START = "\u0002";
const THINK_END = "\u0003";

const model_provider: Record<string, string> = modelProvider;

const REWRITE_MODEL = "qwen2.5:3b";

export default function Chat() {
    const [model, setModel] = useState("qwen3.8:27b");
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [accuracy, setAccuracy] = useState<"on" | "off">("off");
    const [deepReasoning, setDeepReasoning] = useState<"on" | "off">("off");

    // Accuracy mode on  -> query is rewritten by the small model first.
    // Accuracy mode off -> no rewrite (null).
    const rewriteModel = accuracy === "off" ? null : REWRITE_MODEL;
    const reasoning = deepReasoning === "off" ? false : true;

    async function loadConversation(convoId: string) {
        try {
            const res = await apiFetch(`/chat/conversation/${convoId}`);
            if (!res.ok) throw new Error("Failed to load conversation");

            const data = await res.json();

            const loadedMessages: Message[] = [];

            for (const m of data.messages) {
                loadedMessages.push({ role: "user", content: m.query });
                loadedMessages.push({ role: "assistant", content: m.response });
            }

            setMessages(loadedMessages);
            setConversationId(convoId);
            localStorage.setItem("conversation_id", convoId);
        } catch (err) {
            console.error("Error loading conversation:", err);
        }
    }

    useEffect(() => {
        const idFromHistory = localStorage.getItem("open_conversation_id");
        localStorage.removeItem("open_conversation_id");

        if (idFromHistory) {
            loadConversation(idFromHistory);
        } else {
            localStorage.removeItem("conversation_id");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // empty deps: runs only when the page mounts

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    function updateLastMessage(fn: (content: string) => string) {
        setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: fn(last.content) };
            return updated;
        });
    }

    function appendThinking(text: string) {
        setMessages((prev) => {
            if (prev.length === 0) return prev;
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
                ...last,
                thinking: (last.thinking ?? "") + text,
            };
            return updated;
        });
    }

    const toggleAccuracy = () => {
        setAccuracy((prev) => (prev === "on" ? "off" : "on"));
    };

    const toggleDeepReasoning = () => {
        setDeepReasoning((prev) => (prev === "off" ? "on" : "off"))
    };

    async function chatInfo() {
        const q = question.trim();
        if (!q || loading) return;

        //mark exact location if included in jest or playwright
        if (
            model_provider[model] === "claude" ||
            model_provider[model] === "google" ||
            model_provider[model] === "openai"
        ) {
            alert(`model provider ${model_provider[model]} is not currently connected try ollama model: qwen3.8:27b`);
            return;
        }

        setQuestion("");
        setLoading(true);
        // Add the user message and an empty assistant message to stream into
        setMessages((prev) => [
            ...prev,
            { role: "user", content: q },
            { role: "assistant", content: "" },
        ]);

        try {
            const response = await apiFetch("/response_generation/answer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    question: q,
                    rewrite_model: rewriteModel,
                    generation_model: model,
                    provider: model_provider[model],
                    id: conversationId ?? null,
                    think: reasoning,
                }),
            });

            if (!response.ok || !response.body) {
                throw new Error(`Request failed: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let inThink = false;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });

                // Try to parse JSON metadata
                try {
                    const obj = JSON.parse(chunk);
                    if (obj?.meta?.conversation_id) {
                        setConversationId(obj.meta.conversation_id);
                        localStorage.setItem("conversation_id", obj.meta.conversation_id);
                        continue; // DO NOT append to chat
                    }
                } catch {
                    // Not JSON -> normal streamed text
                }
                for (const part of chunk.split(/([\u0002\u0003])/)) {
                    if (part === THINK_START) inThink = true;
                    else if (part === THINK_END) inThink = false;
                    else if (part) {
                        if (inThink) appendThinking(part);
                        else updateLastMessage((content) => content + part);
                    }
                }
            }
        } catch (err) {
            console.error("Error generating answer:", err);
            updateLastMessage(
                (content) => content || "Something went wrong. Please try again."
            );
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
                        {m.thinking && (
                            <details className="mb-2 text-sm opacity-70">
                                <summary className="cursor-pointer">
                                    {m.content ? "Reasoning" : "Thinking..."}
                                </summary>
                                <div className="mt-1 whitespace-pre-wrap">{m.thinking}</div>
                            </details>
                        )}
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

                    <ul className="flex flex-row items-center gap-3">
                        <li className="flex items-center gap-2">
                            <label htmlFor="models" className="text-sm opacity-70">
                                Choose a model:
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
                        </li>

                        <li>
                            <button
                                onClick={chatInfo}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? "..." : "Send"}
                            </button>
                        </li>

                        <li>
                            <button
                                type="button"
                                onClick={toggleDeepReasoning}
                                aria-pressed={deepReasoning === "on"}
                                aria-label={`Deep reasoning ${deepReasoning}`}
                                className="group relative p-2 rounded hover:bg-gray-800"
                            >
                                <LightBulbIcon
                                    className={`w-5 h-5 transition-colors ${
                                        deepReasoning === "off" ? "text-gray-600" : "text-yellow-400"
                                    }`}
                                />
                                <span
                                    className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 whitespace-nowrap
                                    px-2 py-1 text-xs rounded bg-gray-900 text-[#c5c6c7]
                                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                >
                                    Deep Reasoning {deepReasoning}
                                </span>
                            </button>
                        </li>

                        {/* Accuracy toggle: `group` + `relative` let the tooltip show on hover */}
                        <li>
                            <button
                                type="button"
                                onClick={toggleAccuracy}
                                aria-pressed={accuracy === "on"}
                                aria-label={`Accuracy ${accuracy}`}
                                className="group relative p-2 rounded hover:bg-gray-800"
                            >
                                <EyeIcon
                                    className={`w-5 h-5 transition-colors ${
                                        accuracy === "off" ? "text-gray-600" : "text-yellow-400"
                                    }`}
                                />
                                <span
                                    className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 whitespace-nowrap
                                    px-2 py-1 text-xs rounded bg-gray-900 text-[#c5c6c7]
                                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                >
                                    Accuracy {accuracy}
                                </span>
                            </button>
                        </li>

                        <li className="w-[275px] flex justify-end">
                            <button
                                type="button"
                                aria-label="New Chat"
                                className="group relative px-3 py-2 bg-gray-700 rounded hover:bg-gray-600"
                                onClick={() => {
                                    setMessages([]);
                                    setConversationId(null);
                                    localStorage.removeItem("conversation_id");
                                }}
                            >
                                <ChatBubbleOvalLeftIcon className="w-5 h-5" />
                                <span
                                    className="absolute left-1/2 bottom-full mb-1 -translate-x-1/2 whitespace-nowrap
                                    px-2 py-1 text-xs rounded bg-gray-900 text-[#c5c6c7]
                                    opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                                >
                                    New Chat
                                </span>
                            </button>
                        </li>
                    </ul>
                </div>
            </section>
        </div>
    );
}