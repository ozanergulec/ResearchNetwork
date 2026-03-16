import { useLanguage } from '../contexts/LanguageContext';

// ==================== TRANSLATION TYPES ====================
export interface Translations {
    // Navbar
    navbar: {
        home: string;
        search: string;
        notifications: string;
        profile: string;
        settings: string;
        recommendations: string;
        peerReview: string;
        logout: string;
        searchPlaceholder: string;
        searching: string;
        noResults: string;
        people: string;
        publications: string;
        viewAll: string;
    };
    // HomePage
    home: {
        noPublicationsTitle: string;
        noPublicationsDesc: string;
        loadingFeed: string;
        loadingMore: string;
        endOfFeed: string;
        failedToLoad: string;
    };
    // SearchPage
    search: {
        title: string;
        subtitle: string;
        placeholder: string;
        people: string;
        publications: string;
        tags: string;
        searching: string;
        startSearching: string;
        minChars: string;
        noUsersFound: string;
        noPubsFound: string;
        noTagsFound: string;
        tryDifferent: string;
        tryDifferentTag: string;
        pubsWithTag: string;
        peopleWithTag: string;
        citations: string;
        saved: string;
        previous: string;
        next: string;
        // Filters
        filterInstitution: string;
        filterTitle: string;
        filterVerified: string;
        filterTags: string;
        filterMinRating: string;
        filterSortBy: string;
        clearFilters: string;
        allInstitutions: string;
        allTitles: string;
        allTags: string;
        sortNewest: string;
        sortOldest: string;
        sortHighestRating: string;
        sortMostCited: string;
        activeFilters: string;
        noFilterResults: string;
    };
    // NotificationsPage
    notifications: {
        title: string;
        unread: string;
        markAllAsRead: string;
        today: string;
        thisWeek: string;
        earlier: string;
        justNow: string;
        minutesAgo: string;
        hoursAgo: string;
        daysAgo: string;
        noNotifications: string;
        noNotificationsDesc: string;
        loading: string;
        errorLoading: string;
        delete: string;
    };
    // PeerReviewPage
    peerReview: {
        title: string;
        subtitle: string;
        lookingForReviewers: string;
        myApplications: string;
        myPublications: string;
        loading: string;
    };
    // RecommendationsPage
    recommendations: {
        title: string;
        subtitle: string;
        aiSubtitle: string;
        tagSubtitle: string;
        noResearchers: string;
        noResearchersDesc: string;
        aiTitle: string;
        aiText: string;
        aiActiveTitle: string;
        aiActiveText: string;
        tagTitle: string;
        tagText: string;
        loadingRec: string;
    };
    // SettingsPage (existing translations)
    settings: {
        settingsTitle: string;
        profileInfo: string;
        accountAccess: string;
        visibility: string;
        generalPreferences: string;
        profileDesc: string;
        fullName: string;
        fullNamePlaceholder: string;
        title: string;
        titlePlaceholder: string;
        institution: string;
        institutionPlaceholder: string;
        department: string;
        departmentPlaceholder: string;
        bio: string;
        bioPlaceholder: string;
        save: string;
        saving: string;
        verificationStatus: string;
        verified: string;
        unverified: string;
        verifiedDesc: string;
        unverifiedDesc: string;
        emailAddress: string;
        newEmail: string;
        newEmailPlaceholder: string;
        currentPassword: string;
        currentPasswordPlaceholder: string;
        updateEmail: string;
        updating: string;
        changePassword: string;
        currentPasswordLabel: string;
        currentPasswordFieldPlaceholder: string;
        newPassword: string;
        newPasswordPlaceholder: string;
        confirmNewPassword: string;
        confirmPasswordPlaceholder: string;
        changing: string;
        deleteAccount: string;
        deleteAccountDesc: string;
        deleteMyAccount: string;
        deleteConfirm: string;
        yesDelete: string;
        deleting: string;
        cancel: string;
        visibilityDesc: string;
        public: string;
        publicDesc: string;
        connectionsOnly: string;
        connectionsOnlyDesc: string;
        private: string;
        privateDesc: string;
        preferencesDesc: string;
        language: string;
        accountInformation: string;
        registrationDate: string;
        profileUpdated: string;
        profileUpdateFailed: string;
        passwordChanged: string;
        passwordsNoMatch: string;
        passwordTooShort: string;
        wrongPassword: string;
        fillAllFields: string;
        emailUpdated: string;
        emailChangeFailed: string;
        privacyUpdated: string;
        privacyFailed: string;
        languageUpdated: string;
        languageFailed: string;
        deleteFailed: string;
        loadingSettings: string;
    };
    // Profile page
    profile: {
        followers: string;
        following: string;
    };
}

