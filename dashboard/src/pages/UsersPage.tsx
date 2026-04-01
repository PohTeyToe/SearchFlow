import React from 'react';
import { MainLayout } from '../components/layout';
import { UserTable } from '../components/users/UserTable';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '../services';
import { SkeletonTable } from '../components/ui';
import { Users, AlertTriangle } from 'lucide-react';
import { StatCard } from '../components/metrics/StatCard';

export const UsersPage: React.FC = () => {
    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => mockApi.getUsers(),
    });

    const totalUsers = users?.length || 0;
    const atRiskCount = users?.filter(u => u.churnPrediction.riskLevel === 'high').length || 0;
    const avgChurn = users
        ? Math.round((users.reduce((sum, u) => sum + u.churnPrediction.probability, 0) / totalUsers) * 100)
        : 0;

    return (
        <MainLayout
            title="Users"
            subtitle="Monitor churn risk and user segments"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <StatCard
                    title="Total Users"
                    value={totalUsers}
                    icon={<Users className="w-6 h-6" />}
                />
                <StatCard
                    title="High Risk Users"
                    value={atRiskCount}
                    subtitle={`${totalUsers > 0 ? Math.round((atRiskCount / totalUsers) * 100) : 0}% of total`}
                    icon={<AlertTriangle className="w-6 h-6" />}
                />
                <StatCard
                    title="Avg Churn Probability"
                    value={`${avgChurn}%`}
                    icon={<Users className="w-6 h-6" />}
                />
            </div>

            {isLoading ? (
                <SkeletonTable />
            ) : (
                <UserTable users={users || []} />
            )}
        </MainLayout>
    );
};
