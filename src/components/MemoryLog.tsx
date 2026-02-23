interface MemoryEntry {
  date: string;
  filename: string;
  excerpt: string;
  sizeBytes: number;
}

interface MemoryLogProps {
  memories: MemoryEntry[];
}

export function MemoryLog({ memories }: MemoryLogProps) {
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">🧠 Memory Log</h2>
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {memories.slice(0, 14).map((m) => (
          <div
            key={m.date}
            className="bg-gray-900 rounded-lg p-3 border border-gray-800 hover:border-gray-700 transition-colors"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-blue-400">
                {m.date}
              </span>
              <span className="text-xs text-gray-600">
                {(m.sizeBytes / 1024).toFixed(1)}KB
              </span>
            </div>
            <p className="text-xs text-gray-500 line-clamp-2">
              {m.excerpt.replace(/^#.*\n?/, "").trim()}
            </p>
          </div>
        ))}
        {memories.length === 0 && (
          <p className="text-gray-600 text-sm">No memory files found</p>
        )}
      </div>
    </div>
  );
}
