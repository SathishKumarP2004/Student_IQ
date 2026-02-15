/* ═══════════════════════════════════════════════════
   STUDENTIQ — Premium Frontend Logic v2
   Toast · Export · Skeleton · Scroll Progress · Counters
   ═══════════════════════════════════════════════════ */

const API_BASE = '/api';

// ── State ────────────────────────────────────────────
let currentPage = 'dashboard';
let studentsPage = 1;
let chartInstances = {};

// ── Chart.js Dark Theme Defaults ─────────────────────
Chart.defaults.color = '#9898B0';
Chart.defaults.borderColor = 'rgba(255,255,255,0.04)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(17,17,25,0.95)';
Chart.defaults.plugins.tooltip.titleColor = '#F0F0F4';
Chart.defaults.plugins.tooltip.bodyColor = '#9898B0';
Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.plugins.tooltip.borderWidth = 1;
Chart.defaults.plugins.tooltip.cornerRadius = 8;
Chart.defaults.plugins.tooltip.padding = 10;
Chart.defaults.plugins.tooltip.titleFont = { weight: '700', size: 12, family: "'Inter'" };

// ── Feature Columns ──────────────────────────────────
const FEATURE_COLS = [
    'mean_attendance', 'std_attendance', 'mean_assignment', 'std_assignment',
    'mean_midterm', 'std_midterm', 'mean_final', 'std_final',
    'mean_gpa', 'std_gpa', 'gpa_range', 'mean_study_hours',
    'std_study_hours', 'max_gpa_drop', 'attendance_score_corr',
    'avg_extracurricular', 'has_part_time'
];

// ── Init ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupHamburger();
    setupUpload();
    setupManualForm();
    setupModal();
    setupScrollProgress();
    renderRequiredColumns();
    loadDashboard();
});

// ═══════════════════════════════════════════════════
// TOAST NOTIFICATION SYSTEM
// ═══════════════════════════════════════════════════

function showToast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    };

    toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// ═══════════════════════════════════════════════════
// SCROLL PROGRESS BAR
// ═══════════════════════════════════════════════════

function setupScrollProgress() {
    const bar = document.getElementById('scrollProgress');
    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const percent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        bar.style.width = percent + '%';
    });
}

// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════

function setupNavigation() {
    document.querySelectorAll('[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.dataset.page);
        });
    });
}

