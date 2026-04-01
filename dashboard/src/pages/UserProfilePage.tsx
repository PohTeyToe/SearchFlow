import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '../components/layout';
import { UserHeader } from '../components/users/UserHeader';
import { ShapWaterfall } from '../components/users/ShapWaterfall';
import { SearchHistory } from '../components/users/SearchHistory';
import { RecommendationsList } from '../components/users/RecommendationsList';
import { mockApi } from '../services';
import { SkeletonCard } from '../components/ui';

export const UserProfilePage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();

    const { data: profile, isLoading } = useQuery({
        queryKey: ['user-profile', userId],
        queryFn: () => mockApi.getUserProfile(userId!),
        enabled: !!userId,
    });

    if (isLoading) {
        return (
            <MainLayout title="User Profile">
                <div className="space-y-6">
                    <SkeletonCard lines={3} />
                    <SkeletonCard lines={8} />
                </div>
            </MainLayout>
        );
    }

    if (!profile) {
        return (
            <MainLayout title="User Not Found">
                <div className="text-center py-12 text-[var(--color-text-muted)]">
                    User {userId} not found
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout
            title={profile.userId}
            subtitle={`${profile.segment.replace('_', ' ')} segment`}
        >
            <div className="space-y-6">
                <UserHeader user={profile} />

                <ShapWaterfall
                    shapValues={profile.shapValues}
                    baseValue={profile.churnPrediction.baseValue}
                    finalPrediction={profile.churnPrediction.probability}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SearchHistory searches={profile.searchHistory} />
                    <RecommendationsList recommendations={profile.recommendations} />
                </div>
            </div>
        </MainLayout>
    );
};
