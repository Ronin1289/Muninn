// Configuration Management
const CONFIG_KEY = 'supabase_config';
let supabaseClient = null;

// Load saved configuration
function loadConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            console.error('Error parsing saved config:', e);
        }
    }
    return null;
}

// Save configuration
function saveConfig(url, key) {
    const config = { url, key };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// Initialize Supabase client
function initializeSupabase(url, key) {
    try {
        supabaseClient = supabase.createClient(url, key);
        return true;
    } catch (error) {
        showNotification('Failed to initialize Supabase client', 'error');
        console.error('Supabase initialization error:', error);
        return false;
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification show ${type}`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load projects and their ideas
async function loadProjects() {
    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    try {
        // Fetch all projects
        const { data: projects, error: projectsError } = await supabaseClient
            .from('projects')
            .select('*')
            .order('created_at');

        if (projectsError) throw projectsError;

        const projectsList = document.getElementById('projectsList');
        const projectCount = document.getElementById('projectCount');

        if (!projects || projects.length === 0) {
            projectsList.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11L12 14L22 4M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>No projects yet</p>
                    <span>Add your first project to get started</span>
                </div>
            `;
            projectCount.textContent = '0 projects';
            return;
        }

        // Fetch ideas count for each project
        const projectsWithCounts = await Promise.all(
            projects.map(async (project) => {
                const { data: ideas, error } = await supabaseClient
                    .from('ideas')
                    .select('id')
                    .eq('project_id', project.id);

                return {
                    ...project,
                    ideaCount: error ? 0 : (ideas?.length || 0)
                };
            })
        );

        projectsList.innerHTML = projectsWithCounts
            .map(project => createProjectCard(project))
            .join('');

        projectCount.textContent = `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`;

        // Add event listeners to project cards
        document.querySelectorAll('.project-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (!e.target.closest('.icon-btn')) {
                    toggleProject(header.dataset.projectId);
                }
            });
        });

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-project-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteProject(btn.dataset.projectId, btn.dataset.projectName);
            });
        });

        // Add event listeners to add idea forms
        document.querySelectorAll('.add-idea-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                addIdeaToProject(btn.dataset.projectId);
            });
        });

        document.querySelectorAll('.idea-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    addIdeaToProject(input.dataset.projectId);
                }
            });
        });

    } catch (error) {
        showNotification('Failed to load projects: ' + error.message, 'error');
        console.error('Error loading projects:', error);
    }
}

// Create project card HTML
function createProjectCard(project) {
    return `
        <div class="project-card" id="project-${project.id}">
            <div class="project-header" data-project-id="${project.id}">
                <div class="project-title">
                    <span class="project-name">${escapeHtml(project.name)}</span>
                    <span class="project-count">${project.ideaCount} ${project.ideaCount === 1 ? 'idea' : 'ideas'}</span>
                </div>
                <div class="project-actions">
                    <button class="icon-btn delete-project-btn danger" data-project-id="${project.id}" data-project-name="${escapeHtml(project.name)}" title="Delete project">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                    <button class="icon-btn expand-icon">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 9L12 16L5 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="project-content">
                <div class="project-ideas">
                    <div class="add-idea-form">
                        <input type="text" class="idea-input" data-project-id="${project.id}" placeholder="Add an idea..." />
                        <button class="btn btn-add add-idea-btn" data-project-id="${project.id}">
                            <svg class="btn-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Add
                        </button>
                    </div>
                    <div id="ideas-${project.id}">
                        <div class="no-ideas">Loading ideas...</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Toggle project expansion
async function toggleProject(projectId) {
    const card = document.getElementById(`project-${projectId}`);
    const isExpanded = card.classList.contains('expanded');

    if (!isExpanded) {
        card.classList.add('expanded');
        await loadProjectIdeas(projectId);
    } else {
        card.classList.remove('expanded');
    }
}

// Load ideas for a specific project
async function loadProjectIdeas(projectId) {
    const ideasContainer = document.getElementById(`ideas-${projectId}`);

    try {
        const { data: ideas, error } = await supabaseClient
            .from('ideas')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at');

        if (error) throw error;

        if (!ideas || ideas.length === 0) {
            ideasContainer.innerHTML = '<div class="no-ideas">No ideas yet. Add one above!</div>';
            return;
        }

        ideasContainer.innerHTML = ideas
            .map(idea => `
                <div class="idea-item" style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="flex: 1;">${escapeHtml(idea.content)}</span>
                    <button class="icon-btn danger delete-idea-btn" data-idea-id="${idea.id}" data-project-id="${projectId}" title="Delete idea" style="margin-left: 10px;">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            `)
            .join('');

        // Add event listeners to delete buttons
        document.querySelectorAll('.delete-idea-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteProjectIdea(btn.dataset.ideaId, btn.dataset.projectId));
        });

    } catch (error) {
        ideasContainer.innerHTML = '<div class="no-ideas">Failed to load ideas</div>';
        console.error('Error loading ideas:', error);
    }
}

// Add new project
async function addProject() {
    const input = document.getElementById('projectInput');
    const name = input.value.trim();

    if (!name) {
        showNotification('Please enter a project name', 'error');
        return;
    }

    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    const addBtn = document.getElementById('addProjectBtn');
    addBtn.classList.add('loading');
    addBtn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('projects')
            .insert({ name });

        if (error) throw error;

        input.value = '';
        await loadProjects();
        showNotification('Project added successfully', 'success');
    } catch (error) {
        showNotification('Failed to add project: ' + error.message, 'error');
        console.error('Error adding project:', error);
    } finally {
        addBtn.classList.remove('loading');
        addBtn.disabled = false;
    }
}

// Add idea to project
async function addIdeaToProject(projectId) {
    const input = document.querySelector(`.idea-input[data-project-id="${projectId}"]`);
    const content = input.value.trim();

    if (!content) {
        showNotification('Please enter an idea', 'error');
        return;
    }

    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('ideas')
            .insert({
                project_id: projectId,
                content
            });

        if (error) throw error;

        input.value = '';
        await loadProjectIdeas(projectId);
        await loadProjects(); // Refresh to update counts
        showNotification('Idea added successfully', 'success');
    } catch (error) {
        showNotification('Failed to add idea: ' + error.message, 'error');
        console.error('Error adding idea:', error);
    }
}

// Delete project
async function deleteProject(projectId, projectName) {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This will also delete all ideas in this project.`)) {
        return;
    }

    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('projects')
            .delete()
            .eq('id', projectId);

        if (error) throw error;

        await loadProjects();
        showNotification('Project deleted successfully', 'success');
    } catch (error) {
        showNotification('Failed to delete project: ' + error.message, 'error');
        console.error('Error deleting project:', error);
    }
}

