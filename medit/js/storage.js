// Storage & Habit Tracking Service
const STORAGE_KEY = 'medit_pwa_habits_v1';

const DEFAULT_STATE = {
  activeAnchorId: 'laptop-close',
  streakDays: 0,
  lastActiveDate: null,
  totalSeconds: 0,
  totalSessions: 0,
  sessions: [],
  soundVolume: 0.8,
  bellTone: 'tibetan',
  ambientType: 'brown-noise',
  ambientVolume: 0.35,
  completedArticleIds: []
};

function getTodayString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

class HabitStorage {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_STATE };
      return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch (e) {
      console.error('Error loading state:', e);
      return { ...DEFAULT_STATE };
    }
  }

  save(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving state:', e);
    }
  }

  recordSession(currentState, { durationSeconds, type, techniqueName, ratingAfter, note }) {
    const today = getTodayString();
    const yesterday = getYesterdayString();

    let newStreak = currentState.streakDays;
    let isNewStreak = false;

    if (!currentState.lastActiveDate) {
      newStreak = 1;
      isNewStreak = true;
    } else if (currentState.lastActiveDate === today) {
      // Kept current streak
      isNewStreak = false;
    } else if (currentState.lastActiveDate === yesterday) {
      newStreak += 1;
      isNewStreak = true;
    } else {
      newStreak = 1;
      isNewStreak = true;
    }

    const newSession = {
      id: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      dateString: today,
      durationSeconds: Math.round(durationSeconds),
      type: type || 'timer',
      techniqueName: techniqueName || 'Meditación',
      ratingAfter: ratingAfter || 4,
      note: note || ''
    };

    const nextState = {
      ...currentState,
      streakDays: newStreak,
      lastActiveDate: today,
      totalSeconds: currentState.totalSeconds + Math.round(durationSeconds),
      totalSessions: currentState.totalSessions + 1,
      sessions: [newSession, ...currentState.sessions].slice(0, 200)
    };

    this.save(nextState);
    return { nextState, isNewStreak };
  }

  exportData(state) {
    return JSON.stringify(state, null, 2);
  }

  importData(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed && typeof parsed.totalSeconds === 'number') {
        const merged = { ...DEFAULT_STATE, ...parsed };
        this.save(merged);
        return merged;
      }
    } catch (e) {
      console.error('Invalid import data:', e);
    }
    return null;
  }
}

window.habitStorage = new HabitStorage();