function navigateTo(page) {
    if (page === currentPage) return;

    const currentEl = document.getElementById(`page-${currentPage}`);
    if (currentEl) {
        currentEl.style.opacity = '0';
        currentEl.style.transform = 'translateY(8px)';
    }

    setTimeout(() => {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        document.querySelectorAll('.mobile-nav-link').forEach(l => l.classList.remove('active'));

        const target = document.getElementById(`page-${page}`);
        if (target) {
            target.classList.add('active');
            target.style.opacity = '0';
            target.style.transform = 'translateY(14px)';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    target.style.transition = 'opacity 0.35s cubic-bezier(0.4,0,0.2,1), transform 0.35s cubic-bezier(0.4,0,0.2,1)';
                    target.style.opacity = '1';
                    target.style.transform = 'translateY(0)';
                });
            });
        }

        document.querySelectorAll(`.nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));
        document.querySelectorAll(`.mobile-nav-link[data-page="${page}"]`).forEach(l => l.classList.add('active'));

        currentPage = page;

        document.getElementById('mobileNav')?.classList.remove('open');
        document.getElementById('hamburger')?.classList.remove('open');

        if (page === 'dashboard') loadDashboard();
        if (page === 'students') loadStudents();
        if (page === 'models') loadModels();
        if (page === 'about') loadAbout();
    }, 120);

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function setupHamburger() {
    document.getElementById('hamburger')?.addEventListener('click', () => {
        document.getElementById('hamburger').classList.toggle('open');
        document.getElementById('mobileNav').classList.toggle('open');
    });
}

// ═══════════════════════════════════════════════════
// REQUIRED COLUMNS
// ═══════════════════════════════════════════════════

function renderRequiredColumns() {
    const container = document.getElementById('requiredColsList');
    if (!container) return;
    container.innerHTML = FEATURE_COLS.map(f =>
        `<span class="required-col-tag">${f}</span>`
    ).join('');
}

// ═══════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════

async function apiGet(endpoint) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`API Error: ${endpoint}`, err);
        showToast(`Failed to load data from ${endpoint}`, 'error');
        return null;
    }
}

async function apiPost(endpoint, data) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`API Error: ${endpoint}`, err);
        showToast('Request failed. Check backend connection.', 'error');
        return null;
    }
}

async function apiUpload(endpoint, formData) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            body: formData,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
    } catch (err) {
        console.error(`API Error: ${endpoint}`, err);
        showToast('Upload failed. Check backend connection.', 'error');
        return null;
    }
}

// ═══════════════════════════════════════════════════
// ANIMATED COUNTER
// ═══════════════════════════════════════════════════

function animateCounter(el, target, suffix = '') {
    if (!el) return;
    const isFloat = String(target).includes('.');
    const duration = 900;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = target * ease;
        el.textContent = isFloat ? current.toFixed(1) + suffix : Math.round(current) + suffix;
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

// ═══════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════

async function loadDashboard() {
    const data = await apiGet('/dataset/overview');
    if (!data) return;

    animateCounter(document.getElementById('totalStudents'), data.total_students);
    animateCounter(document.getElementById('inconsistentCount'), data.inconsistent_count);
    animateCounter(document.getElementById('consistentCount'), data.consistent_count);
    animateCounter(document.getElementById('inconsistentPct'), data.inconsistent_pct, '%');

    document.querySelectorAll('.stat-card').forEach((card, i) => {
        card.style.animationDelay = `${i * 0.08}s`;
    });

    renderDistributionChart(data);
    renderDepartmentChart(data);
    loadFeatureImportance();
}

function renderDistributionChart(data) {
    destroyChart('distributionChart');
    const ctx = document.getElementById('distributionChart').getContext('2d');
    chartInstances['distributionChart'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Consistent', 'Inconsistent'],
            datasets: [{
                data: [data.consistent_count, data.inconsistent_count],
                backgroundColor: ['rgba(52,211,153,0.75)', 'rgba(255,90,95,0.75)'],
                borderColor: '#111119',
                borderWidth: 3,
                hoverBackgroundColor: ['rgba(52,211,153,1)', 'rgba(255,90,95,1)'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { family: "'Inter'", weight: '600', size: 11 }, padding: 16, usePointStyle: true, pointStyleWidth: 10 }
                }
            },
            cutout: '65%',
            animation: { animateRotate: true, duration: 1000, easing: 'easeOutQuart' }
        }
    });
}

function renderDepartmentChart(data) {
    destroyChart('departmentChart');
    const ctx = document.getElementById('departmentChart').getContext('2d');
    const colors = [
        'rgba(108,99,255,0.7)', 'rgba(255,107,157,0.7)', 'rgba(255,203,69,0.7)',
        'rgba(52,211,153,0.7)', 'rgba(168,85,247,0.7)', 'rgba(251,146,60,0.7)',
        'rgba(0,212,255,0.7)', 'rgba(236,72,153,0.7)'
    ];

    chartInstances['departmentChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.departments.map(d => d.name.length > 14 ? d.name.slice(0, 12) + '...' : d.name),
            datasets: [{
                label: 'Students',
                data: data.departments.map(d => d.count),
                backgroundColor: colors.slice(0, data.departments.length),
                borderColor: 'transparent',
                borderRadius: 5,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { font: { size: 10, weight: '600' } }, grid: { display: false }, border: { display: false } },
                y: { ticks: { font: { family: "'JetBrains Mono'", size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false } }
            },
            animation: { duration: 900, easing: 'easeOutQuart' }
        }
    });
}

async function loadFeatureImportance() {
    const data = await apiGet('/models/feature-importance');
    if (!data) return;

    destroyChart('featureChart');
    const features = Object.entries(data.feature_importance).sort((a, b) => b[1] - a[1]);
    const ctx = document.getElementById('featureChart').getContext('2d');

    const barColors = [
        'rgba(255,90,95,0.75)', 'rgba(255,107,157,0.75)', 'rgba(255,203,69,0.75)',
        'rgba(52,211,153,0.75)', 'rgba(108,99,255,0.75)', 'rgba(168,85,247,0.75)',
        'rgba(0,212,255,0.75)', 'rgba(251,146,60,0.75)'
    ];

    chartInstances['featureChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: features.map(f => formatFeatureName(f[0])),
            datasets: [{
                label: 'Importance',
                data: features.map(f => f[1]),
                backgroundColor: features.map((_, i) => barColors[i % barColors.length]),
                borderColor: 'transparent',
                borderRadius: 3,
                borderSkipped: false,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { font: { family: "'JetBrains Mono'", size: 10 } }, grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false } },
                y: { ticks: { font: { weight: '600', size: 10 } }, grid: { display: false }, border: { display: false } }
            },
            animation: { duration: 1100, easing: 'easeOutQuart', delay: (ctx) => ctx.dataIndex * 60 }
        }
    });
}

// ═══════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════

async function loadStudents() {
    const search = document.getElementById('searchInput')?.value || '';
    const filter = document.getElementById('filterSelect')?.value || '';
    const dept = document.getElementById('deptSelect')?.value || '';

    const params = new URLSearchParams({ page: studentsPage, per_page: 15, search, filter, department: dept });

    const data = await apiGet(`/students?${params}`);
    if (!data) return;

    renderStudentsTable(data);
    renderPagination(data);
    loadDepartmentOptions();
}

function renderStudentsTable(data) {
    const tbody = document.getElementById('studentsBody');
    if (!data.students.length) {
        tbody.innerHTML = `
            <tr><td colspan="7" style="text-align:center;padding:3rem;">
                <div style="color:var(--text-muted);font-size:0.92rem;">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 0.5rem;opacity:0.4"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    No students found matching your criteria
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = data.students.map((stu, idx) => {
        const pred = stu.prediction;
        const label = pred ? pred.label_text : '--';
        const badgeClass = pred ? (pred.label === 1 ? 'badge-inconsistent' : 'badge-consistent') : '';
        const confidence = pred ? (pred.confidence * 100).toFixed(1) + '%' : '--';
        const gpa = stu.latest_gpa ? stu.latest_gpa.toFixed(2) : '--';

        return `
            <tr style="animation: fadeUp 0.25s ease ${idx * 0.02}s backwards">
                <td><strong style="color:var(--blue)">${stu.student_id}</strong></td>
                <td>${stu.name}</td>
                <td style="color:var(--text-secondary)">${stu.department}</td>
                <td style="font-family:var(--font-mono);font-weight:600;color:var(--cyan)">${gpa}</td>
                <td><span class="badge ${badgeClass}">${label}</span></td>
                <td style="font-family:var(--font-mono);color:var(--text-secondary)">${confidence}</td>
                <td><button class="brutal-btn btn-primary btn-sm" onclick="viewStudent(${stu.id})">View</button></td>
            </tr>
        `;
    }).join('');
}

