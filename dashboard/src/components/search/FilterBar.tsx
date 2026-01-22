import React from 'react';
import { cn } from '../../utils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, Filter } from 'lucide-react';

interface FilterOption {
    id: string;
    label: string;
    value: string;
}

interface FilterBarProps {
    activeFilters: FilterOption[];
    onRemoveFilter: (id: string) => void;
    onClearAll: () => void;
    onOpenFilters?: () => void;
    className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
    activeFilters,
    onRemoveFilter,
    onClearAll,
    onOpenFilters,
    className,
}) => {
    if (activeFilters.length === 0 && !onOpenFilters) return null;

    return (
        <div className={cn('flex items-center gap-2 flex-wrap', className)}>
            {onOpenFilters && (
                <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Filter className="h-4 w-4" />}
                    onClick={onOpenFilters}
                >
                    Filters
                    {activeFilters.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                            {activeFilters.length}
                        </span>
                    )}
                </Button>
            )}

            {activeFilters.map((filter) => (
                <Badge key={filter.id} variant="info" className="gap-1 pr-1">
                    <span className="text-xs text-[var(--color-text-secondary)]">{filter.label}:</span>
                    <span>{filter.value}</span>
                    <button
                        onClick={() => onRemoveFilter(filter.id)}
                        className="ml-1 p-0.5 rounded hover:bg-blue-500/20 transition-colors"
                        aria-label={`Remove ${filter.label} filter`}
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}

            {activeFilters.length > 1 && (
                <button
                    onClick={onClearAll}
                    className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                >
                    Clear all
                </button>
            )}
        </div>
    );
};
