import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/common/Navbar.css';

interface NavbarProps {
    currentPage: 'profile' | 'recommendations';
}

const Navbar: React.FC<NavbarProps> = ({ currentPage }) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <h2 className="navbar-logo">Research Network</h2>
            <div className="navbar-links">
                <button
                    onClick={() => navigate('/profile')}
                    className={`navbar-button ${currentPage === 'profile' ? 'active' : ''}`}
                >
                    Profile
                </button>
                <button
                    onClick={() => navigate('/recommendations')}
                    className={`navbar-button ${currentPage === 'recommendations' ? 'active' : ''}`}
                >
                    Recommendations
                </button>
                <button onClick={handleLogout} className="navbar-logout-button">
                    Logout
                </button>
            </div>
        </nav>
    );
};

export default Navbar;