function renderPagination(data) {
    const container = document.getElementById('pagination');
    if (data.pages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    const start = Math.max(1, data.page - 3);
    const end = Math.min(data.pages, data.page + 3);

    if (data.page > 1) html += `<button class="page-btn" onclick="goToPage(${data.page - 1})">&#8249;</button>`;
    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === data.page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    if (data.page < data.pages) html += `<button class="page-btn" onclick="goToPage(${data.page + 1})">&#8250;</button>`;

    container.innerHTML = html;
}

function goToPage(page) { studentsPage = page; loadStudents(); }

async function loadDepartmentOptions() {
    const select = document.getElementById('deptSelect');
    if (select.options.length > 1) return;

    const data = await apiGet('/dataset/overview');
    if (!data) return;

    data.departments.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.name;
        opt.textContent = d.name;
        select.appendChild(opt);
    });
}

// Search & filter listeners
document.getElementById('searchInput')?.addEventListener('input', debounce(() => { studentsPage = 1; loadStudents(); }, 400));
document.getElementById('filterSelect')?.addEventListener('change', () => { studentsPage = 1; loadStudents(); });
document.getElementById('deptSelect')?.addEventListener('change', () => { studentsPage = 1; loadStudents(); });

// ═══════════════════════════════════════════════════
// CSV EXPORT
// ═══════════════════════════════════════════════════

