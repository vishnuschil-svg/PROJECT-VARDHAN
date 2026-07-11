const DEFAULT_TIMEOUT_MINUTES = 30;

export const SessionManager = {
  createSessionState({ user, workspace, timeoutMinutes = DEFAULT_TIMEOUT_MINUTES } = {}) {
    const now = Date.now();

    return {
      userId: user?.id || user?.email || "anonymous",
      workspaceId: workspace?.id || null,
      startedAt: new Date(now).toISOString(),
      expiresAt: new Date(now + timeoutMinutes * 60 * 1000).toISOString(),
      timeoutMinutes,
      mfa: {
        status: "future-ready",
        required: false,
      },
      device: {
        status: "future-ready",
        trackingEnabled: false,
      },
    };
  },

  isSessionExpired(sessionState) {
    return Boolean(sessionState?.expiresAt && new Date(sessionState.expiresAt).getTime() < Date.now());
  },

  getMinutesRemaining(sessionState) {
    if (!sessionState?.expiresAt) {
      return 0;
    }

    return Math.max(0, Math.ceil((new Date(sessionState.expiresAt).getTime() - Date.now()) / 60000));
  },
};
