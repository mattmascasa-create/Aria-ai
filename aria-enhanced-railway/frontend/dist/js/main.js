// ARIA Enhanced - Main JavaScript

// Global variables
let currentUser = null;
let authToken = null;
let currentView = 'dashboard';

// API Base URL
const API_BASE = window.location.origin + '/api';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 2000);

    // Check for existing auth token
    authToken = localStorage.getItem('aria_token');
    if (authToken) {
        validateToken();
    } else {
        showLoginModal();
    }

    // Initialize event listeners
    initializeEventListeners();
}

function initializeEventListeners() {
    // Auth tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchAuthTab(this.dataset.tab);
        });
    });

    // Auth forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            switchView(this.dataset.view);
        });
    });

    // Sidebar toggle
    document.querySelector('.sidebar-toggle')?.addEventListener('click', toggleSidebar);

    // Task form
    document.getElementById('task-form').addEventListener('submit', handleCreateTask);

    // Knowledge form
    document.getElementById('knowledge-form').addEventListener('submit', handleCreateKnowledge);

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });

    // Click outside modal to close
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal(this.id);
            }
        });
    });
}

// Authentication functions
function switchAuthTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    // Update forms
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`${tab}-form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('aria_token', authToken);
            
            hideLoginModal();
            showApp();
            loadDashboard();
            showNotification('Login successful!', 'success');
        } else {
            showNotification(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed. Please try again.', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('aria_token', authToken);
            
            hideLoginModal();
            showApp();
            loadDashboard();
            showNotification('Registration successful!', 'success');
        } else {
            showNotification(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
    }
}

async function validateToken() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            showApp();
            loadDashboard();
        } else {
            localStorage.removeItem('aria_token');
            authToken = null;
            showLoginModal();
        }
    } catch (error) {
        console.error('Token validation error:', error);
        localStorage.removeItem('aria_token');
        authToken = null;
        showLoginModal();
    }
}

function logout() {
    localStorage.removeItem('aria_token');
    authToken = null;
    currentUser = null;
    hideApp();
    showLoginModal();
    showNotification('Logged out successfully', 'success');
}

// UI functions
function showLoginModal() {
    document.getElementById('login-modal').classList.add('active');
}

function hideLoginModal() {
    document.getElementById('login-modal').classList.remove('active');
}

function showApp() {
    document.getElementById('app').classList.remove('hidden');
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.username;
    }
}

function hideApp() {
    document.getElementById('app').classList.add('hidden');
}

function switchView(viewName) {
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`${viewName}-view`).classList.add('active');

    // Update page title
    const titles = {
        'dashboard': 'Dashboard',
        'ai-engine': 'AI Engine',
        'tasks': 'Task Manager',
        'knowledge': 'Knowledge Base',
        'integrations': 'Integrations',
        'analytics': 'Analytics'
    };
    document.getElementById('page-title').textContent = titles[viewName] || 'ARIA Enhanced';

    currentView = viewName;

    // Load view data
    switch (viewName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'tasks':
            loadTasks();
            break;
        case 'knowledge':
            loadKnowledge();
            break;
        case 'integrations':
            loadIntegrations();
            break;
    }
}

function toggleSidebar() {
    document.querySelector('.sidebar').classList.toggle('active');
}

// Dashboard functions
async function loadDashboard() {
    try {
        const response = await fetch(`${API_BASE}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateDashboardStats(data.stats);
            updateRecentActivity(data.recent_activity);
        }
    } catch (error) {
        console.error('Dashboard load error:', error);
    }
}

function updateDashboardStats(stats) {
    document.getElementById('total-tasks').textContent = stats.total_tasks || 0;
    document.getElementById('completed-tasks').textContent = stats.completed_tasks || 0;
    document.getElementById('knowledge-entries').textContent = stats.knowledge_entries || 0;
    document.getElementById('active-integrations').textContent = stats.active_integrations || 0;
}

