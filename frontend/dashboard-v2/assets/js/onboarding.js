/**
 * Sorted.fund Dashboard - Onboarding Flow Helper
 * Keeps setup state consistent across pages.
 */

class OnboardingFlow {
  static CURRENT_PROJECT_KEY = 'sorted_current_project';
  static RUNTIME_CHAIN_ID = 14601;

  static pickCurrentProject(projects = []) {
    if (!projects.length) return null;

    const savedProjectId = localStorage.getItem(this.CURRENT_PROJECT_KEY);
    if (savedProjectId) {
      const saved = projects.find((project) => project.id === savedProjectId);
      if (saved) return saved;
    }

    return projects[0];
  }

  static normalizeApiKeys(keys = []) {
    return (keys || []).map((key) => ({
      id: key.id,
      preview: key.preview || key.key_preview || '',
      rateLimit: key.rateLimit ?? key.rate_limit ?? 100,
      issuedAt: key.issuedAt || key.issued_at || null,
      revokedAt: key.revokedAt || key.revoked_at || null,
      lastUsedAt: key.lastUsedAt || key.last_used_at || null,
    }));
  }

  static async getState(currentProject = null) {
    let projects = [];
    try {
      const response = await api.getAllProjects();
      projects = Array.isArray(response) ? response : (response.projects || []);
    } catch (error) {
      console.error('Failed to load projects for onboarding:', error);
      projects = [];
    }

    const project = currentProject || this.pickCurrentProject(projects);

    if (!project) {
      return {
        hasProject: false,
        project: null,
        projects,
        hasFundingAddress: false,
        hasApiKey: false,
        hasAllowlist: false,
        activeApiKeyCount: 0,
        progress: 0,
        totalSteps: 4,
        steps: [
          { id: 'project', label: 'Create project', done: false },
          { id: 'funding', label: 'Get funding address', done: false },
          { id: 'apikey', label: 'Generate API key', done: false },
          { id: 'allowlist', label: 'Add allowlist rule', done: false },
        ],
      };
    }

    const [fundingAccountResult, apiKeysResult, allowlistResult] = await Promise.all([
      api.getFundingAccountByChain(project.id, this.RUNTIME_CHAIN_ID).catch(() => null),
      api.getApiKeys(project.id).catch(() => []),
      api.getAllowlist(project.id).catch(() => []),
    ]);

    const depositAddress =
      fundingAccountResult?.account?.deposit_address ||
      fundingAccountResult?.deposit_address ||
      project.deposit_address ||
      null;

    const normalizedKeys = this.normalizeApiKeys(apiKeysResult);
    const activeApiKeyCount = normalizedKeys.filter((key) => !key.revokedAt).length;
    const hasAllowlist = Array.isArray(allowlistResult) && allowlistResult.length > 0;

    const steps = [
      { id: 'project', label: 'Create project', done: true },
      { id: 'funding', label: 'Get funding address', done: Boolean(depositAddress) },
      { id: 'apikey', label: 'Generate API key', done: activeApiKeyCount > 0 },
      { id: 'allowlist', label: 'Add allowlist rule', done: hasAllowlist },
    ];

    const completed = steps.filter((step) => step.done).length;

    return {
      hasProject: true,
      project,
      projects,
      hasFundingAddress: Boolean(depositAddress),
      fundingAddress: depositAddress,
      hasApiKey: activeApiKeyCount > 0,
      hasAllowlist,
      activeApiKeyCount,
      steps,
      progress: completed,
      totalSteps: steps.length,
      readyForProduction: completed >= 3,
    };
  }

  static async requireProjectOrRedirect(redirectPath = '/dashboard.html?flow=setup') {
    const state = await this.getState();
    if (state.hasProject) {
      return state;
    }

    window.location.href = redirectPath;
    return null;
  }
}

if (typeof window !== 'undefined') {
  window.OnboardingFlow = OnboardingFlow;
}
