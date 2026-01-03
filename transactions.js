if (!auth.isAuthenticated()) {
    window.location.href = 'index.html';
}

let transactions = auth.loadUserData('transactions', []);

// Sidebar toggle matching dashboard logic
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        sidebar.classList.toggle('open');
    } else {
        sidebar.classList.toggle('collapsed');
    }
}

function loadTable() {
    const tableBody = document.getElementById('fullTransactionTable');
    const searchTerm = document.getElementById('tableSearch').value.toLowerCase();
    tableBody.innerHTML = '';

    const filtered = transactions.filter(t =>
        (t.desc && t.desc.toLowerCase().includes(searchTerm)) ||
        (t.category && t.category.toLowerCase().includes(searchTerm))
    );

    filtered.forEach(t => {
        const isIncome = t.amount > 0;
        tableBody.innerHTML += `
            <tr>
                <td style="color: #8b8c95;">${new Date(t.date || t.id).toLocaleDateString()}</td>
                <td style="font-weight: 500;">${t.desc || t.category}</td>
                <td>${t.category}</td>
                <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${isIncome ? 'INCOME' : 'EXPENSE'}</span></td>
                <td style="font-weight:bold; color: ${isIncome ? 'var(--success)' : 'white'}">
                    ${isIncome ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}
                </td>
                <td style="text-align: right;">
                    <button class="delete-btn" style="background:none; border:1px solid #333; color:#8b8c95; padding:5px 10px; cursor:pointer; border-radius:5px;" onclick="deleteTransaction('${t.id}')">🗑 Delete</button>
                </td>
            </tr>
        `;
    });
}

function openModal(mode) {
    const modal = document.getElementById('expenseModal');
    const select = document.getElementById('transCategory');
    modal.style.display = 'flex';
    document.getElementById('transDate').valueAsDate = new Date();
    select.innerHTML = '';
    if (mode === 'income') {
        document.getElementById('modalTitle').innerText = "Add Income";
        select.innerHTML = '<option value="Income">Income</option>';
    } else {
        document.getElementById('modalTitle').innerText = "Add Expense";
        ['Food', 'Shopping', 'Bills', 'Rent', 'Utilities'].forEach(c => {
            select.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
}

function closeModal() { document.getElementById('expenseModal').style.display = 'none'; }

function deleteTransaction(id) {
    if (!confirm('Delete this record?')) return;
    // Use string comparison to be robust to persisted formats
    transactions = transactions.filter(t => String(t.id) !== String(id));
    saveAndNotify();
    loadTable();
}

document.getElementById('expenseForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const date = document.getElementById('transDate').value;
    const amt = parseFloat(document.getElementById('transAmount').value);
    const cat = document.getElementById('transCategory').value;
    const desc = document.getElementById('transDesc').value;
    const finalAmt = (cat === 'Income') ? amt : -amt;

    transactions.unshift({ id: Date.now(), date, desc, amount: finalAmt, category: cat });
    saveAndNotify();
    closeModal();
    loadTable();
});

function exportTransactionsPDF() {
    if (!transactions || transactions.length === 0) { alert('No transactions to export'); return; }

    function escapeHtml(str) { return String(str || '').replace(/[&<>\"']/g, function (m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]; }); }

    const rows = transactions.map(t => {
        const date = new Date(t.date || t.id).toLocaleDateString();
        const desc = escapeHtml(t.desc || '');
        const category = escapeHtml(t.category || '');
        const type = (t.amount > 0) ? 'INCOME' : 'EXPENSE';
        const amt = (t.amount > 0 ? '+' : '-') + '$' + Math.abs(t.amount).toFixed(2);
        return `<tr><td>${date}</td><td>${desc}</td><td>${category}</td><td>${type}</td><td style="text-align:right;">${amt}</td></tr>`;
    }).join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Transactions Export</title>
        <style>body{font-family: Arial, Helvetica, sans-serif; color:#222; padding:20px} h2{margin-bottom:6px} p{color:#555} table{width:100%;border-collapse:collapse;margin-top:12px} th,td{padding:8px;border:1px solid #ddd} th{background:#f6f6f6;text-align:left}</style>
        </head><body>
        <h2>Transactions History</h2>
        <p>Exported: ${new Date().toLocaleString()}</p>
        <table>
            <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th style="text-align:right;">Amount</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        </body></html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Unable to open print window. Please allow popups for this site.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    // Wait briefly for styles to apply then invoke print
    setTimeout(() => { win.print(); win.close(); }, 500);

// Ensure admin link visibility and active state on this page
document.addEventListener('DOMContentLoaded', function() {
    // Show admin link for admins
    if (auth.isAdmin()) {
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.style.display = 'block';
    }

    // Reflect admin panel active state if requested
    const adminAnchor = document.querySelector('#admin-link a.nav-item');
    if (adminAnchor) {
        if (location.hash === '#admin' || sessionStorage.getItem('adminPanelOpen') === '1') {
            adminAnchor.classList.add('active');
        } else {
            adminAnchor.classList.remove('active');
        }
    }

    // Keep admin link visible and handle admin link clicks
    document.querySelectorAll('.nav-menu a.nav-item').forEach(a => {
        a.addEventListener('click', function (e) {
            const adminLink = document.getElementById('admin-link');
            if (auth.isAdmin() && adminLink) adminLink.style.display = 'block';

            if (this.closest('#admin-link')) {
                // Navigate to dashboard and open admin panel
                e.preventDefault();
                sessionStorage.setItem('adminPanelOpen', '1');
                window.location.href = 'dashboard.html#admin';
                return;
            }

            // Clear admin open flag when clicking other links
            sessionStorage.removeItem('adminPanelOpen');
        });
    });
});
}

function saveAndNotify() {
    try { auth.saveUserData('transactions', transactions); } catch (err) { console.error('Save failed', err); }
    // Broadcast via BroadcastChannel for other tabs/windows
    try {
        if (window.BroadcastChannel) {
            window._finDashBC = window._finDashBC || new BroadcastChannel('fin-dash');
            window._finDashBC.postMessage({ type: 'transactions:updated' });
        }
    } catch (e) { console.warn('Broadcast failed', e); }
    // Touch localStorage to trigger storage events in other windows
    try { localStorage.setItem('transactions_last_update', Date.now().toString()); } catch (e) {}
    // Dispatch a custom event for same-page listeners
    window.dispatchEvent(new Event('transactions:updated'));
}

function logout() {
    auth.signOut();
    window.location.href = 'index.html';
}

window.onload = loadTable;