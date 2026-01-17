/**
 * Sorted.fund Dashboard - Project Switcher
 * Manages current project selection and switching
 */

class ProjectSwitcher {
  static CURRENT_PROJECT_KEY = 'sorted_current_project';
  static currentProject = null;
  static projects = [];

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
    const name = prompt('Enter project name:');
    if (!name) return;

    try {
      const project = await api.createProject({ name });
      console.log('Project created:', project);

      // Switch to new project
      this.switchProject(project.id);
    } catch (error) {
      alert('Failed to create project: ' + error.message);
    }
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
