import React, { useState } from 'react';
import { Button, Input } from '../../ui';
import { usersApi } from '../../../services/api';
import type { User, UpdateUserData } from '../../../services/api';
import './ProfileComponents.css';

export interface ProfileEditFormProps {
    user: User;
    onSave?: (updatedUser: User) => void;
    onCancel?: () => void;
}

const ProfileEditForm: React.FC<ProfileEditFormProps> = ({ user, onSave, onCancel }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<UpdateUserData>({
        fullName: user.fullName,
        title: user.title || '',
        institution: user.institution || '',
        department: user.department || '',
        bio: user.bio || '',
        interestTags: user.interestTags || [],
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await usersApi.update(user.id, formData);
            localStorage.setItem('user', JSON.stringify(response.data));
            if (onSave) {
                onSave(response.data);
            }
        } catch (err) {
            console.error('Update failed', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="profile-edit-form">
            <Input
                label="Full Name"
                type="text"
                value={formData.fullName || ''}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
            <Input
                label="Title"
                type="text"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
            <Input
                label="Institution"
                type="text"
                value={formData.institution || ''}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
            />
            <Input
                label="Department"
                type="text"
                value={formData.department || ''}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
            <div className="input-wrapper">
                <label className="input-label">Bio</label>
                <textarea
                    value={formData.bio || ''}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="profile-textarea"
                    rows={4}
                />
            </div>
            <div className="profile-button-group">
                <Button type="submit" loading={loading}>
                    Save Changes
                </Button>
                <Button type="button" variant="secondary" onClick={onCancel}>
                    Cancel
                </Button>
            </div>
        </form>
    );
};

export default ProfileEditForm;