function updateRecentActivity(activities) {
    const container = document.getElementById('recent-activity');
    container.innerHTML = '';

    activities.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="activity-icon">
                <i class="fas fa-${getActivityIcon(activity.type)}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-message">${activity.message}</div>
                <div class="activity-time">${formatTime(activity.timestamp)}</div>
            </div>
        `;
        container.appendChild(item);
    });
}

function getActivityIcon(type) {
    const icons = {
        'task': 'tasks',
        'ai': 'brain',
        'integration': 'plug',
        'knowledge': 'book'
    };
    return icons[type] || 'info-circle';
}

// AI Engine functions
async function analyzeText() {
    const text = document.getElementById('analysis-text').value;
    if (!text.trim()) {
        showNotification('Please enter text to analyze', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/ai/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ text })
        });

        const data = await response.json();

        if (response.ok) {
            displayAnalysisResults(data.analysis);
        } else {
            showNotification(data.error || 'Analysis failed', 'error');
        }
    } catch (error) {
        console.error('Analysis error:', error);
        showNotification('Analysis failed. Please try again.', 'error');
    }
}

function displayAnalysisResults(analysis) {
    const container = document.getElementById('analysis-results');
    container.innerHTML = `
        <h4>Analysis Results</h4>
        <div class="analysis-item">
            <strong>Sentiment:</strong> ${analysis.sentiment}
        </div>
        <div class="analysis-item">
            <strong>Keywords:</strong> ${analysis.keywords.join(', ')}
        </div>
        <div class="analysis-item">
            <strong>Summary:</strong> ${analysis.summary}
        </div>
        <div class="analysis-item">
            <strong>Confidence:</strong> ${(analysis.confidence * 100).toFixed(1)}%
        </div>
        <div class="analysis-item">
            <strong>Recommendations:</strong>
            <ul>
                ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
    `;
}

async function generateContent() {
    const prompt = document.getElementById('generation-prompt').value;
    const type = document.getElementById('generation-type').value;

    if (!prompt.trim()) {
        showNotification('Please enter a generation prompt', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/ai/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ prompt, type })
        });

        const data = await response.json();

        if (response.ok) {
            displayGenerationResults(data.content, data.type);
        } else {
            showNotification(data.error || 'Generation failed', 'error');
        }
    } catch (error) {
        console.error('Generation error:', error);
        showNotification('Generation failed. Please try again.', 'error');
    }
}

function displayGenerationResults(content, type) {
    const container = document.getElementById('generation-results');
    container.innerHTML = `
        <h4>Generated ${type.charAt(0).toUpperCase() + type.slice(1)}</h4>
        <div class="generated-content">
            <pre>${content}</pre>
        </div>
        <button onclick="copyToClipboard('${content.replace(/'/g, "\\'")}')">
            <i class="fas fa-copy"></i> Copy
        </button>
    `;
}

// Task functions
async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayTasks(data.tasks);
        }
    } catch (error) {
        console.error('Tasks load error:', error);
    }
}

function displayTasks(tasks) {
    const container = document.getElementById('tasks-list');
    container.innerHTML = '';

    if (tasks.length === 0) {
        container.innerHTML = '<p class="empty-state">No tasks found. Create your first task!</p>';
        return;
    }

    tasks.forEach(task => {
        const item = document.createElement('div');
        item.className = 'task-item';
        item.innerHTML = `
            <div class="task-info">
                <div class="task-title">${task.title}</div>
                <div class="task-description">${task.description || 'No description'}</div>
                <div class="task-meta">
                    <span class="task-status ${task.status}">${task.status}</span>
                    <span class="task-priority ${task.priority}">${task.priority}</span>
                    <span>${formatDate(task.created_at)}</span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="toggleTaskStatus(${task.id}, '${task.status}')" class="btn-secondary">
                    <i class="fas fa-${task.status === 'completed' ? 'undo' : 'check'}"></i>
                </button>
                <button onclick="deleteTask(${task.id})" class="btn-error">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function showCreateTaskModal() {
    document.getElementById('task-modal').classList.add('active');
}

async function handleCreateTask(e) {
    e.preventDefault();

    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-description').value;
    const priority = document.getElementById('task-priority').value;

    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, description, priority })
        });

        const data = await response.json();

        if (response.ok) {
            closeModal('task-modal');
            loadTasks();
            showNotification('Task created successfully!', 'success');
            
            // Reset form
            document.getElementById('task-form').reset();
        } else {
            showNotification(data.error || 'Task creation failed', 'error');
        }
    } catch (error) {
        console.error('Task creation error:', error);
        showNotification('Task creation failed. Please try again.', 'error');
    }
}

async function toggleTaskStatus(taskId, currentStatus) {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';

    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadTasks();
            showNotification('Task updated successfully!', 'success');
        }
    } catch (error) {
        console.error('Task update error:', error);
        showNotification('Task update failed', 'error');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            loadTasks();
            showNotification('Task deleted successfully!', 'success');
        }
    } catch (error) {
        console.error('Task deletion error:', error);
        showNotification('Task deletion failed', 'error');
    }
}

