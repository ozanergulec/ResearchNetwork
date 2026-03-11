import React from 'react';
import type { Publication, FeedItem } from '../../services/publicationService';
import { Loading } from '../common';
import { FeedPublicationCard, SharedFeedCard } from '../feed';

export type ProfileTab = 'publications' | 'my-publications' | 'saved';

interface ProfileTabContentProps {
    activeTab: ProfileTab;
    onTabChange: (tab: ProfileTab) => void;
    isOwnProfile: boolean;
    loading: boolean;
    publications: Publication[];
    posts: FeedItem[];
    savedPublications: Publication[];
    totalItems: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    onAddPublication: () => void;
    onDeletePublication: (id: string) => void;
    onSharedDeleted: (shareId: string) => void;
    isFollowingProfile?: boolean;
    onFollowChange?: (authorId: string, following: boolean) => void;
}

const ITEMS_PER_PAGE = 5;

const ProfileTabContent: React.FC<ProfileTabContentProps> = ({
    activeTab,
    onTabChange,
    isOwnProfile,
    loading,
    publications,
    posts,
    savedPublications,
    totalItems,
    currentPage,
    onPageChange,
    onAddPublication,
    onDeletePublication,
    onSharedDeleted,
    isFollowingProfile,
    onFollowChange,
}) => {
    const handleTabChange = (tab: ProfileTab) => {
        onTabChange(tab);
    };

    const handlePageChange = (page: number) => {
        onPageChange(page);
    };

    const getTotalPages = (totalItems: number) => Math.ceil(totalItems / ITEMS_PER_PAGE);

    const renderPagination = (totalItems: number) => {
        const totalPages = getTotalPages(totalItems);
        if (totalPages <= 1) return null;

        const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
        const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

        const pages: (number | string)[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
                pages.push(i);
            }
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }

        return (
            <div className="profile-pagination">
                <span className="profile-pagination-info">
                    {startItem}-{endItem} / {totalItems}
                </span>
                <div className="profile-pagination-controls">
                    <button
                        className="profile-pagination-btn"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        ‹
                    </button>
                    {pages.map((page, idx) =>
                        typeof page === 'string' ? (
                            <span key={`ellipsis-${idx}`} className="profile-pagination-ellipsis">...</span>
                        ) : (
                            <button
                                key={page}
                                className={`profile-pagination-page ${currentPage === page ? 'active' : ''}`}
                                onClick={() => handlePageChange(page)}
                            >
                                {page}
                            </button>
                        )
                    )}
                    <button
                        className="profile-pagination-btn"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                    >
                        ›
                    </button>
                </div>
            </div>
        );
    };

    const renderPostsTab = () => {
        if (posts.length === 0) {
            return (
                <div className="publications-empty">
                    <p>No posts yet.</p>
                </div>
            );
        }

        return (
            <div className="publications-list">
                <div className="publications-grid">
                    {posts.map((item, idx) => {
                        if (item.type === 'share' && item.sharedPublication) {
                            return (
                                <SharedFeedCard
                                    key={`share-${item.sharedPublication.shareId}-${idx}`}
                                    sharedPublication={item.sharedPublication}
                                    onDeleted={onSharedDeleted}
                                />
                            );
                        } else if (item.publication) {
                            return (
                                <FeedPublicationCard
                                    key={`pub-${item.publication.id}-${idx}`}
                                    publication={item.publication}
                                    isFollowing={isFollowingProfile}
                                    onFollowChange={onFollowChange}
                                    onDeleted={onDeletePublication}
                                />
                            );
                        }
                        return null;
                    })}
                </div>
                {renderPagination(totalItems)}
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
                            isFollowing={isFollowingProfile}
                            onFollowChange={onFollowChange}
                            onDeleted={onDeleted}
                        />
                    ))}
                </div>
                {renderPagination(totalItems)}
            </div>
        );
    };

    return (
        <div className="profile-card publications-section">
            <div className="profile-tabs">
                <button
                    className={`profile-tab ${activeTab === 'publications' ? 'profile-tab-active' : ''}`}
                    onClick={() => handleTabChange('publications')}
                >
                    Posts
                </button>
                <button
                    className={`profile-tab ${activeTab === 'my-publications' ? 'profile-tab-active' : ''}`}
                    onClick={() => handleTabChange('my-publications')}
                >
                    Publications
                </button>
                {isOwnProfile && (
                    <button
                        className={`profile-tab ${activeTab === 'saved' ? 'profile-tab-active' : ''}`}
                        onClick={() => handleTabChange('saved')}
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