async function exportStudents() {
    showToast('Preparing CSV export...', 'info');

    const data = await apiGet('/students?page=1&per_page=9999');
    if (!data || !data.students.length) {
        showToast('No data to export', 'error');
        return;
    }

    const headers = ['Student ID', 'Name', 'Department', 'Enrollment Year', 'Latest GPA', 'Prediction', 'Confidence'];
    const rows = data.students.map(s => [
        s.student_id,
        `"${s.name}"`,
        `"${s.department}"`,
        s.enrollment_year,
        s.latest_gpa || '',
        s.prediction ? s.prediction.label_text : '',
        s.prediction ? (s.prediction.confidence * 100).toFixed(1) + '%' : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studentiq_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast(`Exported ${data.students.length} students to CSV`, 'success');
}

// ═══════════════════════════════════════════════════
// STUDENT DETAIL MODAL
// ═══════════════════════════════════════════════════

function setupModal() {
    document.getElementById('modalClose')?.addEventListener('click', closeModal);
    document.getElementById('studentModal')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });
}

function closeModal() {
    const modal = document.getElementById('studentModal');
    const content = modal.querySelector('.modal-content');
    content.style.animation = 'modalSlideOut 0.2s ease forwards';
    setTimeout(() => {
        modal.classList.remove('open');
        content.style.animation = '';
    }, 200);
}

async function viewStudent(id) {
    const modal = document.getElementById('studentModal');
    const detail = document.getElementById('studentDetail');
    modal.classList.add('open');
    detail.innerHTML = '<div class="loading">Loading student data</div>';

    const data = await apiGet(`/students/${id}`);
    if (!data) {
        detail.innerHTML = '<div class="error-msg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Failed to load student data</div>';
        return;
    }

    const pred = data.predictions?.[0];
    const initials = data.name.split(' ').map(n => n[0]).join('').toUpperCase();
    const labelText = pred ? (pred.inconsistency_label === 1 ? 'Inconsistent' : 'Consistent') : '--';
    const badgeClass = pred ? (pred.inconsistency_label === 1 ? 'badge-inconsistent' : 'badge-consistent') : '';

    let html = `
        <div class="detail-header">
            <div class="detail-avatar">${initials}</div>
            <div>
                <div class="detail-name">${data.name}</div>
                <div class="detail-meta">${data.student_id} · ${data.department} · Enrolled ${data.enrollment_year}</div>
            </div>
            <span class="badge ${badgeClass}" style="margin-left:auto;font-size:0.82rem;padding:0.35rem 0.9rem;">${labelText}</span>
        </div>
    `;

    if (pred) {
        html += `
            <div class="detail-section">
                <h4>Prediction Details</h4>
                <p style="color:var(--text-secondary);font-size:0.88rem;"><strong style="color:var(--text)">Model:</strong> ${pred.model_name} · 
                   <strong style="color:var(--text)">Confidence:</strong> <span style="color:var(--cyan);font-family:var(--font-mono);font-weight:600">${(pred.confidence * 100).toFixed(1)}%</span></p>
            </div>
        `;
    }

    if (data.semesters?.length) {
        html += `
            <div class="detail-section">
                <h4>Semester Performance Trend</h4>
                <div class="detail-chart-wrap"><canvas id="semesterChart"></canvas></div>
            </div>
        `;
    }

    if (data.computed_features) {
        html += `
            <div class="detail-section">
                <h4>Computed Features</h4>
                <div class="detail-features-grid">
                    ${Object.entries(data.computed_features).map(([k, v]) => `
                        <div class="feature-item">
                            <span class="feat-name">${formatFeatureName(k)}</span>
                            <span class="feat-val">${typeof v === 'number' ? v.toFixed(2) : v}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (pred?.shap_values) {
        const shapEntries = Object.entries(pred.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
        const maxAbs = Math.max(...shapEntries.map(e => Math.abs(e[1])), 0.001);

        html += `
            <div class="detail-section">
                <h4>SHAP Explanation</h4>
                <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:0.6rem;">
                    <span style="color:var(--red);font-weight:700;">Red</span> = Pushes toward Inconsistent · 
                    <span style="color:var(--blue);font-weight:700;">Blue</span> = Pushes toward Consistent
                </p>
                <div class="shap-bars">
                    ${shapEntries.map(([feat, val]) => {
            const pct = Math.abs(val) / maxAbs * 45;
            const cls = val >= 0 ? 'positive' : 'negative';
            const style = val >= 0 ? `left:50%;width:${pct}%;` : `right:50%;width:${pct}%;`;
            return `
                            <div class="shap-bar-row">
                                <span class="shap-bar-label">${formatFeatureName(feat)}</span>
                                <div class="shap-bar-track">
                                    <div class="shap-bar-fill ${cls}" style="${style}"></div>
                                </div>
                                <span class="shap-bar-value">${val > 0 ? '+' : ''}${val.toFixed(3)}</span>
                            </div>
                        `;
        }).join('')}
                </div>
            </div>
        `;
    }

    detail.innerHTML = html;
    if (data.semesters?.length) setTimeout(() => renderSemesterChart(data.semesters), 30);
}

function renderSemesterChart(semesters) {
    destroyChart('semesterChart');
    const canvas = document.getElementById('semesterChart');
    if (!canvas) return;

    chartInstances['semesterChart'] = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: semesters.map(s => `Sem ${s.semester}`),
            datasets: [
                {
                    label: 'GPA',
                    data: semesters.map(s => s.gpa),
                    borderColor: '#6C63FF',
                    backgroundColor: 'rgba(108,99,255,0.06)',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y',
                    pointBackgroundColor: '#6C63FF',
                    pointBorderColor: '#111119',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                },
                {
                    label: 'Attendance %',
                    data: semesters.map(s => s.attendance_pct),
                    borderColor: '#34D399',
                    borderWidth: 2,
                    borderDash: [4, 4],
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#34D399',
                    pointBorderColor: '#111119',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                },
                {
                    label: 'Final Score',
                    data: semesters.map(s => s.final_score),
                    borderColor: '#FF5A5F',
                    borderWidth: 2,
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#FF5A5F',
                    pointBorderColor: '#111119',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { labels: { font: { size: 10, weight: '600' }, usePointStyle: true } }
            },
            scales: {
                y: { position: 'left', title: { display: true, text: 'GPA', font: { weight: '700', size: 10 }, color: '#6C63FF' }, border: { display: false }, grid: { color: 'rgba(255,255,255,0.03)' }, min: 0, max: 4 },
                y1: { position: 'right', title: { display: true, text: 'Score/%', font: { weight: '700', size: 10 } }, border: { display: false }, grid: { drawOnChartArea: false }, min: 0, max: 100 },
                x: { border: { display: false }, grid: { display: false }, ticks: { font: { weight: '600' } } }
            },
            animation: { duration: 800, easing: 'easeOutQuart' }
        }
    });
}

