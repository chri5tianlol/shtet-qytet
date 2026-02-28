import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    if (!user) {
        return <div className="flex-center" style={{ minHeight: '60vh' }}>Loading...</div>;
    }

    return (
        <div className="dashboard-page flex-center" style={{ flexDirection: 'column', minHeight: '60vh' }}>
            <div className="glass-panel" style={{ padding: '40px', width: '100%', maxWidth: '600px', textAlign: 'center' }}>
                <h2 style={{ marginBottom: '8px' }}>{user.username}'s Dashboard</h2>
                <p style={{ color: 'var(--text-secondary)' }}>Member since {new Date(user.created_at).toLocaleDateString()}</p>

                <div style={{ display: 'flex', justifyContent: 'space-around', margin: '30px 0' }}>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{user.games_played}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Games Played</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{user.games_won}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Games Won</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{user.total_score}</div>
                        <div style={{ color: 'var(--text-secondary)' }}>Total Score</div>
                    </div>
                </div>

                <button className="glass-btn primary" style={{ marginRight: '10px' }} onClick={() => navigate('/lobby')}>Play Now</button>
                <button className="glass-btn" style={{ borderColor: 'rgba(255,255,255,0.2)' }} onClick={handleLogout}>Logout</button>
            </div>
        </div>
    );
}

export default Dashboard;
