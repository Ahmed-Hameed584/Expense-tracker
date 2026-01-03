// Dashboard page JS (extracted from inline scripts)

// Check authentication on page load
if (!auth.isAuthenticated()) {
    window.location.href = 'index.html';
}

// Display current user name
document.addEventListener('DOMContentLoaded', function() {
    const user = auth.getCurrentUser();
    if (user) {
        const userDisplay = document.createElement('div');
        userDisplay.className = 'user-display';
        userDisplay.innerHTML = `
            <div style="font-size: 12px; color: #8b8c95; margin-bottom: 5px;">Welcome back,</div>
            <div style="font-weight: bold;">${user.name}</div>
            ${!auth.isAdmin() ? `
            <div style="margin-top: 10px;">
                <button class="delete-own-account-btn" onclick="deleteOwnAccount()">🗑️ Delete My Account</button>
            </div>` : ''}
        `;
        document.querySelector('.sidebar').appendChild(userDisplay);
    }
});

function deleteOwnAccount() {
    if (confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone. You will be logged out immediately.')) {
        try {
            auth.deleteOwnAccount();
            alert('Your account has been successfully deleted.');
            window.location.href = 'index.html';
        } catch (error) {
            alert('Error deleting account: ' + error.message);
        }
    }
}

let transactions = auth.loadUserData('transactions', []);
let currentTransactionMode = 'expense';
let radarChart = null, lineChart = null;
let selectedFilter = null;
const categories = ['Food', 'Shopping', 'Bills', 'Rent', 'Utilities', 'Transport', 'Entertainment'];

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

function init() {
    updateDashboard();
    renderLine();
}

function resetFilter() {
    selectedFilter = null;
    init();
}

function updateDashboard() {
    // Reload transactions from storage to ensure we operate on the most recent data
    transactions = auth.loadUserData('transactions', []);

    let data = transactions;
    if (selectedFilter) {
        data = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === selectedFilter.month && d.getFullYear() === selectedFilter.year;
        });
        document.getElementById('viewTitle').innerText = `Viewing ${selectedFilter.label}`;
        document.getElementById('activeMonthTag').innerText = selectedFilter.label;
        document.getElementById('balLabel').innerText = "Month Balance";
        document.getElementById('spendLabel').innerText = "Month Spend";
        document.getElementById('resetBtn').style.display = 'inline-block';
    } else {
        document.getElementById('viewTitle').innerText = "Global Overview";
        document.getElementById('activeMonthTag').innerText = "GLOBAL";
        document.getElementById('balLabel').innerText = "Total Balance";
        document.getElementById('spendLabel').innerText = "Total Spend";
        document.getElementById('resetBtn').style.display = 'none';
    }

    const inc = data.filter(t => t.amount > 0).reduce((a, b) => a + b.amount, 0);
    const exp = data.filter(t => t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    document.getElementById('totalBalance').innerText = `$${(inc - exp).toLocaleString()}`;
    document.getElementById('totalExpenses').innerText = `$${exp.toLocaleString()}`;
    document.getElementById('savingsPct').innerText = inc > 0 ? Math.round(((inc - exp) / inc) * 100) + '%' : '0%';

    const radarValues = categories.map(c => data.filter(t => t.category === c && t.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0));
    const totalAbs = data.reduce((a, b) => a + Math.abs(b.amount), 0);
    renderRadar(radarValues, totalAbs);
}