// ═══════════════════════════════════════════════════
// UPLOAD & PREDICT
// ═══════════════════════════════════════════════════

function setupUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('csvInput');
    if (!dropzone || !fileInput) return;

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) uploadCSV(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => { if (fileInput.files[0]) uploadCSV(fileInput.files[0]); });
}

async function uploadCSV(file) {
    const status = document.getElementById('uploadStatus');
    status.innerHTML = '<div class="loading">Analyzing your data</div>';
    showToast(`Uploading ${file.name}...`, 'info');

    const formData = new FormData();
    formData.append('file', file);

    const data = await apiUpload('/upload', formData);
    if (!data) {
        status.innerHTML = '<div class="error-msg"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>Upload failed. Check backend and CSV format.</div>';
        return;
    }

    if (data.error) {
        status.innerHTML = `<div class="error-msg">${data.error}</div>`;
        showToast(data.error, 'error');
        return;
    }

    status.innerHTML = '';
    showToast(`Analysis complete: ${data.summary.total} students processed`, 'success');
    renderBatchResults(data);
}

function renderBatchResults(data) {
    const area = document.getElementById('resultsArea');
    const container = document.getElementById('predictionResults');
    area.style.display = 'block';

    let html = `
        <div class="batch-summary">
            <div class="batch-stat" style="border-color:rgba(108,99,255,0.15);color:var(--blue);">Total: ${data.summary.total}</div>
            <div class="batch-stat" style="border-color:rgba(255,90,95,0.15);color:var(--red);">Inconsistent: ${data.summary.inconsistent}</div>
            <div class="batch-stat" style="border-color:rgba(52,211,153,0.15);color:var(--green);">Consistent: ${data.summary.consistent}</div>
        </div>
        <div class="table-card">
            <table class="brutal-table">
                <thead>
                    <tr>
                        <th>#</th>
                        ${data.results[0]?.student_id ? '<th>Student ID</th>' : ''}
                        <th>Prediction</th>
                        <th>Confidence</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.results.slice(0, 50).map(r => `
                        <tr>
                            <td>${r.index + 1}</td>
                            ${r.student_id ? `<td><strong style="color:var(--blue)">${r.student_id}</strong></td>` : ''}
                            <td><span class="badge ${r.prediction === 1 ? 'badge-inconsistent' : 'badge-consistent'}">${r.label}</span></td>
                            <td style="font-family:var(--font-mono);color:var(--text-secondary)">${(r.confidence * 100).toFixed(1)}%</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    if (data.results.length > 50) {
        html += `<p style="margin-top:0.75rem;color:var(--text-muted);font-size:0.82rem;">Showing first 50 of ${data.results.length} results.</p>`;
    }

    container.innerHTML = html;
}

