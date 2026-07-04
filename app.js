tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                slate: { 950: '#020617', 900: '#0f172a', 800: '#1e293b', 700: '#334155' }
            }
        }
    }
};

const SUPABASE_URL = 'https://ccxunwraeilwugijcdel.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjeHVud3JhZWlsd3VnaWpjZGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5OTA3NDgsImV4cCI6MjA5ODU2Njc0OH0.RhUzQvRnvaa71SE54TDYxV-Cn-tZhzPdWhifZKiqLfI';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

(function() {
    'use strict';

    const DEFAULTS = {
        transactions: [
            { id: 'tx-101', date: '2026-05-28', description: 'Invoiced - UI Design Consulting Portfolio', category: 'Consulting Inflow', amount: 6450.00, type: 'income' },
            { id: 'tx-102', date: '2026-06-01', description: 'AWS Cloud Scale Production Node Multi-Cluster Cluster Cluster Cluster', category: 'Infrastructure', amount: 1420.50, type: 'expense' },
            { id: 'tx-103', date: '2026-06-02', description: 'Premium Workspace Rental Elite Suite Lease', category: 'Office Overhead', amount: 850.00, type: 'expense' },
            { id: 'tx-104', date: '2026-06-03', description: 'High-Performance Workstation Hardware Hardware Upgrade Bundle', category: 'Hardware Equip', amount: 2400.00, type: 'expense' },
            { id: 'tx-105', date: '2026-06-04', description: 'SaaS Enterprise Core Automation Stack License', category: 'Software Licensing', amount: 310.25, type: 'expense' },
            { id: 'tx-106', date: '2026-06-05', description: 'Bi-Weekly Fractional Growth Executive Dividend Distribution', category: 'Investment Yield', amount: 3200.00, type: 'income' }
        ],
        goals: [
            { id: 'goal-201', name: 'High-Performance Developer Core Stack Upgrade', target: 8000, current: 5400, date: '2026-09-01' },
            { id: 'goal-202', name: 'Strategic Discretionary Liquid Runway Fund', target: 25000, current: 18450, date: '2027-01-15' }
        ],
        debts: [
            { id: 'debt-301', date: '2026-05-10', entityName: 'Nexus Systems Labs Inc', email: 'procurement@nexus-labs.io', amount: 4500.00, type: 'lent', settled: false },
            { id: 'debt-302', date: '2026-05-22', entityName: 'Principal Venture Synergy Syndicate', email: 'capital@pv-syndicate.net', amount: 12000.00, type: 'borrowed', settled: false }
        ],
        handCash: 1250.00,
        categories: ['Consulting Inflow', 'Investment Yield', 'Infrastructure', 'Office Overhead', 'Hardware Equip', 'Software Licensing', 'Discretionary Spending'],
        theme: 'dark'
    };

    let state = {};
    let chartInstance = null;
    let activeSession = null;
    let authMode = 'signin';

    function parseTransactionDate(dateStr) {
        if (!dateStr) return new Date();
        const elements = dateStr.split('-');
        if (elements.length === 3) {
            return new Date(parseInt(elements[0], 10), parseInt(elements[1], 10) - 1, parseInt(elements[2], 10));
        }
        return new Date(dateStr);
    }

    function getStorageKey() {
        return activeSession?.user?.id ? `COINFLOW_APP_STATE_${activeSession.user.id}` : 'COINFLOW_APP_STATE';
    }

    function normalizeState(candidate = {}) {
        return {
            transactions: Array.isArray(candidate.transactions) ? candidate.transactions : [],
            goals: Array.isArray(candidate.goals) ? candidate.goals : [],
            debts: Array.isArray(candidate.debts) ? candidate.debts : [],
            categories: Array.isArray(candidate.categories) && candidate.categories.length ? candidate.categories : [...DEFAULTS.categories],
            handCash: typeof candidate.handCash === 'number' ? candidate.handCash : DEFAULTS.handCash,
            theme: candidate.theme === 'light' ? 'light' : 'dark'
        };
    }

    function persistLocalState() {
        localStorage.setItem(getStorageKey(), JSON.stringify(state));
    }

    function saveState() {
        persistLocalState();
        renderUI();
        if (activeSession?.user && supabase) {
            void syncToSupabase();
        }
    }

    function isValidAppState(candidate) {
        return candidate
            && Array.isArray(candidate.transactions)
            && Array.isArray(candidate.goals)
            && Array.isArray(candidate.debts)
            && Array.isArray(candidate.categories)
            && typeof candidate.handCash === 'number'
            && (candidate.theme === 'dark' || candidate.theme === 'light');
    }

    function initializeAndHydrateState(forcePurge = false) {
        if (forcePurge) {
            localStorage.removeItem(getStorageKey());
        }

        const cached = localStorage.getItem(getStorageKey());
        if (cached && !forcePurge) {
            try {
                const parsed = JSON.parse(cached);
                if (!isValidAppState(parsed)) {
                    throw new Error('Corrupted schema detection state reset.');
                }
                state = normalizeState(parsed);
            } catch (e) {
                state = normalizeState(JSON.parse(JSON.stringify(DEFAULTS)));
            }
        } else {
            state = normalizeState(JSON.parse(JSON.stringify(DEFAULTS)));
        }

        applyTheme();
        renderUI();
    }

function updateAuthUI() {
    const authButton = document.getElementById('auth-toggle-btn');
    const authStatus = document.getElementById('auth-status-text');
    const connectedEmail = document.getElementById('connected-account-email');
    const greeting = document.getElementById('user-greeting');

    if (authButton) {
        authButton.textContent = activeSession?.user ? 'Logout' : 'Sign in';
        authButton.className = activeSession?.user
            ? 'px-3 py-2 rounded-lg border border-rose-500/30 bg-rose-500/10 text-sm font-semibold text-rose-200 hover:bg-rose-500/20 transition-all'
            : 'px-3 py-2 rounded-lg border border-slate-700/70 bg-slate-800/70 text-sm font-semibold text-slate-200 hover:bg-slate-700 transition-all';
    }

    if (authStatus) {
        authStatus.textContent = activeSession?.user ? 'Synced' : 'Guest mode';
        authStatus.className = activeSession?.user
            ? 'hidden sm:inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-300'
            : 'hidden sm:inline-flex items-center rounded-full border border-slate-700/70 bg-slate-800/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-300';
    }

    if (connectedEmail) {
        const emailLabel = activeSession?.user?.email || 'guest@local';
        connectedEmail.innerHTML = `<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block mr-1.5 animate-pulse"></span>Connected as: ${emailLabel}`;
    }

    if (greeting) {
        const shortName = activeSession?.user?.email?.split('@')[0] || 'Architect';
        greeting.textContent = activeSession?.user ? `Welcome back, ${shortName}` : 'Welcome back, Architect';
        greeting.classList.remove('hidden');
    }

    const deleteBtn = document.getElementById('delete-account-btn');
    if (deleteBtn) {
        if (activeSession?.user) {
            deleteBtn.classList.remove('hidden');
        } else {
            deleteBtn.classList.add('hidden');
        }
    }
}

    function setAuthMode(mode) {
        authMode = mode;
        const title = document.getElementById('auth-modal-title');
        const switchBtn = document.getElementById('auth-switch-btn');
        const submitBtn = document.getElementById('auth-submit-btn');
        if (title) {
            title.textContent = mode === 'signup' ? 'Create your CoinFlow account' : 'Sign in to CoinFlow';
        }
        if (switchBtn) {
            switchBtn.textContent = mode === 'signup' ? 'Back to sign in' : 'Create account';
        }
        if (submitBtn) {
            submitBtn.textContent = mode === 'signup' ? 'Create account' : 'Sign in';
        }
    }

    async function syncToSupabase() {
        if (!activeSession?.user || !supabase) return;
        const userId = activeSession.user.id;

        try {
            await supabase.from('profiles').upsert({
                id: userId,
                email: activeSession.user.email,
                handCash: state.handCash,
                theme: state.theme,
                categories: state.categories
            }, { onConflict: 'id' });

            await supabase.from('transactions').delete().eq('user_id', userId);
            if (state.transactions.length) {
                await supabase.from('transactions').insert(state.transactions.map(tx => ({ ...tx, user_id: userId })));
            }

            await supabase.from('goals').delete().eq('user_id', userId);
            if (state.goals.length) {
                await supabase.from('goals').insert(state.goals.map(goal => ({ ...goal, user_id: userId })));
            }

            await supabase.from('debts').delete().eq('user_id', userId);
            if (state.debts.length) {
                await supabase.from('debts').insert(state.debts.map(debt => ({ ...debt, user_id: userId })));
            }
        } catch (error) {
            console.error('Supabase sync failed:', error);
        }
    }

    async function loadRemoteState() {
        if (!activeSession?.user || !supabase) {
            return;
        }

        try {
            const userId = activeSession.user.id;
            const [{ data: profileData, error: profileError }, { data: txData, error: txError }, { data: goalData, error: goalError }, { data: debtData, error: debtError }] = await Promise.all([
                supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
                supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
                supabase.from('goals').select('*').eq('user_id', userId).order('date', { ascending: false }),
                supabase.from('debts').select('*').eq('user_id', userId).order('date', { ascending: false })
            ]);

            if (profileError || txError || goalError || debtError) {
                throw new Error('Your Supabase tables are not ready yet. The app is using local data until the schema is created.');
            }

            if (!profileData) {
                await supabase.from('profiles').upsert({ id: userId, email: activeSession.user.email, handCash: state.handCash, theme: state.theme, categories: state.categories }, { onConflict: 'id' });
            }

            state = normalizeState({
                transactions: (txData || []).map(item => ({ ...item, id: item.id })),
                goals: (goalData || []).map(item => ({ ...item, id: item.id })),
                debts: (debtData || []).map(item => ({ ...item, id: item.id })),
                handCash: profileData?.handCash ?? state.handCash,
                theme: profileData?.theme ?? state.theme,
                categories: Array.isArray(profileData?.categories) && profileData.categories.length ? profileData.categories : state.categories
            });

            persistLocalState();
            applyTheme();
            renderUI();
            updateAuthUI();
        } catch (error) {
            console.error('Supabase load failed:', error);
            showAuthMessage(error.message || 'Supabase could not be reached. Local data is still available.', 'error');
        }
    }

    async function handleAuthSubmit(event) {
        event.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const password = document.getElementById('auth-password').value;
        const authForm = document.getElementById('auth-form');

        if (!email || !password) {
            showAuthMessage('Please enter both an email and a password.', 'error');
            return;
        }

        if (!supabase) {
            showAuthMessage('Supabase is not available in this browser session.', 'error');
            return;
        }

        try {
            showAuthMessage('Working...', 'info');
            const { data, error } = authMode === 'signup'
                ? await supabase.auth.signUp({ email, password })
                : await supabase.auth.signInWithPassword({ email, password });

            if (error) {
                throw error;
            }

            activeSession = data.session;
            updateAuthUI();
            closeModal('auth-modal');
            authForm.reset();
            if (activeSession?.user) {
                await loadRemoteState();
                showAuthMessage('Wallet synced to your account.', 'success');
            }
        } catch (error) {
            showAuthMessage(error.message || 'Authentication failed.', 'error');
        }
    }

    async function handleLogout() {
        if (!supabase) return;
        await supabase.auth.signOut();
        activeSession = null;
        updateAuthUI();
        initializeAndHydrateState();
    }

    async function deleteAccountData() {
        if (!supabase || !activeSession?.user) return;
        const userId = activeSession.user.id;
        if (!confirm('Delete your account data (profiles, transactions, goals, debts) from this project? This cannot be undone from the client.')) return;

        try {
            // Remove related rows
            await supabase.from('transactions').delete().eq('user_id', userId);
            await supabase.from('goals').delete().eq('user_id', userId);
            await supabase.from('debts').delete().eq('user_id', userId);
            await supabase.from('profiles').delete().eq('id', userId);

            // Sign out the user locally
            await supabase.auth.signOut();
            activeSession = null;
            updateAuthUI();
            initializeAndHydrateState();
            showAuthMessage('Account data removed from project. To fully delete the auth user, use the Supabase dashboard.', 'success');
        } catch (err) {
            console.error('Failed to delete account data:', err);
            showAuthMessage('Failed to delete account data. Check console for details.', 'error');
        }
    }

    function applyTheme() {
        const html = document.documentElement;
        const sunIcon = document.getElementById('theme-sun');
        const moonIcon = document.getElementById('theme-moon');

        if (state.theme === 'light') {
            html.classList.remove('dark');
            html.classList.add('light');
            sunIcon.classList.add('hidden');
            moonIcon.classList.remove('hidden');
        } else {
            html.classList.remove('light');
            html.classList.add('dark');
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        }
    }

    function formatCurrency(num) {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    }

    function renderUI() {
    let totalIncome = 0;
    let totalExpenses = 0;
    let totalLent = 0;
    let totalBorrowed = 0;

    state.transactions.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else if (t.type === 'expense') totalExpenses += t.amount;
    });

    state.debts.forEach(d => {
        if (d.settled) return;
        if (d.type === 'lent') totalLent += d.amount;
        else if (d.type === 'borrowed') totalBorrowed += d.amount;
    });

    const totalBalance = totalIncome - totalExpenses - totalLent + totalBorrowed;

    const handCashDisp = document.getElementById('hand-cash-display');
    if (handCashDisp) handCashDisp.innerText = formatCurrency(state.handCash);

    const totalBalDisp = document.getElementById('metric-total-balance');
    if (totalBalDisp) totalBalDisp.innerText = formatCurrency(totalBalance);

    const formulaElement = document.getElementById('metric-balance-formula');
    if (formulaElement) {
        formulaElement.innerText = `Income ${formatCurrency(totalIncome)} - Expenses ${formatCurrency(totalExpenses)} - Lent ${formatCurrency(totalLent)} + Borrowed ${formatCurrency(totalBorrowed)} = ${formatCurrency(totalBalance)}`;
    }

    const monthlyIncDisp = document.getElementById('metric-monthly-income');
    if (monthlyIncDisp) monthlyIncDisp.innerText = formatCurrency(totalIncome);

    const monthlyExpDisp = document.getElementById('metric-monthly-expenses');
    if (monthlyExpDisp) monthlyExpDisp.innerText = formatCurrency(totalExpenses);

    const balanceCard = document.getElementById('metric-balance-card');
    if (balanceCard) {
        if (totalBalance < 0) {
            balanceCard.className = 'p-6 rounded-2xl border transition-all duration-200 bg-rose-500/10 border-rose-500/30 shadow-sm';
        } else {
            balanceCard.className = 'p-6 rounded-2xl border transition-all duration-200 bg-slate-900 border-slate-800 dark:bg-slate-900 dark:border-slate-800 light:bg-white light:border-slate-200 shadow-sm';
        }
    }

    // --- RENDER TABLE LISTS ---
    const txRows = document.getElementById('transaction-table-rows');
    if (txRows) {
        txRows.innerHTML = '';
        if (state.transactions.length === 0) {
            txRows.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-sm text-slate-500">No transactions recorded in current context database.</td></tr>`;
        } else {
            [...state.transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(t => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-slate-800/50 dark:border-slate-800/50 light:border-slate-100 hover:bg-slate-800/20 transition-colors';
                
                const typeBadge = t.type === 'income' 
                    ? '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Inflow</span>'
                    : '<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">Outflow</span>';
                
                const amtClass = t.type === 'income' ? 'text-emerald-400 font-semibold' : 'text-slate-200 dark:text-slate-200 light:text-slate-700';
                const amtPrefix = t.type === 'income' ? '+' : '-';

                tr.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-400">${t.date}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-200 dark:text-slate-200 light:text-slate-800 font-medium">${t.description}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm"><span class="px-2 py-1 rounded-md bg-slate-800 text-slate-400 text-xs">${t.category}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">${typeBadge}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm ${amtClass} text-right">${amtPrefix}${formatCurrency(t.amount)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button data-txid="${t.id}" class="delete-tx-btn text-slate-600 hover:text-rose-400 transition-colors p-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v4M4 7h16"></path></svg>
                        </button>
                    </td>
                `;
                txRows.appendChild(tr);
            });
        }
    }

    const goalsContainer = document.getElementById('goals-list-container');
    if (goalsContainer) {
        goalsContainer.innerHTML = '';
        if (state.goals.length === 0) {
            goalsContainer.innerHTML = `<div class="col-span-full p-6 text-center text-sm text-slate-500 border border-dashed border-slate-800 rounded-xl">Target allocation objectives empty.</div>`;
        } else {
            state.goals.forEach(g => {
                const progressPct = Math.min(100, Math.round((g.current / g.target) * 100));
                const card = document.createElement('div');
                card.className = 'p-5 rounded-xl border bg-slate-900 border-slate-800 dark:bg-slate-900 dark:border-slate-800 light:bg-white light:border-slate-200';
                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="text-sm font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800">${g.name}</h4>
                            <p class="text-xs text-slate-500">Target target limit window timeline constraint</p>
                        </div>
                        <button data-goalid="${g.id}" class="delete-goal-btn text-slate-600 hover:text-rose-400 transition-colors">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-16v4M4 7h16"></path></svg>
                        </button>
                    </div>
                    <div class="flex justify-between items-baseline text-xs text-slate-400 mb-2">
                        <span>${formatCurrency(g.current)} Saved</span>
                        <span class="font-bold text-slate-200">${progressPct}%</span>
                    </div>
                    <div class="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div class="bg-teal-400 h-1.5 rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
                    </div>
                    <div class="text-[11px] text-slate-500 mt-2 text-right">Goal target: ${formatCurrency(g.target)}</div>
                `;
                goalsContainer.appendChild(card);
            });
        }
    }

    const lentContainer = document.getElementById('lent-list-container');
    if (lentContainer) {
        lentContainer.innerHTML = '';
        const lentItems = state.debts.filter(d => d.type === 'lent');
        if (lentItems.length === 0) {
            lentContainer.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No active receivables.</p>';
        } else {
            lentItems.forEach(d => {
                const el = document.createElement('div');
                el.className = `p-4 rounded-xl border flex justify-between items-center ${d.settled ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900 border-slate-800'}`;
                el.innerHTML = `
                    <div>
                        <div class="font-semibold text-sm ${d.settled ? 'line-through text-slate-500' : 'text-slate-200'}">${d.entityName}</div>
                        <div class="text-xs text-slate-500">${d.date} • ${d.email || 'No email specified'}</div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-sm font-bold ${d.settled ? 'text-slate-500' : 'text-emerald-400'}">${formatCurrency(d.amount)}</span>
                        <div class="flex space-x-1">
                            ${!d.settled ? `<button data-debtid="${d.id}" class="settle-debt-btn p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all text-xs">Settle</button>` : ''}
                            <button data-debtid="${d.id}" class="purge-debt-btn p-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-all text-xs">Purge</button>
                        </div>
                    </div>
                `;
                lentContainer.appendChild(el);
            });
        }
    }

    const borrowedContainer = document.getElementById('borrowed-list-container');
    if (borrowedContainer) {
        borrowedContainer.innerHTML = '';
        const borrowedItems = state.debts.filter(d => d.type === 'borrowed');
        if (borrowedItems.length === 0) {
            borrowedContainer.innerHTML = '<p class="text-sm text-slate-500 text-center py-4">No active accounts payable liabilities.</p>';
        } else {
            borrowedItems.forEach(d => {
                const el = document.createElement('div');
                el.className = `p-4 rounded-xl border flex justify-between items-center ${d.settled ? 'bg-slate-900/40 border-slate-800/40 opacity-50' : 'bg-slate-900 border-slate-800'}`;
                el.innerHTML = `
                    <div>
                        <div class="font-semibold text-sm ${d.settled ? 'line-through text-slate-500' : 'text-slate-200'}">${d.entityName}</div>
                        <div class="text-xs text-slate-500">${d.date} • ${d.email || 'No email specified'}</div>
                    </div>
                    <div class="flex items-center space-x-3">
                        <span class="text-sm font-bold ${d.settled ? 'text-slate-500' : 'text-rose-400'}">${formatCurrency(d.amount)}</span>
                        <div class="flex space-x-1">
                            ${!d.settled ? `<button data-debtid="${d.id}" class="settle-debt-btn p-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-all text-xs">Settle</button>` : ''}
                            <button data-debtid="${d.id}" class="purge-debt-btn p-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-all text-xs">Purge</button>
                        </div>
                    </div>
                `;
                borrowedContainer.appendChild(el);
            });
        }
    }

    populateCategorySelectors();
  function updateCharts() {
    const canvas = document.getElementById('analytics-canvas');
    
    // 👉 SAFE GUARD: If the chart canvas doesn't exist in the HTML layout, exit quietly instead of crashing!
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (window.myDashboardChart) {
        window.myDashboardChart.destroy();
    }

    let categoriesMap = {};
    state.transactions.filter(t => t.type === 'expense').forEach(t => {
        categoriesMap[t.category] = (categoriesMap[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(categoriesMap);
    const data = Object.values(categoriesMap);

    if (labels.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    window.myDashboardChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    'rgba(45, 212, 191, 0.6)',
                    'rgba(56, 189, 248, 0.6)',
                    'rgba(251, 113, 133, 0.6)',
                    'rgba(192, 132, 252, 0.6)',
                    'rgba(251, 146, 60, 0.6)'
                ],
                borderColor: [
                    '#2dd4bf', '#38bdf8', '#fb7185', '#c084fc', '#fb923c'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: state.theme === 'dark' ? '#94a3b8' : '#64748b' }
                }
            }
        }
    });
}
}

    function rebuildAnalyticsSummary() {
        const breakdownContainer = document.getElementById('analytics-breakdown-list');
        if (!breakdownContainer) return;
        breakdownContainer.innerHTML = '';

        const matrix = {};
        (Array.isArray(state.categories) ? state.categories : []).forEach(c => matrix[c] = 0);

        let totalExpenseVolume = 0;
        state.transactions.forEach(t => {
            if (t.type === 'expense') {
                if (matrix[t.category] !== undefined) {
                    matrix[t.category] += t.amount;
                } else {
                    matrix[t.category] = t.amount;
                }
                totalExpenseVolume += t.amount;
            }
        });

        const activeCategoriesWithData = [];
        const chartDataPayload = [];
        const chartLabelsPayload = [];

        Object.keys(matrix).forEach(cat => {
            const amt = matrix[cat];
            if (amt > 0 || state.categories.includes(cat)) {
                activeCategoriesWithData.push({ category: cat, amount: amt });
            }
            if (amt > 0) {
                chartDataPayload.push(amt);
                chartLabelsPayload.push(cat);
            }
        });

        if (totalExpenseVolume === 0) {
            breakdownContainer.innerHTML = '<p class="text-xs text-slate-500 text-center py-6">No data matrix coordinates mapping matching expenses.</p>';
        } else {
            activeCategoriesWithData.sort((a, b) => b.amount - a.amount).forEach(item => {
                const rowPct = totalExpenseVolume > 0 ? (item.amount / totalExpenseVolume) * 100 : 0;
                const block = document.createElement('div');
                block.className = 'flex items-center justify-between text-sm pb-2 border-b border-slate-800/20 dark:border-slate-800/20 light:border-slate-100 last:border-none';
                block.innerHTML = `
                    <div class="space-y-0.5">
                        <p class="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 text-xs">${item.category}</p>
                        <p class="text-[10px] text-slate-400 dark:text-slate-400 light:text-slate-500">${Math.round(rowPct)}% total allocation</p>
                    </div>
                    <span class="font-bold text-slate-100 dark:text-slate-100 light:text-slate-900">${formatCurrency(item.amount)}</span>
                `;
                breakdownContainer.appendChild(block);
            });
        }

        if (chartInstance) {
            chartInstance.destroy();
        }

        const chartElement = document.getElementById('analyticsChart');
        if (!chartElement || !chartElement.getContext) {
            return;
        }
        const ctx = chartElement.getContext('2d');

        if (chartDataPayload.length === 0) {
            chartLabelsPayload.push('No Active Expense Vectors');
            chartDataPayload.push(1);
        }

        const lightModeActive = state.theme === 'light';
        const gridTextColor = lightModeActive ? '#475569' : '#94a3b8';

        chartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: chartLabelsPayload,
                datasets: [{
                    data: chartDataPayload,
                    backgroundColor: ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#64748b'],
                    borderWidth: lightModeActive ? 2 : 3,
                    borderColor: lightModeActive ? '#ffffff' : '#0f172a',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            boxWidth: 12,
                            padding: 15,
                            font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
                            color: gridTextColor
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (totalExpenseVolume === 0) return ' No Logged Expenses';
                                return ` ${context.label}: ${formatCurrency(context.raw)}`;
                            }
                        }
                    }
                },
                cutout: '72%'
            }
        });
    }

    function openModal(id) {
        const target = document.getElementById(id);
        if (!target || !target.children[0]) return;
        target.classList.remove('hidden');
        setTimeout(() => {
            target.children[0].classList.remove('scale-95');
            target.children[0].classList.add('scale-100');
        }, 50);
    }

    function closeModal(id) {
        const target = document.getElementById(id);
        if (!target || !target.children[0]) return;
        target.children[0].classList.remove('scale-100');
        target.children[0].classList.add('scale-95');
        setTimeout(() => {
            target.classList.add('hidden');
        }, 150);
    }