// Knowledge Base functions
async function loadKnowledge() {
    try {
        const response = await fetch(`${API_BASE}/knowledge`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayKnowledge(data.knowledge);
        }
    } catch (error) {
        console.error('Knowledge load error:', error);
    }
}

function displayKnowledge(knowledge) {
    const container = document.getElementById('knowledge-list');
    container.innerHTML = '';

    if (knowledge.length === 0) {
        container.innerHTML = '<p class="empty-state">No knowledge entries found. Add your first entry!</p>';
        return;
    }

    knowledge.forEach(item => {
        const element = document.createElement('div');
        element.className = 'knowledge-item';
        element.innerHTML = `
            <div class="knowledge-title">${item.title}</div>
            <div class="knowledge-content">${item.content.substring(0, 200)}${item.content.length > 200 ? '...' : ''}</div>
            <div class="knowledge-meta">
                <span class="knowledge-category">${item.category}</span>
                <span>${formatDate(item.created_at)}</span>
            </div>
        `;
        container.appendChild(element);
    });
}

function showCreateKnowledgeModal() {
    document.getElementById('knowledge-modal').classList.add('active');
}

async function handleCreateKnowledge(e) {
    e.preventDefault();

    const title = document.getElementById('knowledge-title').value;
    const content = document.getElementById('knowledge-content').value;
    const category = document.getElementById('knowledge-category').value || 'general';
    const tags = document.getElementById('knowledge-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag);

    try {
        const response = await fetch(`${API_BASE}/knowledge`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ title, content, category, tags })
        });

        const data = await response.json();

        if (response.ok) {
            closeModal('knowledge-modal');
            loadKnowledge();
            showNotification('Knowledge entry created successfully!', 'success');
            
            // Reset form
            document.getElementById('knowledge-form').reset();
        } else {
            showNotification(data.error || 'Knowledge creation failed', 'error');
        }
    } catch (error) {
        console.error('Knowledge creation error:', error);
        showNotification('Knowledge creation failed. Please try again.', 'error');
    }
}

// Integration functions
async function loadIntegrations() {
    try {
        const response = await fetch(`${API_BASE}/integrations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayIntegrations(data.integrations);
        }
    } catch (error) {
        console.error('Integrations load error:', error);
    }
}

function displayIntegrations(integrations) {
    const container = document.getElementById('integrations-list');
    container.innerHTML = '';

    if (integrations.length === 0) {
        container.innerHTML = '<p class="empty-state">No active integrations. Connect your first integration!</p>';
        return;
    }

    integrations.forEach(integration => {
        const item = document.createElement('div');
        item.className = 'integration-item';
        item.innerHTML = `
            <div class="integration-info">
                <div class="integration-name">${integration.name}</div>
                <div class="integration-type">${integration.type}</div>
                <div class="integration-status ${integration.is_active ? 'active' : 'inactive'}">
                    ${integration.is_active ? 'Active' : 'Inactive'}
                </div>
            </div>
            <div class="integration-actions">
                <button onclick="toggleIntegration(${integration.id}, ${integration.is_active})" class="btn-secondary">
                    ${integration.is_active ? 'Disable' : 'Enable'}
                </button>
            </div>
        `;
        container.appendChild(item);
    });
}

function showCreateIntegrationModal() {
    showNotification('Integration setup coming soon!', 'info');
}

// Utility functions
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;

    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        z-index: 10001;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
    `;

    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    // Remove after delay
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function getNotificationColor(type) {
    const colors = {
        'success': '#10b981',
        'error': '#ef4444',
        'warning': '#f59e0b',
        'info': '#3b82f6'
    };
    return colors[type] || '#3b82f6';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy to clipboard', 'error');
    });
}

// Global functions for HTML onclick handlers
window.logout = logout;
window.analyzeText = analyzeText;
window.generateContent = generateContent;
window.showCreateTaskModal = showCreateTaskModal;
window.showCreateKnowledgeModal = showCreateKnowledgeModal;
window.showCreateIntegrationModal = showCreateIntegrationModal;
window.closeModal = closeModal;
window.toggleTaskStatus = toggleTaskStatus;
window.deleteTask = deleteTask;
window.copyToClipboard = copyToClipboard;