function setupManualForm() {
    const form = document.getElementById('manualForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const payload = {};
        formData.forEach((val, key) => { payload[key] = parseFloat(val); });

        const area = document.getElementById('resultsArea');
        const container = document.getElementById('predictionResults');
        area.style.display = 'block';
        container.innerHTML = '<div class="loading">Running prediction</div>';
        showToast('Running ML prediction...', 'info');

        const data = await apiPost('/predict', payload);
        if (!data) {
            container.innerHTML = '<div class="error-msg">Prediction failed.</div>';
            return;
        }

        showToast('Prediction complete!', 'success');

        let html = '<div class="result-cards">';
        for (const [name, result] of Object.entries(data.predictions)) {
            const isInc = result.prediction === 1;
            const color = isInc ? 'var(--red)' : 'var(--green)';
            const borderColor = isInc ? 'rgba(255,90,95,0.15)' : 'rgba(52,211,153,0.15)';
            html += `
                <div class="result-card" style="border-color:${borderColor}">
                    <div class="result-model-name">${name}</div>
                    <div class="result-prediction" style="color:${color}">${result.label}</div>
                    <div class="result-confidence">Confidence: ${(result.confidence * 100).toFixed(1)}%</div>
                </div>
            `;
        }
        html += '</div>';

        if (data.shap_values) {
            const shapEntries = Object.entries(data.shap_values).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
            const maxAbs = Math.max(...shapEntries.map(e => Math.abs(e[1])), 0.001);

            html += `
                <div style="margin-top:1.25rem;">
                    <h4 style="margin-bottom:0.6rem;font-weight:800;font-size:0.95rem;">SHAP Explanation</h4>
                    <p style="color:var(--text-muted);font-size:0.78rem;margin-bottom:0.5rem;">
                        <span style="color:var(--red);font-weight:700;">Red</span> = Inconsistent · 
                        <span style="color:var(--blue);font-weight:700;">Blue</span> = Consistent
                    </p>
                    <div class="shap-bars">
                        ${shapEntries.map(([feat, val]) => {
                const pct = Math.abs(val) / maxAbs * 45;
                const cls = val >= 0 ? 'positive' : 'negative';
                const style = val >= 0 ? `left:50%;width:${pct}%;` : `right:50%;width:${pct}%;`;
                return `
                                <div class="shap-bar-row">
                                    <span class="shap-bar-label">${formatFeatureName(feat)}</span>
                                    <div class="shap-bar-track">
                                        <div class="shap-bar-fill ${cls}" style="${style}"></div>
                                    </div>
                                    <span class="shap-bar-value">${val > 0 ? '+' : ''}${val.toFixed(3)}</span>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;
        }

        container.innerHTML = html;
    });
}

// ═══════════════════════════════════════════════════
// MODELS PAGE
// ═══════════════════════════════════════════════════

async function loadModels() {
    const data = await apiGet('/models/performance');
    if (!data) return;

    renderModelCards(data.models);
    renderModelComparison(data.models);
    renderConfusionMatrices(data.models);
}