// ==================== ENGLISH ====================
const en: Translations = {
    navbar: {
        home: 'Home',
        search: 'Search',
        notifications: 'Notifications',
        profile: 'Profile',
        settings: 'Settings',
        recommendations: 'Recommendations',
        peerReview: 'Peer Review',
        logout: 'Logout',
        searchPlaceholder: 'Search people or publications...',
        searching: 'Searching...',
        noResults: 'No results found',
        people: 'People',
        publications: 'Publications',
        viewAll: 'View All Results',
    },
    home: {
        noPublicationsTitle: 'No Publications Yet',
        noPublicationsDesc: 'Be the first to share your research with the community!',
        loadingFeed: 'Loading feed...',
        loadingMore: 'Loading more...',
        endOfFeed: "You've reached the end of the feed",
        failedToLoad: 'Failed to load feed. Please try again.',
    },
    search: {
        title: 'Search',
        subtitle: 'Search for people, publications, or tags',
        placeholder: 'Search by name, publication title, or tag...',
        people: 'People',
        publications: 'Publications',
        tags: 'Tags',
        searching: 'Searching...',
        startSearching: 'Start Searching',
        minChars: 'Enter at least 2 characters',
        noUsersFound: 'No users found',
        noPubsFound: 'No publications found',
        noTagsFound: 'No results found for this tag',
        tryDifferent: 'Try different keywords',
        tryDifferentTag: 'Try a different tag name',
        pubsWithTag: 'Publications with this tag',
        peopleWithTag: 'People with this tag',
        citations: 'Citations',
        saved: 'Saved',
        previous: 'Previous',
        next: 'Next',
        filterInstitution: 'Institution',
        filterTitle: 'Title',
        filterVerified: 'Verified Only',
        filterTags: 'Tags',
        filterMinRating: 'Min. Rating',
        filterSortBy: 'Sort By',
        clearFilters: 'Clear Filters',
        allInstitutions: 'All Institutions',
        allTitles: 'All Titles',
        allTags: 'All Tags',
        sortNewest: 'Newest First',
        sortOldest: 'Oldest First',
        sortHighestRating: 'Highest Rating',
        sortMostCited: 'Most Cited',
        activeFilters: 'Active Filters',
        noFilterResults: 'No results match the selected filters',
    },
    notifications: {
        title: 'Notifications',
        unread: 'unread',
        markAllAsRead: 'Mark all as read',
        today: 'Today',
        thisWeek: 'This Week',
        earlier: 'Earlier',
        justNow: 'Just now',
        minutesAgo: 'm ago',
        hoursAgo: 'h ago',
        daysAgo: 'd ago',
        noNotifications: 'No notifications yet',
        noNotificationsDesc: 'Follow, rating, and share notifications will appear here.',
        loading: 'Loading...',
        errorLoading: 'Error loading notifications.',
        delete: 'Delete',
    },
    peerReview: {
        title: 'Peer Review',
        subtitle: 'Review publications or find reviewers for your work',
        lookingForReviewers: 'Looking for Reviewers',
        myApplications: 'My Applications',
        myPublications: 'My Publications',
        loading: 'Loading...',
    },
    recommendations: {
        title: 'Recommended Researchers',
        subtitle: 'Connect with researchers in similar fields. AI-powered recommendations coming soon!',
        aiSubtitle: 'Researchers matched based on your publications and research interests.',
        tagSubtitle: 'Researchers matched based on your shared research tags and interests.',
        noResearchers: 'No Researchers Found',
        noResearchersDesc: 'Be the first to invite your colleagues to join!',
        aiTitle: 'AI Matching Engine',
        aiText: 'Our AI-powered recommendation system will analyze your research interests, publications, and academic profile to suggest the most relevant collaborators. This feature is currently under development.',
        aiActiveTitle: 'AI-Powered Matches',
        aiActiveText: 'These recommendations are generated by analyzing your publications, research interests, and tag similarity with other researchers using our AI matching engine.',
        tagTitle: 'Tag-Based Matching',
        tagText: 'These recommendations are based on your shared research tags. Upload publications to unlock AI-powered matching for more accurate results.',
        loadingRec: 'Loading recommendations...',
    },
    settings: {
        settingsTitle: 'Settings',
        profileInfo: 'Profile Information',
        accountAccess: 'Account Access',
        visibility: 'Visibility',
        generalPreferences: 'General Preferences',
        profileDesc: 'Edit your name, title, and institution details.',
        fullName: 'Full Name',
        fullNamePlaceholder: 'Your full name',
        title: 'Title',
        titlePlaceholder: 'e.g. Prof. Dr., Res. Asst.',
        institution: 'Institution',
        institutionPlaceholder: 'University or institution',
        department: 'Department',
        departmentPlaceholder: 'Department or field',
        bio: 'Bio',
        bioPlaceholder: 'A short description about yourself...',
        save: 'Save',
        saving: 'Saving...',
        verificationStatus: 'Verification Status',
        verified: 'Verified',
        unverified: 'Unverified',
        verifiedDesc: 'Your account has been verified with an academic email.',
        unverifiedDesc: 'Use your academic email to verify your account.',
        emailAddress: 'Email Address',
        newEmail: 'New Email',
        newEmailPlaceholder: 'new@email.edu',
        currentPassword: 'Current Password',
        currentPasswordPlaceholder: 'Enter your password for security',
        updateEmail: 'Update Email',
        updating: 'Updating...',
        changePassword: 'Change Password',
        currentPasswordLabel: 'Current Password',
        currentPasswordFieldPlaceholder: 'Your current password',
        newPassword: 'New Password',
        newPasswordPlaceholder: 'At least 6 characters',
        confirmNewPassword: 'Confirm New Password',
        confirmPasswordPlaceholder: 'Re-enter new password',
        changing: 'Changing...',
        deleteAccount: 'Delete Account',
        deleteAccountDesc: 'When you delete your account, all your data will be permanently removed. This action cannot be undone.',
        deleteMyAccount: 'Delete My Account',
        deleteConfirm: 'This action cannot be undone. Are you sure?',
        yesDelete: 'Yes, Delete',
        deleting: 'Deleting...',
        cancel: 'Cancel',
        visibilityDesc: 'Control who can see your profile.',
        public: 'Public',
        publicDesc: 'Everyone can see your profile.',
        connectionsOnly: 'Connections Only',
        connectionsOnlyDesc: 'Only your connections can see your profile.',
        private: 'Private',
        privateDesc: 'Your profile is completely hidden.',
        preferencesDesc: 'Set your language and display preferences.',
        language: 'Language',
        accountInformation: 'Account Information',
        registrationDate: 'Registration Date',
        profileUpdated: 'Profile updated successfully.',
        profileUpdateFailed: 'Failed to update profile.',
        passwordChanged: 'Password changed successfully.',
        passwordsNoMatch: 'New passwords do not match.',
        passwordTooShort: 'Password must be at least 6 characters.',
        wrongPassword: 'Current password is incorrect.',
        fillAllFields: 'Please fill in all fields.',
        emailUpdated: 'Email address updated.',
        emailChangeFailed: 'Failed to change email. Check your password.',
        privacyUpdated: 'Privacy settings updated.',
        privacyFailed: 'Failed to update privacy settings.',
        languageUpdated: 'Language preference updated.',
        languageFailed: 'Failed to update language preference.',
        deleteFailed: 'Failed to delete account.',
        loadingSettings: 'Loading settings...',
    },
    profile: {
        followers: 'Followers',
        following: 'Following',
    },
};

