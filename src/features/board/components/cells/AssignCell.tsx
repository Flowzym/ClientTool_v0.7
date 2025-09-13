import React from 'react';

type User = { id: string; name?: string };

export default function AssignCell({ id: _id, value, users, onChange }: { id: string; value?: string; users: User[]; onChange?: (v?: string)=>void }) {
  return (
    <select
      className="text-sm border border-gray-300 rounded px-2 py-1 bg-white"
      value={value ?? ''}
      onChange={(e)=>onChange?.(e.target.value || undefined)}
    >
      <option value="">—</option>
      {users.map(u => <option key={(u as any).id} value={(u as any).id}>{(u as any).name ?? (u as any).id}</option>)}
    </select>
  );
}
