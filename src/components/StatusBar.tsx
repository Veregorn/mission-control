interface StatusBarProps {
  taskCount: number;
  todoCount: number;
  projectCount: number;
}

export function StatusBar({ taskCount, todoCount, projectCount }: StatusBarProps) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-gray-400">Online</span>
      </div>
      <div className="text-gray-500">
        {projectCount} projects · {todoCount} pending · {taskCount - todoCount} done
      </div>
    </div>
  );
}