function bindSystemEventDrivers() {
    const tabsMap = {
        'tab-trigger-dashboard': 'view-dashboard',
        'tab-trigger-analytics': 'view-analytics',
        'tab-trigger-lending': 'view-lending'
    };

    Object.keys(tabsMap).forEach(triggerId => {
        const triggerEl = document.getElementById(triggerId);
        if (!triggerEl) return;

        triggerEl.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('border-teal-400', 'text-teal-300', 'dark:text-teal-300');
                btn.classList.add('border-transparent', 'text-slate-400', 'dark:text-slate-400', 'light:text-slate-500');
            });
            document.querySelectorAll('.tab-pane').forEach(pane => {
                pane.classList.remove('block');
                pane.classList.add('hidden');
            });

            this.classList.add('border-teal-400', 'text-teal-300', 'dark:text-teal-300');
            this.classList.remove('border-transparent', 'text-slate-400');
            
            const targetPane = document.getElementById(tabsMap[triggerId]);
            if (targetPane) {
                targetPane.classList.remove('hidden');
                targetPane.classList.add('block');
            }

            if (triggerId === 'tab-trigger-analytics') {
                if (typeof rebuildAnalyticsSummary === 'function') {
                    rebuildAnalyticsSummary();
                }
            }
        });
    });

    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            saveState();
        });
    }

    const resetBtn = document.getElementById('reset-data-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm('Confirm deletion of all entries and reset the balance to zero?')) {
                state.transactions = [];
                state.goals = [];
                state.debts = [];
                state.handCash = 0;
                saveState();
            }
        });
    }

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            closeModal(this.getAttribute('data-modal'));
        });
    });

    const authToggleBtn = document.getElementById('auth-toggle-btn');
    if (authToggleBtn) {
        authToggleBtn.addEventListener('click', () => {
            if (activeSession?.user) {
                void handleLogout();
            } else {
                const authForm = document.getElementById('auth-form');
                if (authForm) authForm.reset();
                setAuthMode('signin');
                openModal('auth-modal');
            }
        });
    }

    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            await deleteAccountData();
        });
    }

    const authSwitchBtn = document.getElementById('auth-switch-btn');
    if (authSwitchBtn) {
        authSwitchBtn.addEventListener('click', () => {
            setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
        });
    }

    const authForm = document.getElementById('auth-form');
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    const quickAddBtn = document.getElementById('quick-add-btn');
    if (quickAddBtn) {
        quickAddBtn.addEventListener('click', () => {
            const txDate = document.getElementById('tx-date');
            if (txDate) txDate.value = new Date().toISOString().split('T')[0];
            openModal('transaction-modal');
        });
    }

    const handCashWidget = document.getElementById('hand-cash-widget');
    if (handCashWidget) {
        handCashWidget.addEventListener('click', () => {
            const cashInput = document.getElementById('hand-cash-modal-input');
            if (cashInput) cashInput.value = state.handCash;
            openModal('hand-cash-edit-modal');
        });
    }

    const handCashSaveBtn = document.getElementById('hand-cash-modal-save-btn');
    if (handCashSaveBtn) {
        handCashSaveBtn.addEventListener('click', () => {
            const cashInput = document.getElementById('hand-cash-modal-input');
            const inputVal = cashInput ? parseFloat(cashInput.value) : NaN;
            if (!isNaN(inputVal) && inputVal >= 0) {
                state.handCash = inputVal;
                closeModal('hand-cash-edit-modal');
                saveState();
            } else {
                alert('Invalid parameters specified.');
            }
        });
    }

    const addCategoryBtn = document.getElementById('add-custom-category-btn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            const targetName = prompt('Enter complete technical name designator for alternative unique categorization:');
            if (targetName && targetName.trim().length > 1) {
                const dynamicTrim = targetName.trim();
                if (!state.categories.includes(dynamicTrim)) {
                    state.categories.push(dynamicTrim);
                    saveState();
                } else {
                    alert('Classification identifier matrix conflicts exist.');
                }
            }
        });
    }

    const addGoalTriggerBtn = document.getElementById('add-goal-trigger-btn');
    if (addGoalTriggerBtn) {
        addGoalTriggerBtn.addEventListener('click', () => {
            const goalForm = document.getElementById('goal-form');
            if (goalForm) goalForm.reset();
            openModal('goal-modal');
        });
    }

    const lendingModalTriggerBtn = document.getElementById('lending-modal-trigger-btn');
    if (lendingModalTriggerBtn) {
        lendingModalTriggerBtn.addEventListener('click', () => {
            const lendingForm = document.getElementById('lending-form');
            if (lendingForm) lendingForm.reset();
            const lendDate = document.getElementById('lend-date');
            if (lendDate) lendDate.value = new Date().toISOString().split('T')[0];
            openModal('lending-modal');
        });
    }

    const typeBtnExpense = document.getElementById('type-btn-expense');
    if (typeBtnExpense) {
        typeBtnExpense.addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/30 transition-all focus:outline-none';
            const incomeBtn = document.getElementById('type-btn-income');
            if (incomeBtn) incomeBtn.className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            const txType = document.getElementById('tx-type');
            if (txType) txType.value = 'expense';
        });
    }

    const typeBtnIncome = document.getElementById('type-btn-income');
    if (typeBtnIncome) {
        typeBtnIncome.addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 transition-all focus:outline-none';
            const expenseBtn = document.getElementById('type-btn-expense');
            if (expenseBtn) expenseBtn.className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            const txType = document.getElementById('tx-type');
            if (txType) txType.value = 'income';
        });
    }

    const lendTypeBtnLent = document.getElementById('lend-type-btn-lent');
    if (lendTypeBtnLent) {
        lendTypeBtnLent.addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 transition-all focus:outline-none';
            const borrowedBtn = document.getElementById('lend-type-btn-borrowed');
            if (borrowedBtn) borrowedBtn.className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            const lendType = document.getElementById('lend-type');
            if (lendType) lendType.value = 'lent';
        });
    }

    const lendTypeBtnBorrowed = document.getElementById('lend-type-btn-borrowed');
    if (lendTypeBtnBorrowed) {
        lendTypeBtnBorrowed.addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/30 transition-all focus:outline-none';
            const lentBtn = document.getElementById('lend-type-btn-lent');
            if (lentBtn) lentBtn.className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            const lendType = document.getElementById('lend-type');
            if (lendType) lendType.value = 'borrowed';
        });
    }

    const transactionForm = document.getElementById('transaction-form');
    if (transactionForm) {
        transactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const txDate = document.getElementById('tx-date');
            const txDesc = document.getElementById('tx-description');
            const txCat = document.getElementById('tx-category');
            const txAmt = document.getElementById('tx-amount');
            const txType = document.getElementById('tx-type');

            const newTx = {
                id: 'tx-' + Date.now(),
                date: txDate ? txDate.value : new Date().toISOString().split('T')[0],
                description: txDesc ? txDesc.value.trim() : 'Unnamed Transaction',
                category: txCat ? txCat.value : 'General',
                amount: txAmt ? Math.abs(parseFloat(txAmt.value)) : 0,
                type: txType ? txType.value : 'expense'
            };
            state.transactions.push(newTx);
            closeModal('transaction-modal');
            this.reset();
            saveState();
        });
    }

    const goalForm = document.getElementById('goal-form');
    if (goalForm) {
        goalForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const gName = document.getElementById('goal-name');
            const gTarget = document.getElementById('goal-target');
            const gCurrent = document.getElementById('goal-current');

            const newGoal = {
                id: 'goal-' + Date.now(),
                name: gName ? gName.value.trim() : 'Goal Objective',
                target: gTarget ? Math.abs(parseInt(gTarget.value, 10)) : 100,
                current: gCurrent ? Math.abs(parseInt(gCurrent.value, 10)) : 0,
                date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            state.goals.push(newGoal);
            closeModal('goal-modal');
            this.reset();
            saveState();
        });
    }

    const lendingForm = document.getElementById('lending-form');
    if (lendingForm) {
        lendingForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const lDate = document.getElementById('lend-date');
            const lEntity = document.getElementById('lend-entity');
            const lEmail = document.getElementById('lend-email');
            const lAmount = document.getElementById('lend-amount');
            const lType = document.getElementById('lend-type');

            const newAgreement = {
                id: 'debt-' + Date.now(),
                date: lDate ? lDate.value : new Date().toISOString().split('T')[0],
                entityName: lEntity ? lEntity.value.trim() : 'Anonymous',
                email: lEmail ? lEmail.value.trim() : '',
                amount: lAmount ? Math.abs(parseFloat(lAmount.value)) : 0,
                type: lType ? lType.value : 'lent',
                settled: false
            };
            state.debts.push(newAgreement);
            closeModal('lending-modal');
            this.reset();
            saveState();
        });
    }

    const txRows = document.getElementById('transaction-table-rows');
    if (txRows) {
        txRows.addEventListener('click', function(e) {
            const btn = e.target.closest('.delete-tx-btn');
            if (btn) {
                const id = btn.getAttribute('data-txid');
                state.transactions = state.transactions.filter(t => t.id !== id);
                saveState();
            }
        });
    }

    const goalsContainer = document.getElementById('goals-list-container');
    if (goalsContainer) {
        goalsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.delete-goal-btn');
            if (btn) {
                const id = btn.getAttribute('data-goalid');
                state.goals = state.goals.filter(g => g.id !== id);
                saveState();
            }
        });
    }

    const handleLendingInteractions = function(e) {
        const settleBtn = e.target.closest('.settle-debt-btn');
        const purgeBtn = e.target.closest('.purge-debt-btn');

        if (settleBtn) {
            const id = settleBtn.getAttribute('data-debtid');
            const targetIndex = state.debts.findIndex(d => d.id === id);
            if (targetIndex !== -1) {
                state.debts[targetIndex].settled = true;
                saveState();
            }
        }
        if (purgeBtn) {
            const id = purgeBtn.getAttribute('data-debtid');
            state.debts = state.debts.filter(d => d.id !== id);
            saveState();
        }
    };

    const lentContainer = document.getElementById('lent-list-container');
    if (lentContainer) lentContainer.addEventListener('click', handleLendingInteractions);
    
    const borrowedContainer = document.getElementById('borrowed-list-container');
    if (borrowedContainer) borrowedContainer.addEventListener('click', handleLendingInteractions);
}
    function initializeAuth() {
        updateAuthUI();
        setAuthMode('signin');
        if (supabase) {
            void supabase.auth.getSession().then(({ data }) => {
                activeSession = data.session;
                updateAuthUI();
                if (activeSession?.user) {
                    void loadRemoteState();
                } else {
                    initializeAndHydrateState();
                }
            });

            supabase.auth.onAuthStateChange((_event, session) => {
                activeSession = session;
                updateAuthUI();
                if (activeSession?.user) {
                    void loadRemoteState();
                } else {
                    initializeAndHydrateState();
                }
            });
        } else {
            initializeAndHydrateState();
        }
    }

    function startApp() {
        initializeAndHydrateState();
        bindSystemEventDrivers();
        initializeAuth();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startApp);
    } else {
        startApp();
    }

    window.addEventListener('beforeunload', () => {
        saveState();
    });
})();
