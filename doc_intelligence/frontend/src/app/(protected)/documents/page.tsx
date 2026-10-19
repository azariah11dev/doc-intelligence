"use client";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, openProtectedFile } from "@/lib/api";

type FileEntry = {
    id: string | null;
    path: string;
    name: string;
};

type AuditRow = {
    id: string | number;
    upload_filename: string;
    saved_filename: string;
    file_type: string;
    file_size: number;
    action: string;
    upload_ts: string;
    status: string;
    error: string | null;
};

function formatBytes(bytes: number): string {
    if (!bytes) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.min(
        Math.floor(Math.log(bytes) / Math.log(1024)),
        units.length - 1
    );
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function statusColor(status: string): string {
    switch (status?.toUpperCase()) {
        case "SUCCESS":
            return "text-teal-400";
        case "FAILED":
            return "text-red-400";
        default:
            return "text-yellow-400";
    }
}

export default function Documents() {
    const [isAdmin, setIsAdmin] = useState(false);

    // --- Upload state ---
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState("");

    // --- Document browser state ---
    const [files, setFiles] = useState<FileEntry[]>([]);
    const [filesLoading, setFilesLoading] = useState(true);
    const [filesError, setFilesError] = useState("");
    const [docQuery, setDocQuery] = useState("");

    // --- Audit log state ---
    const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditError, setAuditError] = useState("");
    const [auditQuery, setAuditQuery] = useState("");

    // --- File deletion ---
    const [showConfirm, setShowConfirm] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [reason, setReason] = useState("");

    async function loadFiles() {
        setFilesLoading(true);
        setFilesError("");
        try {
            const res = await apiFetch("/upload/files");
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            const parsed: FileEntry[] = (data.files || []).map(
                (item: string | FileEntry) =>
                    typeof item === "string"
                        ? {
                              id: null,
                              path: item,
                              name: item.split(/[/\\]/).pop() || item,
                          }
                        : item
            );
            setFiles(parsed);
        } catch (err) {
            setFilesError(
                err instanceof Error ? err.message : "Could not reach the server"
            );
        } finally {
            setFilesLoading(false);
        }
    }

    async function loadAuditTrail() {
        setAuditLoading(true);
        setAuditError("");
        try {
            const res = await apiFetch("/upload/audit_trail");
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            const data = await res.json();
            setAuditRows(data);
        } catch (err) {
            setAuditError(
                err instanceof Error ? err.message : "Could not reach the server"
            );
        } finally {
            setAuditLoading(false);
        }
    }

    useEffect(() => {
        // auth display logic
        try {
            setIsAdmin(localStorage.getItem("role") === "Admin");
        } catch {
            // Pass
        }
        loadFiles();
        loadAuditTrail();
    }, []);

    async function handleUpload() {
        if (!file) {
            setMessage("Select a file first");
            return;
        }

        setUploading(true);
        setMessage("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await apiFetch("/upload/documents", {
                method: "POST",
                body: formData,
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok) {
                setMessage("Upload successful");
                setFile(null);
                // Refresh both panels so the new file and its audit entry show up
                loadFiles();
                loadAuditTrail();
            } else {
                setMessage(
                    "Upload failed: " + (data.error || data.detail || res.status)
                );
            }
        } catch {
            setMessage("Upload failed: could not reach the server");
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(documentId: string) {
        if (!reason) {
            alert("You can't delete a file without a reason");
            return;
        }

        setDeleting(true);
        try {
            const res = await apiFetch("/upload/delete_document", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("access_token")}`,
                },
                body: JSON.stringify({
                    document_id: documentId,
                    reason: reason,
                }),
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) throw new Error(`Server returned ${(data.detail || data.error || res.status)}`);

            loadFiles();
            loadAuditTrail();
        } catch (error) {
            alert(`Delete failed: ${error}`);
        } finally {
            setDeleting(false)
        }
    }

    const filteredFiles = useMemo(() => {
        const q = docQuery.trim().toLowerCase();
        if (!q) return files;
        return files.filter((f) => f.name.toLowerCase().includes(q));
    }, [files, docQuery]);

    const filteredAudit = useMemo(() => {
        const q = auditQuery.trim().toLowerCase();
        if (!q) return auditRows;
        return auditRows.filter((row) =>
            [row.upload_filename, row.saved_filename, row.action, row.status, row.file_type]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(q))
        );
    }, [auditRows, auditQuery]);

    function viewDocumentattachment(filepath: string | null) {
        if (!filepath) {
            alert("No attachment");
            console.log(filepath);
            return;
        }
        const filename = filepath.split(/[/\\]/).pop();
        if (!filename) {
            alert("Invalid attachment path");
            console.log(filename);
            return;
        }
        void openProtectedFile(
            `/upload/files/view/${encodeURIComponent(filename)}`
        );
    }

    return (
        <div className="ml-48 p-10 space-y-10 max-w-4xl">
            {/* Upload Documents */}
            <section>
                <div className="p-6 border border-gray-800 rounded-lg bg-gray-900 text-gray-200 w-full max-w-md">
                    <h2 className="text-xl font-semibold mb-4 text-center">Upload document</h2>

                    <div className="w-full flex items-center justify-center gap-3">
                        <input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="block w-full text-sm text-gray-300"
                        />

                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="w-1/3 py-2 bg-teal-600 hover:bg-teal-500 rounded text-white font-medium disabled:opacity-50"
                        >
                            {uploading ? "Uploading..." : "Upload"}
                        </button>
                    </div>

                    {message && (
                        <p
                            className={`mt-4 text-sm ${message.startsWith("Upload failed")
                                ? "text-red-400"
                                : "text-teal-300"
                                }`}
                        >
                            {message}
                        </p>
                    )}
                </div>
            </section>

            {/* Find uploaded documents */}
            <section>
                <div className="p-6 border border-gray-800 rounded-lg bg-gray-900 text-gray-200 w-full">
                    <h2 className="text-xl font-semibold mb-4">Find documents</h2>

                    <input
                        type="text"
                        value={docQuery}
                        onChange={(e) => setDocQuery(e.target.value)}
                        placeholder="Search by file name..."
                        className="block w-full text-sm mb-4 px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-500"
                    />

                    <div className="border border-gray-800 rounded max-h-72 overflow-y-auto">
                        {filesLoading ? (
                            <p className="p-4 text-sm text-gray-500">Loading documents...</p>
                        ) : filesError ? (
                            <p className="p-4 text-sm text-red-400">{filesError}</p>
                        ) : filteredFiles.length === 0 ? (
                            <p className="p-0 text-sm text-gray-500">
                                {files.length === 0
                                    ? "No documents uploaded yet"
                                    : "No documents match your search"}
                            </p>
                        ) : (
                            <ul className="divide-y divide-gray-800">
                                {filteredFiles.map((f) => (
                                    <li
                                        onDoubleClick={() => viewDocumentattachment(f.path)}
                                        key={f.path}
                                        className="px-4 py-2 text-sm hover:bg-gray-800/60 flex items-center justify-between gap-4"
                                    >
                                        <span className="truncate">{f.name}</span>

                                        {f.path !== f.name && (
                                            <span className="text-gray-500 text-xs truncate max-w-[40%]">
                                                {f.path}
                                            </span>
                                        )}

                                        {isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setPendingDeleteId(f.id);
                                                    setShowConfirm(true);
                                                }}
                                                disabled={!f.id}
                                                className="text-red-400 hover:text-red-300 text-xs border border-red-400 px-2 py-1 rounded"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {!filesLoading && !filesError && (
                        <p className="mt-2 text-xs text-gray-500">
                            {filteredFiles.length} of {files.length} document
                            {files.length === 1 ? "" : "s"}
                        </p>
                    )}

                    {showConfirm && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
                            <div className="bg-gray-900 border border-gray-700 p-6 rounded-lg w-80 text-gray-200">
                                <h3 className="text-lg font-semibold mb-4">Delete document?</h3>

                                <p className="text-sm mb-2">
                                    Are you sure you want to delete this document? This action
                                    cannot be undone.
                                </p>
                                <input
                                    id="deleteReason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="mb-4 w-full text-black pl-2"
                                    placeholder="reason for deletion"
                                />

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => {
                                            setShowConfirm(false);
                                            setPendingDeleteId(null);
                                        }}
                                        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-sm"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        onClick={async () => {
                                            if (pendingDeleteId) {
                                                await handleDelete(pendingDeleteId);
                                            }
                                            setShowConfirm(false);
                                            setPendingDeleteId(null);
                                        }}
                                        className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-sm"
                                    >
                                        {deleting ? ".." : "Delete"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* Audit trail */}
            <section>
                <div className="p-6 border border-gray-800 rounded-lg bg-gray-900 text-gray-200 w-full">
                    <h2 className="text-xl font-semibold mb-4">Audit log</h2>

                    <input
                        type="text"
                        value={auditQuery}
                        onChange={(e) => setAuditQuery(e.target.value)}
                        placeholder="Search by file name, action, or status..."
                        className="block w-full text-sm mb-4 px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder-gray-500"
                    />

                    <div className="border border-gray-800 rounded max-h-96 overflow-auto">
                        {auditLoading ? (
                            <p className="p-4 text-sm text-gray-500">Loading audit log...</p>
                        ) : auditError ? (
                            <p className="p-4 text-sm text-red-400">{auditError}</p>
                        ) : filteredAudit.length === 0 ? (
                            <p className="p-4 text-sm text-gray-500">
                                {auditRows.length === 0
                                    ? "No audit entries yet"
                                    : "No entries match your search"}
                            </p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-gray-900 text-gray-500 text-xs uppercase">
                                    <tr className="border-b border-gray-800">
                                        <th className="text-left font-medium px-4 py-2">File</th>
                                        <th className="text-left font-medium px-4 py-2">Action</th>
                                        <th className="text-left font-medium px-4 py-2">Size</th>
                                        <th className="text-left font-medium px-4 py-2">Date</th>
                                        <th className="text-left font-medium px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {filteredAudit.map((row) => (
                                        <tr key={row.id} className="hover:bg-gray-800/60">
                                            <td className="px-4 py-2">
                                                <div className="truncate max-w-xs">
                                                    {row.upload_filename}
                                                </div>
                                                {row.error && (
                                                    <div className="text-xs text-red-400 truncate max-w-xs">
                                                        {row.error}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-gray-300">{row.action}</td>
                                            <td className="px-4 py-2 text-gray-400">
                                                {formatBytes(row.file_size)}
                                            </td>
                                            <td className="px-4 py-2 text-gray-400">{row.upload_ts}</td>
                                            <td className={`px-4 py-2 font-medium ${statusColor(row.status)}`}>
                                                {row.status}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {!auditLoading && !auditError && (
                        <p className="mt-2 text-xs text-gray-500">
                            {filteredAudit.length} of {auditRows.length} entries
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
}