function renderModelCards(models) {
    document.getElementById('modelsGrid').innerHTML = models.map((m, idx) => `
        <div class="model-card" style="animation: fadeUp 0.4s ease ${idx * 0.08}s backwards">
            <div class="model-name">${m.model_name}</div>
            <div class="model-metrics">
                <div class="metric"><div class="metric-value">${(m.accuracy * 100).toFixed(1)}%</div><div class="metric-label">Accuracy</div></div>
                <div class="metric"><div class="metric-value">${(m.precision * 100).toFixed(1)}%</div><div class="metric-label">Precision</div></div>
                <div class="metric"><div class="metric-value">${(m.recall * 100).toFixed(1)}%</div><div class="metric-label">Recall</div></div>
                <div class="metric"><div class="metric-value">${(m.f1_score * 100).toFixed(1)}%</div><div class="metric-label">F1 Score</div></div>
            </div>
        </div>
    `).join('');
}

function renderModelComparison(models) {
    destroyChart('modelComparisonChart');
    const ctx = document.getElementById('modelComparisonChart').getContext('2d');
    chartInstances['modelComparisonChart'] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: models.map(m => m.model_name),
            datasets: [
                { label: 'Accuracy', data: models.map(m => (m.accuracy * 100).toFixed(1)), backgroundColor: 'rgba(108,99,255,0.7)', borderRadius: 5, borderSkipped: false, borderColor: 'transparent' },
                { label: 'Precision', data: models.map(m => (m.precision * 100).toFixed(1)), backgroundColor: 'rgba(52,211,153,0.7)', borderRadius: 5, borderSkipped: false, borderColor: 'transparent' },
                { label: 'Recall', data: models.map(m => (m.recall * 100).toFixed(1)), backgroundColor: 'rgba(255,203,69,0.7)', borderRadius: 5, borderSkipped: false, borderColor: 'transparent' },
                { label: 'F1 Score', data: models.map(m => (m.f1_score * 100).toFixed(1)), backgroundColor: 'rgba(255,90,95,0.7)', borderRadius: 5, borderSkipped: false, borderColor: 'transparent' },
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { font: { weight: '600', size: 11 }, usePointStyle: true } } },
            scales: {
                x: { ticks: { font: { weight: '600', size: 11 } }, grid: { display: false }, border: { display: false } },
                y: { max: 100, ticks: { font: { family: "'JetBrains Mono'", size: 10 }, callback: v => v + '%' }, grid: { color: 'rgba(255,255,255,0.03)' }, border: { display: false } }
            },
            animation: { duration: 900, easing: 'easeOutQuart' }
        }
    });
}

function renderConfusionMatrices(models) {
    document.getElementById('confusionGrid').innerHTML = models.filter(m => m.confusion_matrix).map((m, idx) => {
        const cm = m.confusion_matrix;
        return `
            <div class="confusion-card" style="animation: fadeUp 0.4s ease ${idx * 0.08}s backwards">
                <h4>${m.model_name}</h4>
                <table class="confusion-table">
                    <tr><th></th><th>Pred: Consistent</th><th>Pred: Inconsistent</th></tr>
                    <tr><th>Actual: Consistent</th><td class="cm-tn">${cm[0][0]}</td><td class="cm-fp">${cm[0][1]}</td></tr>
                    <tr><th>Actual: Inconsistent</th><td class="cm-fn">${cm[1][0]}</td><td class="cm-tp">${cm[1][1]}</td></tr>
                </table>
            </div>
        `;
    }).join('');
}

// ═══════════════════════════════════════════════════
// ABOUT PAGE
// ═══════════════════════════════════════════════════

function loadAbout() {
    const tags = document.getElementById('featureTags');
    if (tags && !tags.children.length) {
        tags.innerHTML = FEATURE_COLS.map(f =>
            `<span class="feature-tag">${formatFeatureName(f)}</span>`
        ).join('');
    }
}

// ═══════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════

function formatFeatureName(name) {
    return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        .replace('Pct', '%').replace('Std', 'Std Dev').replace('Avg', 'Average').replace('Corr', 'Correlation');
}

function destroyChart(id) {
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function debounce(fn, delay) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}
