import React from 'react';

interface WidgetResponseProps {
    text: string;
}

/**
 * Parses AI response text and renders inline widgets.
 * - Detects "user_XXXX" mentions with churn probability and renders a mini user card.
 * - Renders basic markdown-like bold (**text**) formatting.
 */
export const WidgetResponse: React.FC<WidgetResponseProps> = ({ text }) => {
    // Split into lines for block-level rendering
    const lines = text.split('\n');

    return (
        <div className="space-y-1.5 text-sm leading-relaxed text-[var(--color-text-primary)]">
            {lines.map((line, i) => (
                <LineRenderer key={i} line={line} />
            ))}
        </div>
    );
};

function LineRenderer({ line }: { line: string }) {
    if (!line.trim()) return <div className="h-1" />;

    // Check for user mention with churn probability pattern
    const userChurnMatch = line.match(
        /\*?\*?(user_\d+)\*?\*?\s+has a churn probability of\s+\*?\*?(\d+)%\*?\*?/i
    );

    if (userChurnMatch) {
        const [, userId, churnPct] = userChurnMatch;
        const pct = parseInt(churnPct, 10);
        const riskColor =
            pct >= 70
                ? 'bg-red-500/15 text-red-400 border-red-500/30'
                : pct >= 40
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';

        return (
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-xs font-medium ${riskColor}`}>
                    <span className="font-mono">{userId}</span>
                    <span className="opacity-70">|</span>
                    <span>{churnPct}% churn</span>
                </span>
                <span className="text-[var(--color-text-muted)] text-xs">
                    {pct >= 70 ? 'High risk' : pct >= 40 ? 'Medium risk' : 'Low risk'}
                </span>
            </div>
        );
    }

    // Render line with bold markdown formatting
    return <p>{renderBold(line)}</p>;
}

function renderBold(text: string): React.ReactNode[] {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return (
                <span key={i} className="font-semibold text-[var(--color-text-primary)]">
                    {part.slice(2, -2)}
                </span>
            );
        }
        return <span key={i}>{part}</span>;
    });
}
