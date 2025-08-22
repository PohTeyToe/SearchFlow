import React from 'react';
import { MainLayout } from '../components/layout';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Checkbox } from '../components/ui/Checkbox';
import { Select } from '../components/ui/Select';
import { useThemeStore } from '../stores';
import { Moon, Sun, Monitor } from 'lucide-react';

export const SettingsPage: React.FC = () => {
    const { theme, setTheme, resolvedTheme } = useThemeStore();

    return (
        <MainLayout
            title="Settings"
            subtitle="Configure your dashboard preferences"
        >
            <div className="max-w-2xl space-y-6">
                {/* Appearance */}
                <Card>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Appearance</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                                Theme
                            </label>
                            <div className="flex gap-2">
                                <Button
                                    variant={theme === 'light' ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setTheme('light')}
                                    leftIcon={<Sun className="w-4 h-4" />}
                                >
                                    Light
                                </Button>
                                <Button
                                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setTheme('dark')}
                                    leftIcon={<Moon className="w-4 h-4" />}
                                >
                                    Dark
                                </Button>
                                <Button
                                    variant={theme === 'system' ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() => setTheme('system')}
                                    leftIcon={<Monitor className="w-4 h-4" />}
                                >
                                    System
                                </Button>
                            </div>
                            <p className="text-xs text-[var(--color-text-muted)] mt-2">
                                Current: {resolvedTheme} mode
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Data Refresh */}
                <Card>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Data Refresh</h3>

                    <div className="space-y-4">
                        <Select
                            label="Auto-refresh interval"
                            options={[
                                { value: '5000', label: '5 seconds' },
                                { value: '10000', label: '10 seconds' },
                                { value: '30000', label: '30 seconds' },
                                { value: '60000', label: '1 minute' },
                                { value: '0', label: 'Disabled' },
                            ]}
                            helperText="How often to refresh pipeline and metrics data"
                        />

                        <Checkbox
                            label="Show loading indicators"
                            description="Display spinners when data is being refreshed"
                            checked={true}
                        />
                    </div>
                </Card>

                {/* Notifications */}
                <Card>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">Notifications</h3>

                    <div className="space-y-3">
                        <Checkbox
                            label="Pipeline failures"
                            description="Get notified when a pipeline fails"
                            checked={true}
                        />
                        <Checkbox
                            label="Data quality issues"
                            description="Get notified when data quality tests fail"
                            checked={true}
                        />
                        <Checkbox
                            label="Low conversion rates"
                            description="Get notified when conversion drops below threshold"
                            checked={false}
                        />
                    </div>
                </Card>

                {/* About */}
                <Card>
                    <h3 className="font-semibold text-[var(--color-text-primary)] mb-4">About</h3>
                    <div className="space-y-2 text-sm text-[var(--color-text-secondary)]">
                        <p><strong>SearchFlow Dashboard</strong> v1.0.0</p>
                        <p>Built with React, TypeScript, Zustand, and Tailwind CSS</p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                            © 2024 SearchFlow Analytics
                        </p>
                    </div>
                </Card>
            </div>
        </MainLayout>
    );
};
