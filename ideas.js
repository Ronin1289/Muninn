// Configuration Management
const CONFIG_KEY = 'supabase_config';
let supabaseClient = null;
let miscellaneousProjectId = null;

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

// Find or create miscellaneous project
async function ensureMiscellaneousProject() {
    if (!supabaseClient) return null;

    try {
        // Try to find existing miscellaneous project
        const { data: existingProjects, error: findError } = await supabaseClient
            .from('projects')
            .select('id')
            .ilike('name', 'miscellaneous')
            .limit(1);

        if (findError) throw findError;

        if (existingProjects && existingProjects.length > 0) {
            miscellaneousProjectId = existingProjects[0].id;
            await migrateUnlabeledIdeas();
            return miscellaneousProjectId;
        }

        // Create miscellaneous project if it doesn't exist
        const { data: newProject, error: createError } = await supabaseClient
            .from('projects')
            .insert({ name: 'miscellaneous' })
            .select('id')
            .single();

        if (createError) throw createError;

        miscellaneousProjectId = newProject.id;
        await migrateUnlabeledIdeas();
        return miscellaneousProjectId;
    } catch (error) {
        console.error('Error ensuring miscellaneous project:', error);
        showNotification('Failed to setup miscellaneous project', 'error');
        return null;
    }
}

