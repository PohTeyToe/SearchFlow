import React from 'react';
import { cn } from '../../utils';
import { Bot, User } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../types';

interface ChatMessageProps {
    message: ChatMessageType;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
    const isUser = message.role === 'user';

    return (
        <div className={cn('flex gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
            <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
                isUser ? 'bg-blue-500' : 'bg-purple-500/20'
            )}>
                {isUser
                    ? <User className="w-3.5 h-3.5 text-white" />
                    : <Bot className="w-3.5 h-3.5 text-purple-500" />
                }
            </div>
            <div className={cn(
                'max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                isUser
                    ? 'bg-blue-500 text-white'
                    : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
            )}>
                {message.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                        {line.split(/(\*\*[^*]+\*\*)/).map((part, j) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                                return <strong key={j}>{part.slice(2, -2)}</strong>;
                            }
                            return <span key={j}>{part}</span>;
                        })}
                        {i < message.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                ))}
                {message.toolsUsed && message.toolsUsed.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap gap-1">
                        {message.toolsUsed.map(tool => (
                            <span key={tool} className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 opacity-60">
                                {tool}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
