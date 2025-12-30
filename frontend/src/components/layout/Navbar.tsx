import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Navbar.css';

export interface NavbarProps {
    onLogout?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        if (onLogout) {
            onLogout();
        }
        navigate('/login');
    };

    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="navbar">
            <h2 className="navbar-logo" onClick={() => navigate('/profile')}>
                Research Network
            </h2>
            <div className="navbar-links">
                <button
                    onClick={() => navigate('/profile')}
                    className={`navbar-button ${isActive('/profile') ? 'active' : ''}`}
                >
                    Profile
                </button>
                <button
                    onClick={() => navigate('/recommendations')}
                    className={`navbar-button ${isActive('/recommendations') ? 'active' : ''}`}
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
