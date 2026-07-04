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

    // 👉 ADDED PROTECTION HERE
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

    function showAuthMessage(message, type = 'info') {
        const authMessage = document.getElementById('auth-message');
        if (!authMessage) return;
        authMessage.textContent = message;
        authMessage.className = type === 'error'
            ? 'rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200'
            : type === 'success'
                ? 'rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200'
                : 'rounded-xl border border-slate-700/80 bg-slate-950/70 px-3 py-2 text-sm text-slate-300';
        authMessage.classList.remove('hidden');
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

        document.getElementById('hand-cash-display').innerText = formatCurrency(state.handCash);
        document.getElementById('metric-total-balance').innerText = formatCurrency(totalBalance);
        const formulaElement = document.getElementById('metric-balance-formula');
        if (formulaElement) {
            formulaElement.innerText = `Income ${formatCurrency(totalIncome)} - Expenses ${formatCurrency(totalExpenses)} - Lent ${formatCurrency(totalLent)} + Borrowed ${formatCurrency(totalBorrowed)} = ${formatCurrency(totalBalance)}`;
        }
        document.getElementById('metric-monthly-income').innerText = formatCurrency(totalIncome);
        document.getElementById('metric-monthly-expenses').innerText = formatCurrency(totalExpenses);

        const balanceCard = document.getElementById('metric-balance-card');
        if (totalBalance < 0) {
            balanceCard.className = 'p-6 rounded-2xl border transition-all duration-200 bg-rose-500/10 border-rose-500/30 shadow-sm';
        } else {
            balanceCard.className = 'p-6 rounded-2xl border transition-all duration-200 bg-slate-900 border-slate-800 dark:bg-slate-900 dark:border-slate-800 light:bg-white light:border-slate-200 shadow-sm';
        }

        const tableBody = document.getElementById('transaction-table-rows');
        tableBody.innerHTML = '';
        const sortedTx = [...state.transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

        if (sortedTx.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="py-8 text-center text-xs text-slate-500 font-medium tracking-wide">No transactions matched across active storage pipelines.</td></tr>';
        } else {
            sortedTx.forEach(t => {
                const parsedDate = parseTransactionDate(t.date);
                const displayDate = parsedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const isIncome = t.type === 'income';

                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-800/20 dark:hover:bg-slate-800/20 light:hover:bg-slate-50/80 transition-colors';
                tr.innerHTML = `
                    <td class="py-3.5 pr-2 font-medium text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 whitespace-nowrap">${displayDate}</td>
                    <td class="py-3.5 px-2 font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 max-w-xs truncate" title="${t.description}">${t.description}</td>
                    <td class="py-3.5 px-2 text-xs"><span class="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 dark:bg-slate-800 light:bg-slate-100 border border-slate-700/50 dark:border-slate-700/50 light:border-slate-300 text-slate-300 dark:text-slate-300 light:text-slate-600">${t.category}</span></td>
                    <td class="py-3.5 px-2 text-right font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}">${isIncome ? '+' : '-'}${formatCurrency(t.amount)}</td>
                    <td class="py-3.5 pl-2 text-center">
                        <button data-txid="${t.id}" class="delete-tx-btn p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex items-center justify-center mx-auto">
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }

        const goalsContainer = document.getElementById('goals-list-container');
        goalsContainer.innerHTML = '';

        if (state.goals.length === 0) {
            goalsContainer.innerHTML = '<p class="text-xs text-center text-slate-500 py-4">No active targets specified.</p>';
        } else {
            state.goals.forEach(g => {
                const rawPct = (g.current / g.target) * 100;
                const pct = Math.min(Math.round(rawPct), 100);

                const item = document.createElement('div');
                item.className = 'space-y-2 border-b border-slate-800/40 dark:border-slate-800/40 light:border-slate-100 pb-3 last:border-none last:pb-0';
                item.innerHTML = `
                    <div class="flex items-center justify-between text-sm">
                        <span class="font-semibold text-slate-200 dark:text-slate-200 light:text-slate-800 truncate max-w-[180px]" title="${g.name}">${g.name}</span>
                        <span class="text-xs font-bold text-teal-300">${pct}%</span>
                    </div>
                    <div class="w-full h-2 rounded-full bg-slate-950 dark:bg-slate-950 light:bg-slate-100 overflow-hidden border border-slate-800/40 dark:border-slate-800/40 light:border-slate-200">
                        <div class="h-full gradient-progress rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                    <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-400 light:text-slate-500">
                        <span>${formatCurrency(g.current)} of <span class="font-semibold">${formatCurrency(g.target)}</span></span>
                        <button data-goalid="${g.id}" class="delete-goal-btn text-slate-500 hover:text-rose-400 transition-colors">Delete Target</button>
                    </div>
                `;
                goalsContainer.appendChild(item);
            });
        }

        const lentContainer = document.getElementById('lent-list-container');
        const borrowedContainer = document.getElementById('borrowed-list-container');

        lentContainer.innerHTML = '';
        borrowedContainer.innerHTML = '';

        const activeLent = state.debts.filter(d => d.type === 'lent');
        const activeBorrowed = state.debts.filter(d => d.type === 'borrowed');

        if (activeLent.length === 0) {
            lentContainer.innerHTML = '<p class="text-xs text-center text-slate-500 py-6">No assets lent out across active clusters.</p>';
        } else {
            activeLent.forEach(d => {
                const row = document.createElement('div');
                row.className = `p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${d.settled ? 'bg-slate-950/20 dark:bg-slate-950/20 light:bg-slate-50/50 border-slate-800/40 opacity-50' : 'bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border-slate-800 dark:border-slate-800 light:border-slate-200'}`;
                row.innerHTML = `
                    <div>
                        <div class="flex items-center space-x-2">
                            <h4 class="text-sm font-bold text-slate-200 dark:text-slate-200 light:text-slate-800">${d.entityName}</h4>
                            ${d.settled ? '<span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Settled</span>' : ''}
                        </div>
                        <p class="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 truncate max-w-[200px]">${d.email}</p>
                        <span class="text-[10px] text-slate-500 block mt-0.5">${parseTransactionDate(d.date).toLocaleDateString()}</span>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end space-x-4">
                        <span class="text-base font-bold text-emerald-400">${formatCurrency(d.amount)}</span>
                        ${!d.settled ? `<button data-debtid="${d.id}" class="settle-debt-btn px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500 text-teal-300 hover:text-white border border-teal-500/20 text-xs font-semibold transition-all">Settle</button>` : `<button data-debtid="${d.id}" class="purge-debt-btn text-xs font-semibold text-slate-500 hover:text-rose-400 transition-colors">Clear</button>`}
                    </div>
                `;
                lentContainer.appendChild(row);
            });
        }

        if (activeBorrowed.length === 0) {
            borrowedContainer.innerHTML = '<p class="text-xs text-center text-slate-500 py-6">No outstanding liabilities discovered.</p>';
        } else {
            activeBorrowed.forEach(d => {
                const row = document.createElement('div');
                row.className = `p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${d.settled ? 'bg-slate-950/20 dark:bg-slate-950/20 light:bg-slate-50/50 border-slate-800/40 opacity-50' : 'bg-slate-950 dark:bg-slate-950 light:bg-slate-50 border-slate-800 dark:border-slate-800 light:border-slate-200'}`;
                row.innerHTML = `
                    <div>
                        <div class="flex items-center space-x-2">
                            <h4 class="text-sm font-bold text-slate-200 dark:text-slate-200 light:text-slate-800">${d.entityName}</h4>
                            ${d.settled ? '<span class="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Settled</span>' : ''}
                        </div>
                        <p class="text-xs text-slate-400 dark:text-slate-400 light:text-slate-500 truncate max-w-[200px]">${d.email}</p>
                        <span class="text-[10px] text-slate-500 block mt-0.5">${parseTransactionDate(d.date).toLocaleDateString()}</span>
                    </div>
                    <div class="flex items-center justify-between sm:justify-end space-x-4">
                        <span class="text-base font-bold text-rose-400">${formatCurrency(d.amount)}</span>
                        ${!d.settled ? `<button data-debtid="${d.id}" class="settle-debt-btn px-2.5 py-1 rounded bg-teal-500/10 hover:bg-teal-500 text-teal-300 hover:text-white border border-teal-500/20 text-xs font-semibold transition-all">Settle</button>` : `<button data-debtid="${d.id}" class="purge-debt-btn text-xs font-semibold text-slate-500 hover:text-rose-400 transition-colors">Clear</button>`}
                    </div>
                `;
                borrowedContainer.appendChild(row);
            });
        }

        const categoryDropdown = document.getElementById('tx-category');
        categoryDropdown.innerHTML = '';
        state.categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            categoryDropdown.appendChild(opt);
        });

        rebuildAnalyticsSummary();
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
            document.getElementById(triggerId).addEventListener('click', function() {
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
                document.getElementById(tabsMap[triggerId]).classList.remove('hidden');
                document.getElementById(tabsMap[triggerId]).classList.add('block');

                if (triggerId === 'tab-trigger-analytics') {
                    rebuildAnalyticsSummary();
                }
            });
        });

        document.getElementById('theme-toggle-btn').addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            saveState();
        });

        document.getElementById('reset-data-btn').addEventListener('click', () => {
            if (confirm('Confirm deletion of all entries and reset the balance to zero?')) {
                state.transactions = [];
                state.goals = [];
                state.debts = [];
                state.handCash = 0;
                saveState();
            }
        });

        document.querySelectorAll('.modal-close-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                closeModal(this.getAttribute('data-modal'));
            });
        });

        document.getElementById('auth-toggle-btn').addEventListener('click', () => {
            if (activeSession?.user) {
                void handleLogout();
            } else {
                document.getElementById('auth-form').reset();
                setAuthMode('signin');
                openModal('auth-modal');
            }
        });

        const deleteAccountBtn = document.getElementById('delete-account-btn');
        if (deleteAccountBtn) {
            deleteAccountBtn.addEventListener('click', async () => {
                await deleteAccountData();
            });
        }

        document.getElementById('auth-switch-btn').addEventListener('click', () => {
            setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
        });

        document.getElementById('auth-form').addEventListener('submit', handleAuthSubmit);

        document.getElementById('quick-add-btn').addEventListener('click', () => {
            document.getElementById('tx-date').value = new Date().toISOString().split('T')[0];
            openModal('transaction-modal');
        });

        document.getElementById('hand-cash-widget').addEventListener('click', () => {
            document.getElementById('hand-cash-modal-input').value = state.handCash;
            openModal('hand-cash-edit-modal');
        });

        document.getElementById('hand-cash-modal-save-btn').addEventListener('click', () => {
            const inputVal = parseFloat(document.getElementById('hand-cash-modal-input').value);
            if (!isNaN(inputVal) && inputVal >= 0) {
                state.handCash = inputVal;
                closeModal('hand-cash-edit-modal');
                saveState();
            } else {
                alert('Invalid parameters specified.');
            }
        });

        document.getElementById('add-custom-category-btn').addEventListener('click', () => {
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

        document.getElementById('add-goal-trigger-btn').addEventListener('click', () => {
            document.getElementById('goal-form').reset();
            openModal('goal-modal');
        });

        document.getElementById('lending-modal-trigger-btn').addEventListener('click', () => {
            document.getElementById('lending-form').reset();
            document.getElementById('lend-date').value = new Date().toISOString().split('T')[0];
            openModal('lending-modal');
        });

        document.getElementById('type-btn-expense').addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/30 transition-all focus:outline-none';
            document.getElementById('type-btn-income').className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            document.getElementById('tx-type').value = 'expense';
        });
        document.getElementById('type-btn-income').addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 transition-all focus:outline-none';
            document.getElementById('type-btn-expense').className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            document.getElementById('tx-type').value = 'income';
        });

        document.getElementById('lend-type-btn-lent').addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 transition-all focus:outline-none';
            document.getElementById('lend-type-btn-borrowed').className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            document.getElementById('lend-type').value = 'lent';
        });
        document.getElementById('lend-type-btn-borrowed').addEventListener('click', function() {
            this.className = 'py-2 text-sm font-semibold rounded-lg text-rose-400 bg-rose-500/10 border border-rose-500/30 transition-all focus:outline-none';
            document.getElementById('lend-type-btn-lent').className = 'py-2 text-sm font-semibold rounded-lg text-slate-400 hover:text-slate-200 focus:outline-none transition-all';
            document.getElementById('lend-type').value = 'borrowed';
        });

        document.getElementById('transaction-form').addEventListener('submit', function(e) {
            e.preventDefault();

            const newTx = {
                id: 'tx-' + Date.now(),
                date: document.getElementById('tx-date').value,
                description: document.getElementById('tx-description').value.trim(),
                category: document.getElementById('tx-category').value,
                amount: Math.abs(parseFloat(document.getElementById('tx-amount').value)),
                type: document.getElementById('tx-type').value
            };

            state.transactions.push(newTx);
            closeModal('transaction-modal');
            this.reset();
            saveState();
        });

        document.getElementById('goal-form').addEventListener('submit', function(e) {
            e.preventDefault();

            const newGoal = {
                id: 'goal-' + Date.now(),
                name: document.getElementById('goal-name').value.trim(),
                target: Math.abs(parseInt(document.getElementById('goal-target').value, 10)),
                current: Math.abs(parseInt(document.getElementById('goal-current').value, 10)),
                date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };

            state.goals.push(newGoal);
            closeModal('goal-modal');
            this.reset();
            saveState();
        });

        document.getElementById('lending-form').addEventListener('submit', function(e) {
            e.preventDefault();

            const newAgreement = {
                id: 'debt-' + Date.now(),
                date: document.getElementById('lend-date').value,
                entityName: document.getElementById('lend-entity').value.trim(),
                email: document.getElementById('lend-email').value.trim(),
                amount: Math.abs(parseFloat(document.getElementById('lend-amount').value)),
                type: document.getElementById('lend-type').value,
                settled: false
            };

            state.debts.push(newAgreement);
            closeModal('lending-modal');
            this.reset();
            saveState();
        });

        document.getElementById('transaction-table-rows').addEventListener('click', function(e) {
            const btn = e.target.closest('.delete-tx-btn');
            if (btn) {
                const id = btn.getAttribute('data-txid');
                state.transactions = state.transactions.filter(t => t.id !== id);
                saveState();
            }
        });

        document.getElementById('goals-list-container').addEventListener('click', function(e) {
            const btn = e.target.closest('.delete-goal-btn');
            if (btn) {
                const id = btn.getAttribute('data-goalid');
                state.goals = state.goals.filter(g => g.id !== id);
                saveState();
            }
        });

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

        document.getElementById('lent-list-container').addEventListener('click', handleLendingInteractions);
        document.getElementById('borrowed-list-container').addEventListener('click', handleLendingInteractions);
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
