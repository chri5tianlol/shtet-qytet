import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

function Navbar() {
    const { user } = useAuth();
    const [menuOpen, setMenuOpen] = useState(false);

    const checkAuthAndPlay = () => {
        setMenuOpen(false);
        if (!user) {
            window.location.href = '/login';
        } else {
            window.location.href = '/lobby';
        }
    };

    return (
        <nav className="navbar-container">
            <div className="navbar glass-panel">
                <div className="nav-brand">
                    <Link to="/" style={{ display: 'flex', alignItems: 'center' }} onClick={() => setMenuOpen(false)}>
                        <img src="/img/logo.png" alt="Shtet Qytet Logo" style={{ height: '40px', objectFit: 'contain' }} />
                    </Link>
                </div>

                <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    <span></span>
                    <span></span>
                    <span></span>
                </div>

                <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
                    <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
                    <Link to="/about" onClick={() => setMenuOpen(false)}>About</Link>
                    <Link to="/contact" onClick={() => setMenuOpen(false)}>Contact</Link>
                    <div className="mobile-actions">
                        <Link to={user ? "/dashboard" : "/login"} className="user-icon-btn" title={user ? user.username : "Login"} onClick={() => setMenuOpen(false)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                        </Link>
                        <button className="glass-btn primary play-btn" onClick={checkAuthAndPlay}>Play</button>
                    </div>
                </div>

                <div className="nav-actions flex-center desktop-only">
                    <Link to={user ? "/dashboard" : "/login"} className="user-icon-btn" title={user ? user.username : "Login"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                    </Link>
                    <button className="glass-btn primary play-btn" onClick={checkAuthAndPlay}>Play</button>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
