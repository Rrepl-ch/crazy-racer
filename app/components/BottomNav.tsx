'use client';

type Tab = 'howto' | 'car' | 'leaderboard' | 'profile';

type BottomNavProps = {
  activeTab: Tab | null;
  onTab: (tab: Tab) => void;
};

export function BottomNav({ activeTab, onTab }: BottomNavProps) {
  return (
    <nav className="bottom-nav">
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'howto' ? 'active' : ''}`}
        onClick={() => onTab('howto')}
        aria-label="How to play"
      >
        <span className="bottom-nav-icon">❓</span>
        <span className="bottom-nav-label">How to play</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'car' ? 'active' : ''}`}
        onClick={() => onTab('car')}
        aria-label="Car"
      >
        <span className="bottom-nav-icon">🚗</span>
        <span className="bottom-nav-label">Car</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
        onClick={() => onTab('leaderboard')}
        aria-label="Leaderboard"
      >
        <span className="bottom-nav-icon">🏆</span>
        <span className="bottom-nav-label">Leaderboard</span>
      </button>
      <button
        type="button"
        className={`bottom-nav-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => onTab('profile')}
        aria-label="Profile"
      >
        <span className="bottom-nav-icon">👤</span>
        <span className="bottom-nav-label">Profile</span>
      </button>
    </nav>
  );
}
