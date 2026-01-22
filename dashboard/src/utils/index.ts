/**
 * Debounce function - delays execution until after wait milliseconds
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return function (this: unknown, ...args: Parameters<T>) {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        timeoutId = setTimeout(() => {
            func.apply(this, args);
            timeoutId = null;
        }, wait);
    };
}

/**
 * Format number with thousands separator
 */
export function formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format number as percentage
 */
export function formatPercent(num: number, decimals = 1): string {
    return `${num.toFixed(decimals)}%`;
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds.toFixed(0)}s`;
    }
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
}

/**
 * Format ISO date string to relative time
 */
export function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format ISO date string to readable format
 */
export function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * Class name utility - combines class names conditionally
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
    return classes.filter(Boolean).join(' ');
}

/**
 * Generate a random ID
 */
export function generateId(): string {
    return Math.random().toString(36).substring(2, 11);
}

/**
 * Clamp a number between min and max
 */
export function clamp(num: number, min: number, max: number): number {
    return Math.min(Math.max(num, min), max);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get status color class based on status
 */
export function getStatusColor(status: 'running' | 'success' | 'failed' | 'pending' | 'queued' | 'pass' | 'fail' | 'warn' | 'skipped'): string {
    const colors: Record<string, string> = {
        running: 'text-blue-500',
        success: 'text-emerald-500',
        pass: 'text-emerald-500',
        failed: 'text-red-500',
        fail: 'text-red-500',
        pending: 'text-gray-400',
        queued: 'text-amber-500',
        warn: 'text-amber-500',
        skipped: 'text-gray-400',
    };
    return colors[status] || 'text-gray-400';
}

/**
 * Get status background color class
 */
export function getStatusBgColor(status: 'running' | 'success' | 'failed' | 'pending' | 'queued' | 'pass' | 'fail' | 'warn' | 'skipped'): string {
    const colors: Record<string, string> = {
        running: 'bg-blue-500/10',
        success: 'bg-emerald-500/10',
        pass: 'bg-emerald-500/10',
        failed: 'bg-red-500/10',
        fail: 'bg-red-500/10',
        pending: 'bg-gray-500/10',
        queued: 'bg-amber-500/10',
        warn: 'bg-amber-500/10',
        skipped: 'bg-gray-500/10',
    };
    return colors[status] || 'bg-gray-500/10';
}