// Migrate any unlabeled ideas to miscellaneous project
async function migrateUnlabeledIdeas() {
    if (!supabaseClient || !miscellaneousProjectId) return;

    try {
        // Find ideas without a project_id
        const { data: unlabeledIdeas, error: findError } = await supabaseClient
            .from('ideas')
            .select('id')
            .is('project_id', null);

        if (findError) throw findError;

        if (unlabeledIdeas && unlabeledIdeas.length > 0) {
            // Update them to belong to miscellaneous project
            const { error: updateError } = await supabaseClient
                .from('ideas')
                .update({ project_id: miscellaneousProjectId })
                .is('project_id', null);

            if (updateError) throw updateError;

            console.log(`Migrated ${unlabeledIdeas.length} unlabeled ideas to miscellaneous project`);
        }
    } catch (error) {
        console.error('Error migrating unlabeled ideas:', error);
        // Don't show notification for migration errors, just log them
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

// Update connection status
function updateConnectionStatus(connected) {
    // Connection status UI removed - function kept for compatibility
}

// Refresh the list of entries
async function refreshList() {
    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    if (!miscellaneousProjectId) {
        await ensureMiscellaneousProject();
    }

    try {
        const { data, error } = await supabaseClient
            .from('ideas')
            .select('*')
            .eq('project_id', miscellaneousProjectId)
            .order('created_at');

        if (error) throw error;

        const listContent = document.getElementById('listContent');
        const entryCount = document.getElementById('entryCount');

        if (data.length === 0) {
            listContent.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11L12 14L22 4M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>No ideas yet</p>
                    <span>Add your first idea to get started</span>
                </div>
            `;
            entryCount.textContent = '0 entries';
        } else {
            listContent.innerHTML = data
                .map(row => `
                    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="flex: 1;">${escapeHtml(row.content)}</span>
                        <button class="icon-btn danger delete-item-btn" data-id="${row.id}" title="Delete idea" style="margin-left: 10px;">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 6H21M19 6V20C19 21 18 22 17 22H7C6 22 5 21 5 20V6M8 6V4C8 3 9 2 10 2H14C15 2 16 3 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </button>
                    </div>
                `)
                .join('');
            entryCount.textContent = `${data.length} ${data.length === 1 ? 'entry' : 'entries'}`;

            // Add event listeners to delete buttons
            document.querySelectorAll('.delete-item-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteIdea(btn.dataset.id));
            });
        }
    } catch (error) {
        showNotification('Failed to load ideas: ' + error.message, 'error');
        console.error('Error loading ideas:', error);
    }
}

// Add new entry
async function addEntry() {
    const input = document.getElementById('entryInput');
    const text = input.value.trim();

    if (!text) {
        showNotification('Please enter an idea', 'error');
        return;
    }

    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    if (!miscellaneousProjectId) {
        await ensureMiscellaneousProject();
    }

    const addBtn = document.getElementById('addBtn');
    addBtn.classList.add('loading');
    addBtn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('ideas')
            .insert({
                project_id: miscellaneousProjectId,
                content: text
            });

        if (error) throw error;

        input.value = '';
        await refreshList();
        showNotification('Idea added successfully', 'success');
    } catch (error) {
        showNotification('Failed to add idea: ' + error.message, 'error');
        console.error('Error adding idea:', error);
    } finally {
        addBtn.classList.remove('loading');
        addBtn.disabled = false;
    }
}

// Delete first entry
async function deleteFirst() {
    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    if (!miscellaneousProjectId) {
        await ensureMiscellaneousProject();
    }

    const deleteBtn = document.getElementById('deleteFirstBtn');
    deleteBtn.classList.add('loading');
    deleteBtn.disabled = true;

    try {
        // Get the first entry
        const { data: firstEntry, error: selectError } = await supabaseClient
            .from('ideas')
            .select('id')
            .eq('project_id', miscellaneousProjectId)
            .order('created_at')
            .limit(1);

        if (selectError) throw selectError;

        if (!firstEntry || firstEntry.length === 0) {
            showNotification('No ideas to delete', 'error');
            return;
        }

        // Delete the entry
        const { error: deleteError } = await supabaseClient
            .from('ideas')
            .delete()
            .eq('id', firstEntry[0].id);

        if (deleteError) throw deleteError;

        await refreshList();
        showNotification('First idea deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete idea: ' + error.message, 'error');
        console.error('Error deleting first idea:', error);
    } finally {
        deleteBtn.classList.remove('loading');
        deleteBtn.disabled = false;
    }
}

// Delete last entry
async function deleteLast() {
    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    if (!miscellaneousProjectId) {
        await ensureMiscellaneousProject();
    }

    const deleteBtn = document.getElementById('deleteLastBtn');
    deleteBtn.classList.add('loading');
    deleteBtn.disabled = true;

    try {
        // Get the last entry
        const { data: lastEntry, error: selectError } = await supabaseClient
            .from('ideas')
            .select('id')
            .eq('project_id', miscellaneousProjectId)
            .order('created_at', { ascending: false })
            .limit(1);

        if (selectError) throw selectError;

        if (!lastEntry || lastEntry.length === 0) {
            showNotification('No ideas to delete', 'error');
            return;
        }

        // Delete the entry
        const { error: deleteError } = await supabaseClient
            .from('ideas')
            .delete()
            .eq('id', lastEntry[0].id);

        if (deleteError) throw deleteError;

        await refreshList();
        showNotification('Last idea deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete idea: ' + error.message, 'error');
        console.error('Error deleting last idea:', error);
    } finally {
        deleteBtn.classList.remove('loading');
        deleteBtn.disabled = false;
    }
}

// Delete individual idea
async function deleteIdea(ideaId) {
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

        await refreshList();
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
            // Ensure miscellaneous project exists
            await ensureMiscellaneousProject();

            if (!miscellaneousProjectId) {
                throw new Error('Failed to setup miscellaneous project');
            }

            saveConfig(url, key);
            updateConnectionStatus(true);

            // Hide config panel and show main panel
            document.getElementById('configPanel').style.display = 'none';
            document.getElementById('mainPanel').style.display = 'block';

            await refreshList();
            showNotification('Connected successfully!', 'success');
        }
    } catch (error) {
        showNotification('Connection failed: ' + error.message, 'error');
        console.error('Connection error:', error);
        updateConnectionStatus(false);
    } finally {
        connectBtn.classList.remove('loading');
        connectBtn.disabled = false;
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Connect button
    document.getElementById('connectBtn').addEventListener('click', connectToDatabase);

    // Add entry button
    document.getElementById('addBtn').addEventListener('click', addEntry);

    // Enter key in entry input
    document.getElementById('entryInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addEntry();
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
            ensureMiscellaneousProject()
                .then(() => {
                    if (miscellaneousProjectId) {
                        updateConnectionStatus(true);
                        document.getElementById('configPanel').style.display = 'none';
                        document.getElementById('mainPanel').style.display = 'block';
                        refreshList();
                    }
                })
                .catch(console.error);
        }
    }
});
