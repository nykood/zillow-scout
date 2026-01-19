import { ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SortOption } from "@/components/FilterBar";
import type { ReactNode } from "react";

interface SortableHeaderProps {
  label: ReactNode;
  sortKeyAsc: SortOption;
  sortKeyDesc: SortOption;
  currentSort: SortOption;
  onSort: (sort: SortOption) => void;
  className?: string;
  icon?: ReactNode;
  title?: string;
}

export function SortableHeader({
  label,
  sortKeyAsc,
  sortKeyDesc,
  currentSort,
  onSort,
  className,
  icon,
  title,
}: SortableHeaderProps) {
  const isAscActive = currentSort === sortKeyAsc;
  const isDescActive = currentSort === sortKeyDesc;
  const isActive = isAscActive || isDescActive;

  const handleClick = () => {
    if (isDescActive) {
      onSort(sortKeyAsc);
    } else {
      onSort(sortKeyDesc);
    }
  };

  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors select-none",
        isActive && "text-foreground",
        className
      )}
      onClick={handleClick}
      title={title || (typeof label === 'string' ? `Sort by ${label}` : 'Sort')}
    >
      {icon}
      <span>{label}</span>
      {isActive && (
        isAscActive ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        )
      )}
    </div>
  );
}