import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    resolvedTheme: 'light' | 'dark';
    sidebarCollapsed: boolean;

    // Actions
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    toggleSidebar: () => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

const resolveTheme = (theme: Theme): 'light' | 'dark' => {
    if (theme === 'system') {
        return getSystemTheme();
    }
    return theme;
};

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            theme: 'system',
            resolvedTheme: resolveTheme('system'),
            sidebarCollapsed: false,

            setTheme: (theme) => {
                const resolvedTheme = resolveTheme(theme);
                set({ theme, resolvedTheme });

                // Apply theme to document
                if (typeof document !== 'undefined') {
                    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
                }
            },

            toggleTheme: () => {
                const { resolvedTheme } = get();
                const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
                get().setTheme(newTheme);
            },

            toggleSidebar: () => {
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
            },

            setSidebarCollapsed: (collapsed) => {
                set({ sidebarCollapsed: collapsed });
            },
        }),
        {
            name: 'searchflow-theme',
            partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
        }
    )
);

// Initialize theme on load
if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('searchflow-theme');
    if (stored) {
        try {
            const { state } = JSON.parse(stored);
            const resolvedTheme = resolveTheme(state.theme || 'system');
            document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
        } catch {
            // Ignore parse errors
        }
    }
}
