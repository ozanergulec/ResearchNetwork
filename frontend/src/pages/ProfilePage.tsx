import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../components/layout';
import { Card, LoadingSpinner } from '../components/ui';
import { ProfileCard, ProfileEditForm } from '../components/features/profile';
import type { User } from '../services/api';

const ProfilePage: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        } else {
            navigate('/login');
        }
    }, [navigate]);

    const handleSave = (updatedUser: User) => {
        setUser(updatedUser);
        setEditing(false);
    };

    if (!user) {
        return (
            <PageLayout>
                <LoadingSpinner message="Loading profile..." />
            </PageLayout>
        );
    }

    return (
        <PageLayout>
            <Card variant="elevated">
                {editing ? (
                    <ProfileEditForm
                        user={user}
                        onSave={handleSave}
                        onCancel={() => setEditing(false)}
                    />
                ) : (
                    <ProfileCard
                        user={user}
                        onEdit={() => setEditing(true)}
                    />
                )}
            </Card>
        </PageLayout>
    );
};

export default ProfilePage;
