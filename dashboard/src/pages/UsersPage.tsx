import React from 'react';
import { MainLayout } from '../components/layout';
import { UserTable } from '../components/users/UserTable';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../services';
import { SkeletonTable } from '../components/ui';
import { Users, AlertTriangle, TrendingDown } from 'lucide-react';
import { GradientBorder } from '../components/effects/GradientBorder';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';

export const UsersPage: React.FC = () => {
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => mockApi.getUsers(),
    });

    const totalUsers = users?.length || 0;
    const highRiskCount = users?.filter(u => u.churnPrediction.riskLevel === 'high').length || 0;
    const avgChurn = users && totalUsers > 0
        ? users.reduce((sum, u) => sum + u.churnPrediction.probability, 0) / totalUsers
        : 0;

    return (
        <MainLayout
            title="Users"
            subtitle="Monitor churn risk and user segments"
        >
            {/* Stat cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <GradientBorder className="rounded-xl">
                    <div
                        className="rounded-xl p-5"
                        style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Total Users
                                </p>
                                <div className="mt-1">
                                    <AnimatedNumber
                                        value={totalUsers}
                                        className="text-3xl font-bold"
                                        duration={1}
                                    />
                                </div>
                            </div>
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'var(--accent-subtle)' }}
                            >
                                <Users className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                            </div>
                        </div>
                    </div>
                </GradientBorder>

                <GradientBorder className="rounded-xl">
                    <div
                        className="rounded-xl p-5"
                        style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    High Risk Users
                                </p>
                                <div className="mt-1">
                                    <AnimatedNumber
                                        value={highRiskCount}
                                        className="text-3xl font-bold"
                                        duration={1}
                                    />
                                </div>
                                <p
                                    className="text-xs mt-1"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    {totalUsers > 0 ? Math.round((highRiskCount / totalUsers) * 100) : 0}% of total
                                </p>
                            </div>
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                            >
                                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--danger)' }} />
                            </div>
                        </div>
                    </div>
                </GradientBorder>

                <GradientBorder className="rounded-xl">
                    <div
                        className="rounded-xl p-5"
                        style={{ backgroundColor: 'var(--bg-card)' }}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p
                                    className="text-sm font-medium"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    Avg Churn %
                                </p>
                                <div className="mt-1 flex items-baseline gap-0.5">
                                    <AnimatedNumber
                                        value={Math.round(avgChurn * 100)}
                                        className="text-3xl font-bold"
                                        duration={1}
                                    />
                                    <span
                                        className="text-xl font-bold"
                                        style={{ color: 'var(--text-muted)' }}
                                    >
                                        %
                                    </span>
                                </div>
                            </div>
                            <div
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}
                            >
                                <TrendingDown className="w-5 h-5" style={{ color: 'var(--warning)' }} />
                            </div>
                        </div>
                    </div>
                </GradientBorder>
            </div>

            {/* User table */}
            {isLoading ? (
                <SkeletonTable />
            ) : (
                <UserTable users={users || []} />
            )}
        </MainLayout>
    );
};