// ==================== TURKISH ====================
const tr: Translations = {
    navbar: {
        home: 'Ana Sayfa',
        search: 'Arama',
        notifications: 'Bildirimler',
        profile: 'Profil',
        settings: 'Ayarlar',
        recommendations: 'Öneriler',
        peerReview: 'Hakemlik',
        logout: 'Çıkış',
        searchPlaceholder: 'Kişi veya yayın ara...',
        searching: 'Aranıyor...',
        noResults: 'Sonuç bulunamadı',
        people: 'Kişiler',
        publications: 'Yayınlar',
        viewAll: 'Tüm Sonuçları Gör',
    },
    home: {
        noPublicationsTitle: 'Henüz Yayın Yok',
        noPublicationsDesc: 'Araştırmanızı toplulukla paylaşan ilk kişi olun!',
        loadingFeed: 'Akış yükleniyor...',
        loadingMore: 'Daha fazla yükleniyor...',
        endOfFeed: 'Akışın sonuna ulaştınız',
        failedToLoad: 'Akış yüklenemedi. Lütfen tekrar deneyin.',
    },
    search: {
        title: 'Arama',
        subtitle: 'Kişi, yayın veya etiket arayın',
        placeholder: 'Ad, yayın başlığı veya etiket ile arayın...',
        people: 'Kişiler',
        publications: 'Yayınlar',
        tags: 'Etiketler',
        searching: 'Aranıyor...',
        startSearching: 'Aramaya Başlayın',
        minChars: 'En az 2 karakter girin',
        noUsersFound: 'Kullanıcı bulunamadı',
        noPubsFound: 'Yayın bulunamadı',
        noTagsFound: 'Bu etiket için sonuç bulunamadı',
        tryDifferent: 'Farklı anahtar kelimeler deneyin',
        tryDifferentTag: 'Farklı bir etiket adı deneyin',
        pubsWithTag: 'Bu etikete sahip yayınlar',
        peopleWithTag: 'Bu etikete sahip kişiler',
        citations: 'Atıflar',
        saved: 'Kaydedilenler',
        previous: 'Önceki',
        next: 'Sonraki',
        filterInstitution: 'Kurum',
        filterTitle: 'Unvan',
        filterVerified: 'Sadece Doğrulanmış',
        filterTags: 'Etiketler',
        filterMinRating: 'Min. Puan',
        filterSortBy: 'Sıralama',
        clearFilters: 'Filtreleri Temizle',
        allInstitutions: 'Tüm Kurumlar',
        allTitles: 'Tüm Unvanlar',
        allTags: 'Tüm Etiketler',
        sortNewest: 'En Yeni',
        sortOldest: 'En Eski',
        sortHighestRating: 'En Yüksek Puan',
        sortMostCited: 'En Çok Atıf',
        activeFilters: 'Aktif Filtreler',
        noFilterResults: 'Seçilen filtrelere uygun sonuç bulunamadı',
    },
    notifications: {
        title: 'Bildirimler',
        unread: 'okunmamış',
        markAllAsRead: 'Tümünü okundu işaretle',
        today: 'Bugün',
        thisWeek: 'Bu Hafta',
        earlier: 'Daha Önce',
        justNow: 'Az önce',
        minutesAgo: 'dk önce',
        hoursAgo: 'sa önce',
        daysAgo: 'g önce',
        noNotifications: 'Henüz bildirim yok',
        noNotificationsDesc: 'Takip, değerlendirme ve paylaşım bildirimleri burada görünecek.',
        loading: 'Yükleniyor...',
        errorLoading: 'Bildirimler yüklenirken hata oluştu.',
        delete: 'Sil',
    },
    peerReview: {
        title: 'Hakemlik',
        subtitle: 'Yayınları inceleyin veya çalışmanız için hakem bulun',
        lookingForReviewers: 'Hakem Arıyor',
        myApplications: 'Başvurularım',
        myPublications: 'Yayınlarım',
        loading: 'Yükleniyor...',
    },
    recommendations: {
        title: 'Önerilen Araştırmacılar',
        subtitle: 'Benzer alanlardaki araştırmacılarla bağlantı kurun. Yapay zeka destekli öneriler yakında!',
        aiSubtitle: 'Yayınlarınız ve araştırma ilgi alanlarınıza göre eşleştirilmiş araştırmacılar.',
        tagSubtitle: 'Ortak araştırma etiketlerinize ve ilgi alanlarınıza göre eşleştirilmiş araştırmacılar.',
        noResearchers: 'Araştırmacı Bulunamadı',
        noResearchersDesc: 'Meslektaşlarınızı davet eden ilk kişi olun!',
        aiTitle: 'Yapay Zeka Eşleştirme Motoru',
        aiText: 'Yapay zeka destekli öneri sistemimiz araştırma ilgi alanlarınızı, yayınlarınızı ve akademik profilinizi analiz ederek en uygun iş birlikçileri önerecektir. Bu özellik şu anda geliştirme aşamasındadır.',
        aiActiveTitle: 'Yapay Zeka Destekli Eşleşmeler',
        aiActiveText: 'Bu öneriler, yayınlarınız, araştırma ilgi alanlarınız ve diğer araştırmacılarla etiket benzerliğiniz analiz edilerek yapay zeka eşleştirme motorumuz tarafından oluşturulmuştur.',
        tagTitle: 'Etiket Bazlı Eşleştirme',
        tagText: 'Bu öneriler ortak araştırma etiketlerinize dayanmaktadır. Daha doğru sonuçlar için yayın yükleyerek yapay zeka destekli eşleştirmeyi aktifleştirin.',
        loadingRec: 'Öneriler yükleniyor...',
    },
    settings: {
        settingsTitle: 'Ayarlar',
        profileInfo: 'Profil Bilgileri',
        accountAccess: 'Hesap Erişimi',
        visibility: 'Görünürlük',
        generalPreferences: 'Genel Tercihler',
        profileDesc: 'Ad, unvan ve kurum bilgilerinizi düzenleyin.',
        fullName: 'Ad Soyad',
        fullNamePlaceholder: 'Adınız Soyadınız',
        title: 'Unvan',
        titlePlaceholder: 'Prof. Dr., Arş. Gör., vb.',
        institution: 'Kurum',
        institutionPlaceholder: 'Üniversite veya Kurum',
        department: 'Bölüm',
        departmentPlaceholder: 'Bölüm veya Anabilim Dalı',
        bio: 'Biyografi',
        bioPlaceholder: 'Kendinizi kısaca tanıtın...',
        save: 'Kaydet',
        saving: 'Kaydediliyor...',
        verificationStatus: 'Doğrulama Durumu',
        verified: 'Doğrulanmış',
        unverified: 'Doğrulanmamış',
        verifiedDesc: 'Hesabınız akademik e-posta ile doğrulanmış.',
        unverifiedDesc: 'Hesabınızı doğrulamak için akademik e-posta adresinizi kullanın.',
        emailAddress: 'E-posta Adresi',
        newEmail: 'Yeni E-posta',
        newEmailPlaceholder: 'yeni@email.edu.tr',
        currentPassword: 'Mevcut Şifre',
        currentPasswordPlaceholder: 'Güvenlik için şifrenizi girin',
        updateEmail: 'E-postayı Güncelle',
        updating: 'Güncelleniyor...',
        changePassword: 'Şifreyi Değiştir',
        currentPasswordLabel: 'Mevcut Şifre',
        currentPasswordFieldPlaceholder: 'Mevcut şifreniz',
        newPassword: 'Yeni Şifre',
        newPasswordPlaceholder: 'En az 6 karakter',
        confirmNewPassword: 'Yeni Şifre (Tekrar)',
        confirmPasswordPlaceholder: 'Yeni şifreyi tekrar girin',
        changing: 'Değiştiriliyor...',
        deleteAccount: 'Hesabı Sil',
        deleteAccountDesc: 'Hesabınızı sildiğinizde tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz.',
        deleteMyAccount: 'Hesabımı Sil',
        deleteConfirm: 'Bu işlem geri alınamaz. Emin misiniz?',
        yesDelete: 'Evet, Sil',
        deleting: 'Siliniyor...',
        cancel: 'İptal',
        visibilityDesc: 'Profilinizin kimler tarafından görülebileceğini ayarlayın.',
        public: 'Herkese Açık',
        publicDesc: 'Herkes profilinizi görebilir.',
        connectionsOnly: 'Sadece Bağlantılar',
        connectionsOnlyDesc: 'Sadece bağlantılarınız görebilir.',
        private: 'Gizli',
        privateDesc: 'Profiliniz tamamen gizli.',
        preferencesDesc: 'Dil ve görünüm tercihlerinizi ayarlayın.',
        language: 'Dil',
        accountInformation: 'Hesap Bilgileri',
        registrationDate: 'Kayıt Tarihi',
        profileUpdated: 'Profil bilgileri güncellendi.',
        profileUpdateFailed: 'Profil güncellenirken hata oluştu.',
        passwordChanged: 'Şifre başarıyla değiştirildi.',
        passwordsNoMatch: 'Yeni şifreler eşleşmiyor.',
        passwordTooShort: 'Şifre en az 6 karakter olmalıdır.',
        wrongPassword: 'Mevcut şifre yanlış.',
        fillAllFields: 'Tüm alanları doldurun.',
        emailUpdated: 'E-posta adresi güncellendi.',
        emailChangeFailed: 'E-posta değiştirilemedi. Şifrenizi kontrol edin.',
        privacyUpdated: 'Gizlilik ayarları güncellendi.',
        privacyFailed: 'Gizlilik ayarları güncellenemedi.',
        languageUpdated: 'Dil tercihi güncellendi.',
        languageFailed: 'Dil tercihi güncellenemedi.',
        deleteFailed: 'Hesap silinemedi.',
        loadingSettings: 'Ayarlar yükleniyor...',
    },
    profile: {
        followers: 'Takipçiler',
        following: 'Takip Edilen',
    },
};

// ==================== LANGUAGE MAP ====================
const translationsMap: Record<string, Translations> = { en, tr };

export const getTranslations = (lang: string): Translations => {
    return translationsMap[lang] || translationsMap['en'];
};

// ==================== HOOK ====================
export const useTranslation = (): Translations => {
    const { language } = useLanguage();
    return getTranslations(language);
};