function renderRadar(dataValues, totalAbs) {
    const ctx = document.getElementById('expenseRadarChart').getContext('2d');
    if (radarChart) radarChart.destroy();
    const labelsWithPct = categories.map((cat, i) => {
        const pct = totalAbs > 0 ? Math.round((dataValues[i] / totalAbs) * 100) : 0;
        return `${cat} (${pct}%)`;
    });
    radarChart = new Chart(ctx, {
        type: 'radar',
        data: { labels: labelsWithPct, datasets: [{ data: dataValues, backgroundColor: '#5e6ad233', borderColor: '#5e6ad2', borderWidth: 2 }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { grid: { color: '#333' }, pointLabels: { color: '#8b8c95' }, ticks: { display: false } } },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const val = context.raw || 0;
                            const pct = totalAbs > 0 ? Math.round((val / totalAbs) * 100) : 0;
                            return `${context.label}: $${val} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

function renderLine() {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({ label: d.toLocaleString('default', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), total: 0 });
    }
    months.forEach(m => {
        m.total = transactions.filter(t => {
            const tDate = new Date(t.date);
            return t.amount < 0 && tDate.getMonth() === m.month && tDate.getFullYear() === m.year;
        }).reduce((a, b) => a + Math.abs(b.amount), 0);
    });

    const ctx = document.getElementById('trendLineChart').getContext('2d');
    if (lineChart) lineChart.destroy();
    lineChart = new Chart(ctx, {
        type: 'line',
        data: { labels: months.map(m => m.label), datasets: [{ data: months.map(m => m.total), borderColor: '#4fd1c5', backgroundColor: '#4fd1c51a', fill: true, tension: 0.4 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            onClick: (e, el) => { if (el.length > 0) { selectedFilter = months[el[0].index]; init(); } }
        }
    });
}

function openModal(mode) {
    document.getElementById('transactionModal').style.display = 'flex';
    const catSelect = document.getElementById('tCategory');
    const freqCont = document.getElementById('freqContainer');
    // remember mode for submit handling
    currentTransactionMode = mode;
    catSelect.innerHTML = '';
    if (mode === 'income') {
        document.getElementById('modalTitle').innerText = "Add Income";
        catSelect.innerHTML = '<option value="Income">Salary</option>';
        if (freqCont) freqCont.classList.remove('hidden');
    } else {
        document.getElementById('modalTitle').innerText = "Add Expense";
        categories.forEach(c => catSelect.innerHTML += `<option value="${c}">${c}</option>`);
        if (freqCont) freqCont.classList.add('hidden');
    }
}

function closeModal() { document.getElementById('transactionModal').style.display = 'none'; }

// Handle transaction form submit: add transaction, save and refresh dashboard
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('transactionForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        const date = document.getElementById('tDate').value;
        const amt = parseFloat(document.getElementById('tAmount').value);
        const cat = document.getElementById('tCategory').value;

        if (isNaN(amt)) {
            alert('Please enter a valid amount');
            return;
        }

        if (amt < 0) {
            alert("You can't enter negative sign");
            document.getElementById('tAmount').value = '';
            return;
        }

        const finalAmt = (currentTransactionMode === 'income') ? Math.abs(amt) : -Math.abs(amt);

        const tx = { id: Date.now(), date: date || new Date().toISOString(), desc: '', amount: finalAmt, category: cat };
        transactions.unshift(tx);
        try { saveAndNotify(); } catch (err) { console.error('Save failed', err); }
        closeModal();
        updateDashboard();
    });
});

// Save wrapper to persist transactions and notify other views
function saveAndNotify() {
    try { auth.saveUserData('transactions', transactions); } catch (err) { console.error('Save failed', err); }
    try {
        if (window.BroadcastChannel) {
            window._finDashBC = window._finDashBC || new BroadcastChannel('fin-dash');
            window._finDashBC.postMessage({ type: 'transactions:updated' });
        }
    } catch (e) { console.warn('Broadcast failed', e); }
    try { localStorage.setItem('transactions_last_update', Date.now().toString()); } catch (e) {}
    window.dispatchEvent(new Event('transactions:updated'));
}

function deleteUser(userId, userName) {
    if (confirm(`Are you sure you want to delete the account for "${userName}"? This will permanently remove all their data and cannot be undone.`)) {
        try {
            auth.deleteUserAccount(userId);
            alert(`Account for "${userName}" has been successfully deleted.`);
            updateAdminStats();
            loadUserList();
        } catch (error) {
            alert('Error deleting account: ' + error.message);
        }
    }
}

function showAdminPanel() {
    if (!auth.isAdmin()) {
        alert('Access denied. Admin privileges required.');
        return;
    }

    document.getElementById('main-dashboard').style.display = 'none';
    document.getElementById('admin-panel').style.display = 'block';

    // Update nav active state
    document.querySelectorAll('.nav-menu a.nav-item').forEach(n => n.classList.remove('active'));
    const adminLink = document.querySelector('#admin-link a.nav-item');
    if (adminLink) adminLink.classList.add('active');

    updateAdminStats();
    loadUserList();
}

function updateAdminStats() {
    const allUsers = auth.getAllUsers();
    document.getElementById('total-users-count').textContent = allUsers.length;
    document.getElementById('manageable-users-count').textContent = allUsers.filter(u => u.id !== auth.getCurrentUser().id).length;
}

function hideAdminPanel() {
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'block';

    // Restore active state to dashboard link
    document.querySelectorAll('.nav-menu a.nav-item').forEach(n => n.classList.remove('active'));
    const dashLink = document.querySelector('.nav-menu a[href="dashboard.html"]');
    if (dashLink) dashLink.classList.add('active');
}

function loadUserList() {
    const userList = document.getElementById('user-list');
    const users = auth.getAllUsers();

    userList.innerHTML = users.map(user => `
        <div class="user-card" data-user-id="${user.id}">
            <div class="user-info">
                <div class="user-name">${user.name}</div>
                <div class="user-email">${user.email}</div>
                <div class="user-date">Created: ${new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
            <div class="user-actions">
                ${user.id === auth.getCurrentUser().id ?
                    '<span class="current-user-badge">Current User</span>' :
                    (auth.isAdmin() ? `<button class="delete-user-btn" onclick="deleteUser('${user.id}', '${user.name}')">🗑️ Delete Account</button>` : '')
                }
            </div>
        </div>
    `).join('');
}

// Check admin status on page load
document.addEventListener('DOMContentLoaded', function() {
    if (auth.isAdmin()) {
        document.getElementById('admin-link').style.display = 'block';
    }

    // If navigated here with #admin, open admin panel automatically
    if (location.hash === '#admin' && auth.isAdmin()) {
        showAdminPanel();
        // remove hash to avoid repeated triggers
        history.replaceState(null, '', location.pathname + location.search);
    }

    // Listen for transaction updates from other pages/tabs
    window.addEventListener('transactions:updated', function() {
        transactions = auth.loadUserData('transactions', []);
        updateDashboard();
        renderLine();
    });

    // Keep sidebar nav active state in sync and handle admin panel toggle
    document.querySelectorAll('.nav-menu a.nav-item').forEach(a => {
        a.addEventListener('click', function (e) {
            // Remove active from all nav items
            document.querySelectorAll('.nav-menu a.nav-item').forEach(n => n.classList.remove('active'));
            // Add active to clicked link
            this.classList.add('active');

            // If admin link clicked, open admin panel and prevent navigation
            if (this.closest('#admin-link')) {
                e.preventDefault();
                showAdminPanel();
                return;
            }

            // When clicking other nav items, hide admin panel if open
            hideAdminPanel();
            // Ensure admin link remains visible for admins
            if (auth.isAdmin()) {
                const adminLinkEl = document.getElementById('admin-link');
                if (adminLinkEl) adminLinkEl.style.display = 'block';
            }
        });
    });

    // Ensure admin link is visible for admin users
    if (auth.isAdmin()) {
        const adminLinkEl = document.getElementById('admin-link');
        if (adminLinkEl) adminLinkEl.style.display = 'block';
    }

    window.addEventListener('storage', function(e) {
        if (e.key === 'transactions_last_update') {
            transactions = auth.loadUserData('transactions', []);
            updateDashboard();
            renderLine();
        }
    });

    try {
        if (window.BroadcastChannel) {
            window._finDashBC = window._finDashBC || new BroadcastChannel('fin-dash');
            window._finDashBC.onmessage = function(ev) {
                if (ev.data && ev.data.type === 'transactions:updated') {
                    transactions = auth.loadUserData('transactions', []);
                    updateDashboard();
                    renderLine();
                }
            };
        }
    } catch (err) { console.warn('BC listen failed', err); }
});

function clearAllUsersExceptAdmin() {
    if (confirm('Are you sure you want to delete ALL user accounts except the admin account? This action cannot be undone and will permanently remove all user data.')) {
        try {
            auth.clearAllUsersExceptAdmin();
            alert('All user accounts except admin have been deleted.');
            location.reload();
        } catch (error) {
            alert('Error deleting users: ' + error.message);
        }
    }
}

function logout() {
    auth.signOut();
    window.location.href = 'index.html';
}

// Run init after DOM is ready to ensure elements exist
document.addEventListener('DOMContentLoaded', init);