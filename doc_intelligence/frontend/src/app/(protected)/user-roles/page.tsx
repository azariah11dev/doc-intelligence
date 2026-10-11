"use client";

import { useEffect, useState } from "react";

export default function UserRolesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await fetch("http://localhost:8000/auth/all_users", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!response.ok) throw new Error("Fetch failed");

        const data = await response.json();
        setUsers(data);
      } catch (err) {
        console.error("User fetch error:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const updateRole = async (username: string, newRole: string) => {
    setSaving(username);

    try {
      const response = await fetch(
        `http://localhost:8000/auth/assign_role?username=${username}&role=${newRole}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );

      if (!response.ok) throw new Error("Role update failed");

      setUsers((prev) =>
        prev.map((u) =>
          u.username === username ? { ...u, role: newRole } : u
        )
      );
    } catch (err) {
      console.error("Role update error:", err);
    } finally {
      setSaving(null);
    }
  };

  const deleteUser = async () => {
    try {
      const res = await fetch(`http://localhost:8000/auth/delete_user`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: JSON.stringify({
          username: localStorage.getItem("username"),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.message || "User deleted");
        return;
      }
    } catch (error) {
      alert("Oops, something went wrong");
      console.log(error);
    }
  };

  return (
    <div className="ml-48 min-h-screen bg-[#0b0c10] text-[#c5c6c7] p-10">
      <h1 className="text-3xl font-bold text-[#66fcf1] mb-8">
        User Management
      </h1>

      {loading && <p className="opacity-60">Loading users...</p>}
      {error && (
        <p className="text-yellow-500 opacity-80">
          Could not load users — backend unreachable.
        </p>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="p-4 bg-[#1f2833] border border-[#45a29e] rounded-lg flex justify-between items-center"
            >
              <div>
                <p className="text-lg font-semibold text-[#66fcf1]">
                  {user.username}
                </p>
                <p className="text-sm opacity-70">{user.email}</p>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={user.role}
                  onChange={(e) => updateRole(user.username, e.target.value)}
                  className="bg-[#0b0c10] border border-[#45a29e] text-[#c5c6c7] p-2 rounded"
                >
                  <option value="Admin">Admin</option>
                  <option value="User">User</option>
                </select>

                {saving === user.username && (
                  <span className="text-sm text-[#66fcf1]">Saving...</span>
                )}

                <button
                  onClick={deleteUser}
                  className="bg-[#0b0c10] border border-[#45a29e] text-[#c5c6c7] px-3 py-2 rounded 
                             transition-colors duration-300 hover:bg-[#1f2833] hover:border-[#66fcf1]"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
