/**
 * Sorted.fund Dashboard - Project Switcher
 * Manages current project selection and switching
 */

class ProjectSwitcher {
  static CURRENT_PROJECT_KEY = 'sorted_current_project';
  static currentProject = null;
  static projects = [];
  static CREATE_MODAL_ID = 'createProjectModal';

  /**
   * Load user's projects from API
   */
  static async loadProjects() {
    try {
      const response = await api.getAllProjects();
      this.projects = Array.isArray(response) ? response : (response.projects || []);
      return this.projects;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    }
  }

  /**
   * Get current project from localStorage or first project
   */
  static async getCurrentProject() {
    if (this.currentProject) return this.currentProject;

    const savedProjectId = localStorage.getItem(this.CURRENT_PROJECT_KEY);
    const projects = await this.loadProjects();

    if (projects.length === 0) {
      // No projects - return null to trigger "create project" flow
      return null;
    }

    // Use saved project or first one
    this.currentProject = savedProjectId
      ? projects.find(p => p.id === savedProjectId) || projects[0]
      : projects[0];

    // Save current project
    localStorage.setItem(this.CURRENT_PROJECT_KEY, this.currentProject.id);

    return this.currentProject;
  }

  /**
   * Switch to different project
   */
  static switchProject(projectId) {
    localStorage.setItem(this.CURRENT_PROJECT_KEY, projectId);
    this.currentProject = null; // Reset cache
    window.location.reload(); // Reload dashboard with new project
  }

  static slugifyProjectName(name) {
    const base = (name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 32);

    return `${base || 'project'}-${Date.now().toString(36)}`;
  }

  static getOrCreateCreateProjectModal() {
    let modal = document.getElementById(this.CREATE_MODAL_ID);
    if (modal) return modal;

    modal = document.createElement('div');
    modal.id = this.CREATE_MODAL_ID;
    modal.className = 'modal-overlay hidden';
    modal.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <h2 class="modal-title">Create project</h2>
          <button class="modal-close" type="button" data-action="close">&times;</button>
        </div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); font-size: var(--text-body-sm);">
            This is your workspace for funding addresses, API keys, and usage analytics.
          </p>
          <div class="form-group">
            <label for="createProjectNameInput">Project Name</label>
            <input id="createProjectNameInput" type="text" placeholder="My game backend" maxlength="64" />
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" data-action="close">Cancel</button>
          <button type="button" id="createProjectSubmitBtn" data-action="submit">Create project</button>
        </div>
      </div>
    `;

    modal.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.dataset.action === 'close' || target === modal) {
        modal.classList.add('hidden');
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  /**
   * Render project selector dropdown in existing select element
   */
  static async renderSelector(selectElementId) {
    const selectEl = document.getElementById(selectElementId);
    if (!selectEl) {
      console.error(`Element #${selectElementId} not found`);
      return;
    }

    const projects = await this.loadProjects();
    const current = await this.getCurrentProject();

    if (!current) {
      // Show "No projects" message
      selectEl.innerHTML = '<option value="">No projects - Create one!</option>';
      selectEl.disabled = true;
      return;
    }

    // Render dropdown with projects
    selectEl.innerHTML = projects.map(p => `
      <option value="${p.id}" ${p.id === current.id ? 'selected' : ''}>
        ${p.name || p.id}
      </option>
    `).join('');

    // Add change handler
    selectEl.onchange = (e) => {
      this.switchProject(e.target.value);
    };

    selectEl.disabled = false;
  }

  /**
   * Show create project modal (simple prompt for now)
   */
  static async showCreateModal() {
    const modal = this.getOrCreateCreateProjectModal();
    const nameInput = modal.querySelector('#createProjectNameInput');
    const submitButton = modal.querySelector('#createProjectSubmitBtn');

    if (!(nameInput instanceof HTMLInputElement) || !(submitButton instanceof HTMLButtonElement)) {
      return;
    }

    modal.classList.remove('hidden');
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 0);

    const submit = async () => {
      const name = nameInput.value.trim();
      if (!name) {
        showError('Project name is required');
        nameInput.focus();
        return;
      }

      try {
        setButtonLoading(submitButton, 'Creating...');

        const id = this.slugifyProjectName(name);
        const developerStr = localStorage.getItem('sorted_developer');
        const developer = JSON.parse(developerStr || '{}');
        const owner = developer.email || developer.name || `developer-${developer.id || 'unknown'}`;

        const project = await api.createProject({ id, name, owner });
        modal.classList.add('hidden');
        this.switchProject(project.id);
      } catch (error) {
        showError('Failed to create project: ' + error.message);
      } finally {
        unsetButtonLoading(submitButton);
      }
    };

    submitButton.onclick = submit;
    nameInput.onkeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submit();
      }
    };
  }

  /**
   * Get project balance
   */
  static async getBalance(projectId) {
    try {
      const response = await api.getGasTankBalance(projectId || this.currentProject?.id);
      return response;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return { balance: '0', balanceUSD: '0' };
    }
  }
}

// Make ProjectSwitcher available globally
if (typeof window !== 'undefined') {
  window.ProjectSwitcher = ProjectSwitcher;
}
