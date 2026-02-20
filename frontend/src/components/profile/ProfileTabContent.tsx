import React from 'react';
import type { Publication, SharedPublication } from '../../services/publicationService';
import { Loading } from '../common';
import { FeedPublicationCard, SharedFeedCard } from '../feed';

export type ProfileTab = 'publications' | 'my-publications' | 'saved';

interface ProfileTabContentProps {
    activeTab: ProfileTab;
    onTabChange: (tab: ProfileTab) => void;
    isOwnProfile: boolean;
    loading: boolean;
    publications: Publication[];
    sharedPublications: SharedPublication[];
    savedPublications: Publication[];
    showAllPublications: boolean;
    onToggleShowAll: () => void;
    onAddPublication: () => void;
    onDeletePublication: (id: string) => void;
    onSharedDeleted: (shareId: string) => void;
}

const ProfileTabContent: React.FC<ProfileTabContentProps> = ({
    activeTab,
    onTabChange,
    isOwnProfile,
    loading,
    publications,
    sharedPublications,
    savedPublications,
    showAllPublications,
    onToggleShowAll,
    onAddPublication,
    onDeletePublication,
    onSharedDeleted,
}) => {
    const renderPostsTab = () => {
        type TimelineItem =
            | { type: 'authored'; date: string; publication: Publication }
            | { type: 'shared'; date: string; sharedPublication: SharedPublication };

        const timeline: TimelineItem[] = [
            ...publications.map(p => ({ type: 'authored' as const, date: p.createdAt, publication: p })),
            ...sharedPublications.map(s => ({ type: 'shared' as const, date: s.sharedAt, sharedPublication: s })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const displayedItems = showAllPublications ? timeline : timeline.slice(0, 3);
        const hasMore = timeline.length > 3;

        if (timeline.length === 0) {
            return (
                <div className="publications-empty">
                    <p>No posts yet.</p>
                </div>
            );
        }

        return (
            <div className="publications-list">
                <div className="publications-grid">
                    {displayedItems.map((item) => {
                        if (item.type === 'shared') {
                            return (
                                <SharedFeedCard
                                    key={`share-${item.sharedPublication.shareId}`}
                                    sharedPublication={item.sharedPublication}
                                    onDeleted={onSharedDeleted}
                                />
                            );
                        } else {
                            return (
                                <FeedPublicationCard
                                    key={`pub-${item.publication.id}`}
                                    publication={item.publication}
                                    onDeleted={onDeletePublication}
                                />
                            );
                        }
                    })}
                </div>

                {hasMore && (
                    <div className="publications-toggle">
                        <button className="toggle-button" onClick={onToggleShowAll}>
                            {showAllPublications ? 'Show Less' : 'View All'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const renderPublicationList = (items: Publication[], emptyMessage: string, keyPrefix: string, onDeleted?: (id: string) => void) => {
        if (items.length === 0) {
            return (
                <div className="publications-empty">
                    <p>{emptyMessage}</p>
                </div>
            );
        }

        return (
            <div className="publications-list">
                <div className="publications-grid">
                    {items.map((pub) => (
                        <FeedPublicationCard
                            key={`${keyPrefix}-${pub.id}`}
                            publication={pub}
                            onDeleted={onDeleted}
                        />
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="profile-card publications-section">
            <div className="profile-tabs">
                <button
                    className={`profile-tab ${activeTab === 'publications' ? 'profile-tab-active' : ''}`}
                    onClick={() => onTabChange('publications')}
                >
                    Posts
                </button>
                <button
                    className={`profile-tab ${activeTab === 'my-publications' ? 'profile-tab-active' : ''}`}
                    onClick={() => onTabChange('my-publications')}
                >
                    Publications
                </button>
                {isOwnProfile && (
                    <button
                        className={`profile-tab ${activeTab === 'saved' ? 'profile-tab-active' : ''}`}
                        onClick={() => onTabChange('saved')}
                    >
                        Saved
                    </button>
                )}

                {isOwnProfile && (activeTab === 'publications' || activeTab === 'my-publications') && (
                    <button className="add-publication-button" onClick={onAddPublication}>
                        + Add New Publication
                    </button>
                )}
            </div>

            {loading ? (
                <Loading message="Loading..." />
            ) : activeTab === 'publications' ? (
                renderPostsTab()
            ) : activeTab === 'my-publications' ? (
                renderPublicationList(publications, 'No publications yet.', 'mypub', onDeletePublication)
            ) : (
                renderPublicationList(savedPublications, 'No saved publications yet.', 'saved')
            )}
        </div>
    );
};

export default ProfileTabContent;
