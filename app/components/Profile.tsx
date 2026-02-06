'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useDisconnect } from 'wagmi';
import { CARS } from '@/app/types/cars';
import {
  getProfileStats,
  getFavoriteCarId,
  ensureBaseRecorded,
  fetchProfileStatsFromApi,
  ensureBaseRecordedApi,
  ACHIEVEMENT_GROUPS,
  getAchievementsByIds,
  getAchievementProgress,
  type ProfileStats,
  type AchievementDef,
  type AchievementProgress,
} from '@/app/lib/profileStats';

const PROFILE_STORAGE_PREFIX = 'jdm_profile_';

export type ProfileProps = {
  onClose: () => void;
  nickname: string;
  avatar: string;
  address: string | undefined;
  bestScore: number | null;
  chainId?: number;
};

function shortAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function formatProgress(progress: AchievementProgress): string {
  if (progress.unlocked) return '✓';
  if (progress.current != null && progress.target != null) {
    return `${progress.current.toLocaleString()} / ${progress.target.toLocaleString()}`;
  }
  return '—';
}

/** Одна строка в списке невыполненных внутри группы — без своего раскрытия */
function UncompletedRow({
  ach,
  progress,
}: {
  ach: AchievementDef;
  progress: AchievementProgress;
}) {
  const stateLabel = formatProgress(progress);
  return (
    <div className={`profile-achievement-subrow ${progress.unlocked ? 'unlocked' : 'locked'}`}>
      <span className="profile-achievement-icon">{ach.icon}</span>
      <span className="profile-achievement-title">{ach.title}</span>
      <span className="profile-achievement-state">{stateLabel}</span>
    </div>
  );
}

export function Profile({
  onClose,
  nickname,
  avatar,
  address,
  bestScore,
  chainId,
}: ProfileProps) {
  const { disconnect } = useDisconnect();
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());
  const [serverStats, setServerStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    if (!address) return;
    fetchProfileStatsFromApi(address).then((s) => {
      if (s) {
        setServerStats(s);
        try {
          localStorage.setItem(`${PROFILE_STORAGE_PREFIX}${address.toLowerCase()}`, JSON.stringify(s));
        } catch {
          // ignore
        }
      }
    });
    if (chainId === 8453 || chainId === 84532) {
      ensureBaseRecordedApi(address);
      ensureBaseRecorded(address, chainId);
    }
  }, [address, chainId]);

  const stats = address ? (serverStats ?? getProfileStats(address)) : null;
  const favoriteCarId = getFavoriteCarId(stats);
  const favoriteCarName = CARS[favoriteCarId]?.name ?? '—';

  const bestScoreNum = bestScore ?? 0;
  const totalUnlocked = ACHIEVEMENT_GROUPS.reduce(
    (sum, g) =>
      sum +
      getAchievementsByIds(g.achievementIds).filter((a) => a.check(stats, chainId, bestScoreNum)).length,
    0
  );
  const totalCount = ACHIEVEMENT_GROUPS.reduce(
    (sum, g) => sum + g.achievementIds.length,
    0
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <div className="menu-overlay" onClick={onClose}>
      <div className="menu-panel profile-panel" onClick={(e) => e.stopPropagation()}>
        <h2 className="menu-title">Profile</h2>

        <div className="profile-header">
          <div className="profile-avatar-wrap">
            {avatar.startsWith('http') ? (
              <div className="profile-avatar profile-avatar-pfp">
                <Image src={avatar} alt="" width={72} height={72} referrerPolicy="no-referrer" unoptimized />
              </div>
            ) : (
              <div className="profile-avatar profile-avatar-emoji">
                <span>{avatar || '😎'}</span>
              </div>
            )}
          </div>
          <p className="profile-nickname">{nickname || 'Player'}</p>
          {address && (
            <p className="profile-address" title={address}>
              {shortAddress(address)}
            </p>
          )}
        </div>

        <div className="profile-stats">
          <div className="profile-stat">
            <span className="profile-stat-label">Best score</span>
            <span className="profile-stat-value">{bestScore !== null ? bestScore : '—'}</span>
          </div>
          <div className="profile-stat">
            <span className="profile-stat-label">Favorite car</span>
            <span className="profile-stat-value">{favoriteCarName}</span>
          </div>
        </div>

        <div className="profile-section">
          <h3 className="profile-section-title">Stats</h3>
          <div className="profile-stats-grid">
            <div className="profile-stat-inline">
              <span className="profile-stat-label">Total distance</span>
              <span className="profile-stat-value">
                {stats ? stats.totalDistance.toLocaleString() : '0'}
              </span>
            </div>
            <div className="profile-stat-inline">
              <span className="profile-stat-label">Cars passed</span>
              <span className="profile-stat-value">
                {stats ? stats.totalCarsPassed.toLocaleString() : '0'}
              </span>
            </div>
            <div className="profile-stat-inline">
              <span className="profile-stat-label">Games played</span>
              <span className="profile-stat-value">
                {stats ? stats.totalGames.toLocaleString() : '0'}
              </span>
            </div>
          </div>
        </div>

        <div className="profile-section profile-section-collapsible">
          <button
            type="button"
            className="profile-section-head"
            onClick={() => setAchievementsOpen((v) => !v)}
            aria-expanded={achievementsOpen}
          >
            <h3 className="profile-section-title">Achievements</h3>
            <span className="profile-section-state">
              {totalUnlocked} / {totalCount}
            </span>
            <span className="profile-section-chevron" aria-hidden>
              {achievementsOpen ? '▼' : '▶'}
            </span>
          </button>
          {achievementsOpen && (
            <div className="profile-achievement-groups">
              {ACHIEVEMENT_GROUPS.map((group) => {
                const groupAchs = getAchievementsByIds(group.achievementIds);
                const unlockedInGroup = groupAchs.filter((a) => a.check(stats, chainId, bestScoreNum)).length;
                const uncompletedAchs = groupAchs.filter((a) => !a.check(stats, chainId, bestScoreNum));
                const expanded = expandedGroupIds.has(group.id);

                return (
                  <div
                    key={group.id}
                    className={`profile-achievement-group ${expanded ? 'expanded' : ''}`}
                  >
                    <button
                      type="button"
                      className="profile-achievement-head"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={expanded}
                    >
                      <span className="profile-achievement-icon">{group.icon}</span>
                      <span className="profile-achievement-title">{group.title}</span>
                      <span className="profile-achievement-state">
                        {unlockedInGroup} / {group.achievementIds.length}
                      </span>
                      <span className="profile-achievement-chevron" aria-hidden>
                        {expanded ? '▼' : '▶'}
                      </span>
                    </button>
                    {expanded && (
                      <div className="profile-achievement-sublist">
                        {uncompletedAchs.length === 0 ? (
                          <p className="profile-achievement-all-done">Все получены</p>
                        ) : (
                          uncompletedAchs.map((ach) => (
                            <UncompletedRow
                              key={ach.id}
                              ach={ach}
                              progress={getAchievementProgress(ach, stats, chainId, bestScore)}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="profile-actions">
          {address && (
            <button type="button" className="menu-btn secondary" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
          <button type="button" className="menu-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
