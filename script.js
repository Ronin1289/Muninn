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

    try {
        const { data, error } = await supabaseClient
            .from('tasks')
            .select('*')
            .order('id');

        if (error) throw error;

        const listContent = document.getElementById('listContent');
        const entryCount = document.getElementById('entryCount');

        if (data.length === 0) {
            listContent.innerHTML = `
                <div class="empty-state">
                    <svg class="empty-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 11L12 14L22 4M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>No entries yet</p>
                    <span>Add your first entry to get started</span>
                </div>
            `;
            entryCount.textContent = '0 entries';
        } else {
            listContent.innerHTML = data
                .map(row => `
                    <div class="list-item" style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="flex: 1;">${escapeHtml(row.task)}</span>
                        <button class="icon-btn danger delete-item-btn" data-id="${row.id}" title="Delete task" style="margin-left: 10px;">
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
                btn.addEventListener('click', () => deleteTask(btn.dataset.id));
            });
        }
    } catch (error) {
        showNotification('Failed to load entries: ' + error.message, 'error');
        console.error('Error loading entries:', error);
    }
}

// Add new entry
async function addEntry() {
    const input = document.getElementById('entryInput');
    const text = input.value.trim();

    if (!text) {
        showNotification('Please enter some content', 'error');
        return;
    }

    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    const addBtn = document.getElementById('addBtn');
    addBtn.classList.add('loading');
    addBtn.disabled = true;

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .insert({ task: text });

        if (error) throw error;

        input.value = '';
        await refreshList();
        showNotification('Entry added successfully', 'success');
    } catch (error) {
        showNotification('Failed to add entry: ' + error.message, 'error');
        console.error('Error adding entry:', error);
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

    const deleteBtn = document.getElementById('deleteFirstBtn');
    deleteBtn.classList.add('loading');
    deleteBtn.disabled = true;

    try {
        // Get the first entry
        const { data: firstEntry, error: selectError } = await supabaseClient
            .from('tasks')
            .select('id')
            .order('id')
            .limit(1);

        if (selectError) throw selectError;

        if (!firstEntry || firstEntry.length === 0) {
            showNotification('No entries to delete', 'error');
            return;
        }

        // Delete the entry
        const { error: deleteError } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', firstEntry[0].id);

        if (deleteError) throw deleteError;

        await refreshList();
        showNotification('First entry deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete entry: ' + error.message, 'error');
        console.error('Error deleting first entry:', error);
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

    const deleteBtn = document.getElementById('deleteLastBtn');
    deleteBtn.classList.add('loading');
    deleteBtn.disabled = true;

    try {
        // Get the last entry
        const { data: lastEntry, error: selectError } = await supabaseClient
            .from('tasks')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        if (selectError) throw selectError;

        if (!lastEntry || lastEntry.length === 0) {
            showNotification('No entries to delete', 'error');
            return;
        }

        // Delete the entry
        const { error: deleteError } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', lastEntry[0].id);

        if (deleteError) throw deleteError;

        await refreshList();
        showNotification('Last entry deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete entry: ' + error.message, 'error');
        console.error('Error deleting last entry:', error);
    } finally {
        deleteBtn.classList.remove('loading');
        deleteBtn.disabled = false;
    }
}

// Delete individual task
async function deleteTask(taskId) {
    if (!supabaseClient) {
        showNotification('Not connected to database', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('tasks')
            .delete()
            .eq('id', taskId);

        if (error) throw error;

        await refreshList();
        showNotification('Task deleted', 'success');
    } catch (error) {
        showNotification('Failed to delete task: ' + error.message, 'error');
        console.error('Error deleting task:', error);
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
            // Test the connection by trying to fetch data
            const { error } = await supabaseClient
                .from('tasks')
                .select('*')
                .limit(1);

            if (error) throw error;

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
            supabaseClient
                .from('tasks')
                .select('*')
                .limit(1)
                .then(({ error }) => {
                    if (!error) {
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