// Delete individual idea from project
async function deleteProjectIdea(ideaId, projectId) {
    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('ideas')
            .delete()
            .eq('id', ideaId);

        if (error) throw error;

        await loadProjectIdeas(projectId);
        await loadProjects(); // Refresh to update counts
        showNotification('Idea deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete idea: ' + error.message, 'error');
        console.error('Error deleting idea:', error);
    }
}

// Connect to database
async function connectToDatabase() {
    const urlInput = document.getElementById('supabaseUrl');
    const keyInput = document.getElementById('supabaseKey');
    const url = urlInput.value.trim();
    const key = keyInput.value.trim();

    if (!url || !key) {
        showNotification('Please enter both URL and key', 'error');
        return;
    }

    const connectBtn = document.getElementById('connectBtn');
    connectBtn.classList.add('loading');
    connectBtn.disabled = true;

    try {
        if (initializeSupabase(url, key)) {
            // Test the connection
            const { error } = await supabaseClient
                .from('projects')
                .select('*')
                .limit(1);

            if (error) throw error;

            saveConfig(url, key);

            // Hide config panel and show main panel
            document.getElementById('configPanel').style.display = 'none';
            document.getElementById('mainPanel').style.display = 'block';

            await loadProjects();
            showNotification('Connected successfully!', 'success');
        }
    } catch (error) {
        showNotification('Connection failed: ' + error.message, 'error');
        console.error('Connection error:', error);
    } finally {
        connectBtn.classList.remove('loading');
        connectBtn.disabled = false;
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Connect button
    document.getElementById('connectBtn').addEventListener('click', connectToDatabase);

    // Add project button
    document.getElementById('addProjectBtn').addEventListener('click', addProject);

    // Enter key in project input
    document.getElementById('projectInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addProject();
        }
    });

    // Enter key in config inputs
    document.getElementById('supabaseUrl').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('supabaseKey').focus();
        }
    });

    document.getElementById('supabaseKey').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            connectToDatabase();
        }
    });

    // Try to auto-connect with saved config
    const savedConfig = loadConfig();
    if (savedConfig) {
        document.getElementById('supabaseUrl').value = savedConfig.url;
        document.getElementById('supabaseKey').value = savedConfig.key;

        // Auto-connect if config exists
        if (initializeSupabase(savedConfig.url, savedConfig.key)) {
            supabaseClient
                .from('projects')
                .select('*')
                .limit(1)
                .then(({ error }) => {
                    if (!error) {
                        document.getElementById('configPanel').style.display = 'none';
                        document.getElementById('mainPanel').style.display = 'block';
                        loadProjects();
                    }
                })
                .catch(console.error);
        }
    }
});
