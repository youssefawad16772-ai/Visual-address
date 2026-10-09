// Smart Address Egypt CRM - Frontend Controller
// Pure Vanilla ES6 + SheetJS + Chart.js

(function () {
  'use strict';

  // State Management
  const state = {
    currentPage: 'dashboard',
    currentWorkspaceTab: 'today',
    leads: [],
    selectedLeadIds: new Set(),
    activeLead: null,
    kpis: {},
    charts: {},
    chartInstances: {},
    settings: {},
    importData: {
      rawRows: [],
      rawHeaders: [],
      detectedMappings: {},
      fileName: '',
      previewResult: null
    }
  };

  // Standard CRM Field Definitions
  const STANDARD_FIELDS = [
    { key: 'full_name', label: 'اسم العميل (Full Name)', required: true },
    { key: 'phone_number', label: 'رقم الهاتف (Phone Number)', required: true },
    { key: 'choose_your_virtual_address_package_', label: 'الباقة المطلوبة (Package)', required: false },
    { key: 'when_do_you_want_to_start_', label: 'توقيت البدء (Start Timeline)', required: false },
    { key: 'email', label: 'البريد الإلكتروني (Email)', required: false },
    { key: 'job_title', label: 'المسمى الوظيفي (Job Title)', required: false },
    { key: 'fedback', label: 'الملاحظات والرد (Feedback)', required: false },
    { key: 'Lead Quality', label: 'جودة العميل (Lead Quality)', required: false },
    { key: 'lead_status', label: 'الحالة الأصلية (Lead Status)', required: false },
    { key: 'Next Action', label: 'الإجراء الأصلي (Next Action)', required: false },
    { key: 'campaign_name', label: 'اسم الحملة (Campaign Name)', required: false },
    { key: 'adset_name', label: 'المجموعة الإعلانية (Adset Name)', required: false },
    { key: 'ad_name', label: 'اسم الإعلان (Ad Name)', required: false },
    { key: 'platform', label: 'المنصة (Platform)', required: false },
    { key: 'inbox_url', label: 'رابط محادثة الإعلان (Inbox URL)', required: false },
    { key: 'id', label: 'معرف العميل الأصلي (Lead ID)', required: false },
    { key: 'created_time', label: 'تاريخ الإنشاء (Created Time)', required: false },
    { key: 'work_email', label: 'بريد العمل (Work Email)', required: false },
    { key: 'campaign_id', label: 'معرف الحملة (Campaign ID)', required: false },
    { key: 'adset_id', label: 'معرف المجموعة (Adset ID)', required: false },
    { key: 'ad_id', label: 'معرف الإعلان (Ad ID)', required: false },
    { key: 'form_name', label: 'اسم الاستمارة (Form Name)', required: false },
    { key: 'form_id', label: 'معرف الاستمارة (Form ID)', required: false }
  ];

  // Fuzzy Header Mapping
  function autoDetectField(headerName) {
    if (!headerName) return '';
    const clean = String(headerName).toLowerCase().trim().replace(/[\s\-_]+/g, '');

    if (clean === 'id' || clean === 'leadid') return 'id';
    if (clean.includes('fullname') || clean === 'name' || clean.includes('الاسم') || clean.includes('عميل')) return 'full_name';
    if (clean.includes('phone') || clean.includes('mobile') || clean.includes('هاتف') || clean.includes('موبايل') || clean.includes('تليفون')) return 'phone_number';
    if (clean.includes('virtualaddress') || clean.includes('package') || clean.includes('باقة') || clean.includes('عنوانافتراضي')) return 'choose_your_virtual_address_package_';
    if (clean.includes('start') || clean.includes('توقيت') || clean.includes('بدء') || clean.includes('موعد')) return 'when_do_you_want_to_start_';
    if (clean.includes('workemail')) return 'work_email';
    if (clean.includes('email') || clean.includes('بريد') || clean.includes('ايميل')) return 'email';
    if (clean.includes('job') || clean.includes('title') || clean.includes('وظيفة') || clean.includes('منصب')) return 'job_title';
    if (clean.includes('fedback') || clean.includes('feedback') || clean.includes('ملاحظ') || clean.includes('رد')) return 'fedback';
    if (clean.includes('quality') || clean.includes('جودة')) return 'Lead Quality';
    if (clean.includes('status') || clean.includes('حالة')) return 'lead_status';
    if (clean.includes('action') || clean.includes('إجراء') || clean.includes('اجراء')) return 'Next Action';
    if (clean.includes('campaignname') || clean.includes('حملة')) return 'campaign_name';
    if (clean.includes('campaignid')) return 'campaign_id';
    if (clean.includes('adsetname') || clean.includes('مجموعة')) return 'adset_name';
    if (clean.includes('adsetid')) return 'adset_id';
    if (clean.includes('adname') || clean.includes('إعلان') || clean.includes('اعلان')) return 'ad_name';
    if (clean.includes('adid')) return 'ad_id';
    if (clean.includes('platform') || clean.includes('منصة')) return 'platform';
    if (clean.includes('inbox') || clean.includes('messenger') || clean.includes('رسائل')) return 'inbox_url';
    if (clean.includes('created') || clean.includes('تاريخ')) return 'created_time';
    if (clean.includes('formname') || clean.includes('استمارة')) return 'form_name';
    if (clean.includes('formid')) return 'form_id';

    return '';
  }

  // Toast Notification Helper
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Determine API Base URL dynamically
  function getApiBaseUrl() {
    // If opened via file:// protocol
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3456';
    }
    // If running on a different port on localhost (e.g. Live Server on 5500, Vite on 5173, etc.)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      if (window.location.port !== '3456') {
        return 'http://localhost:3456';
      }
    }
    return '';
  }

  // Update UI Connection Status Indicator & Warning Banner
  function updateConnectionStatus(isConnected, customMsg = null) {
    const dot = document.getElementById('serverStatusDot');
    const text = document.getElementById('serverStatusText');
    const banner = document.getElementById('connectionErrorBanner');

    if (isConnected) {
      if (dot) {
        dot.style.background = 'var(--emerald)';
        dot.style.boxShadow = '0 0 8px var(--emerald)';
      }
      if (text) text.textContent = customMsg || 'النظام متصل (قاعدة بيانات حية)';
      if (banner) banner.style.display = 'none';
    } else {
      if (dot) {
        dot.style.background = 'var(--rose)';
        dot.style.boxShadow = '0 0 8px var(--rose)';
      }
      if (text) text.textContent = customMsg || 'الخادم غير متصل (يرجى تشغيل start_crm.bat)';
      if (banner) banner.style.display = 'flex';
    }
  }

  // Check Backend Health
  async function checkServerHealth() {
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/health`, { method: 'GET' });
      if (res.ok) {
        updateConnectionStatus(true);
        return true;
      }
    } catch {
      updateConnectionStatus(false);
    }
    return false;
  }

  // Robust API Call Helper
  async function api(path, options = {}) {
    const baseUrl = getApiBaseUrl();
    const fullUrl = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

    try {
      const res = await fetch(fullUrl, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `خطأ في الخادم (رمز ${res.status})`);
      }

      updateConnectionStatus(true);
      return await res.json();
    } catch (e) {
      console.error(`API Error on ${fullUrl}:`, e);

      const isNetworkError = e instanceof TypeError ||
        e.name === 'NetworkError' ||
        (e.message && (
          e.message.includes('NetworkError') ||
          e.message.includes('Failed to fetch') ||
          e.message.includes('Load failed')
        ));

      if (isNetworkError) {
        updateConnectionStatus(false);
        showToast('تعذر الاتصال بخادم CRM على المنفذ 3456. تأكد من تشغيل start_crm.bat', 'error');
      } else {
        showToast(e.message || 'حدث خطأ أثناء الاتصال بالخادم', 'error');
      }

      throw e;
    }
  }

  // Page Routing & Navigation
  function navigateTo(pageId, extraParam = null) {
    state.currentPage = pageId;

    // Update active nav link
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });

    // Update visibility of page sections
    document.querySelectorAll('.page-view').forEach(el => {
      el.style.display = 'none';
      el.classList.remove('active');
    });

    const activeView = document.getElementById(`page-${pageId}`);
    if (activeView) {
      activeView.style.display = 'block';
      activeView.classList.add('active');
    }

    // Update Titles
    const titles = {
      'dashboard': { title: 'نظرة عامة والتحليلات', subtitle: 'مؤشرات الأداء اللحظية لعملاء Smart Address Egypt' },
      'all-leads': { title: 'كل العملاء المحتملين', subtitle: 'إدارة وتصفية وتعديل بيانات العملاء وسجل المتابعات' },
      'today-followups': { title: 'متابعات اليوم والعمليات اليومية', subtitle: 'مكالمات المبيعات ذات الأولوية والمتابعات المستحقة' },
      'hot-leads': { title: 'العملاء الأكثر أولوية (Hot Leads)', subtitle: 'الفرص الأعلى تقييماً بنية شراء فورية (80 - 100)' },
      'future-opps': { title: 'الفرص المستقبلية (> 3 شهور)', subtitle: 'عملاء البدء في الربع القادم وباقات التأسيس المستقبلي' },
      'pipeline': { title: 'مراحل البيع (Pipeline)', subtitle: 'لوحة كانبان التفاعلية لإدارة مسار إغلاق الصفقات' },
      'campaigns': { title: 'تحليل أداء الحملات الإعلانية', subtitle: 'مقارنة جودة العملاء ومعدلات التحويل بين الحملات' },
      'import-center': { title: 'مركز استيراد ملفات Excel و CSV', subtitle: 'مطابقة ذكية للأعمدة، فحص التكرارات، وحفظ البيانات' },
      'archive': { title: 'أرشيف العملاء المستبعدين', subtitle: 'سجلات المتابعة الموقوفة مع أسباب الاستبعاد وإمكانية الاستعادة' },
      'settings': { title: 'الإعدادات وقواعد الذكاء الاصطناعي', subtitle: 'أوزان احتساب النقاط، حدود التنبيهات، والربط السحابي' }
    };

    if (titles[pageId]) {
      document.getElementById('currentPageTitle').textContent = titles[pageId].title;
      document.getElementById('currentPageSubtitle').textContent = titles[pageId].subtitle;
    }

    // Specific Page Loaders
    if (pageId === 'dashboard') loadDashboard();
    else if (pageId === 'all-leads') loadLeads();
    else if (pageId === 'today-followups') loadFollowupWorkspace(extraParam || state.currentWorkspaceTab);
    else if (pageId === 'hot-leads') loadHotLeads();
    else if (pageId === 'future-opps') loadFutureOpps();
    else if (pageId === 'pipeline') loadPipelineKanban();
    else if (pageId === 'campaigns') loadCampaignsReport();
    else if (pageId === 'import-center') loadImportHistory();
    else if (pageId === 'archive') loadArchive();
    else if (pageId === 'settings') loadSettings();

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Load Dashboard Data & Charts
  async function loadDashboard() {
    const data = await api('/api/dashboard/stats');
    state.kpis = data.kpis;
    state.charts = data.charts;

    // Update KPI UI
    document.getElementById('kpiValTotal').textContent = data.kpis.totalLeads;
    document.getElementById('kpiValHot').textContent = data.kpis.hotLeads;
    document.getElementById('kpiValWarm').textContent = data.kpis.warmLeads;
    document.getElementById('kpiValContactToday').textContent = data.kpis.contactToday;
    document.getElementById('kpiValOverdue').textContent = data.kpis.overdueFollowups;
    document.getElementById('kpiValNegotiation').textContent = data.kpis.inNegotiation;
    document.getElementById('kpiValWon').textContent = data.kpis.wonDeals;
    document.getElementById('kpiValConvRate').textContent = data.kpis.conversionRate;

    // Update Sidebar Badges
    document.getElementById('badgeTotalLeads').textContent = data.kpis.totalLeads;
    document.getElementById('badgeTodayFollowups').textContent = data.kpis.followupToday;
    document.getElementById('badgeHotLeads').textContent = data.kpis.hotLeads;

    // Render Charts
    renderCharts(data.charts);
  }

  function renderCharts(chartData) {
    // 1. CRM Status Chart (Doughnut)
    const ctxStatus = document.getElementById('chartStatus');
    if (ctxStatus) {
      if (state.chartInstances.status) state.chartInstances.status.destroy();

      const statusLabelsMap = {
        'contact_today': 'اتصال اليوم',
        'followup_today': 'متابعة اليوم',
        'contacted_awaiting': 'بانتظار الرد',
        'in_negotiation': 'تفاوض وعرض سعر',
        'future_opportunity': 'فرصة مستقبلية',
        'won': 'تم التعاقد 🏆',
        'not_interested': 'غير مهتم',
        'lost': 'فرصة ضائعة',
        'invalid_data': 'بيانات ناقصة',
        'cold_low': 'أولوية منخفضة'
      };

      const labels = chartData.byStatus.map(s => statusLabelsMap[s.crm_status] || s.crm_status);
      const counts = chartData.byStatus.map(s => s.count);
      const colors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#64748b', '#dc2626', '#eab308', '#94a3b8'];

      state.chartInstances.status = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: counts,
            backgroundColor: colors,
            borderColor: '#131c31',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#f8fafc', font: { family: 'Cairo', size: 11 } }
            }
          }
        }
      });
    }

    // 2. Lead Quality Bands Chart
    const ctxQuality = document.getElementById('chartQuality');
    if (ctxQuality) {
      if (state.chartInstances.quality) state.chartInstances.quality.destroy();

      const qMap = {
        'hot': { label: 'ساخن (80-100)', color: '#f59e0b' },
        'warm': { label: 'دافئ (60-79)', color: '#3b82f6' },
        'nurture': { label: 'تغذية (35-59)', color: '#06b6d4' },
        'low': { label: 'منخفض (0-34)', color: '#64748b' }
      };

      const qLabels = chartData.byQuality.map(q => qMap[q.lead_priority]?.label || q.lead_priority);
      const qCounts = chartData.byQuality.map(q => q.count);
      const qColors = chartData.byQuality.map(q => qMap[q.lead_priority]?.color || '#3b82f6');

      state.chartInstances.quality = new Chart(ctxQuality, {
        type: 'bar',
        data: {
          labels: qLabels,
          datasets: [{
            label: 'عدد العملاء',
            data: qCounts,
            backgroundColor: qColors,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { family: 'Cairo' } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', precision: 0 }, grid: { color: '#223150' } }
          }
        }
      });
    }

    // 3. Campaigns Performance Chart
    const ctxCmp = document.getElementById('chartCampaigns');
    if (ctxCmp) {
      if (state.chartInstances.campaigns) state.chartInstances.campaigns.destroy();

      const cmpNames = chartData.byCampaign.map(c => c.name.length > 22 ? c.name.substring(0, 22) + '...' : c.name);
      const cmpTotals = chartData.byCampaign.map(c => c.total);
      const cmpWon = chartData.byCampaign.map(c => c.won_count);

      state.chartInstances.campaigns = new Chart(ctxCmp, {
        type: 'bar',
        data: {
          labels: cmpNames,
          datasets: [
            { label: 'إجمالي العملاء', data: cmpTotals, backgroundColor: '#3b82f6', borderRadius: 4 },
            { label: 'التعاقدات (Won)', data: cmpWon, backgroundColor: '#10b981', borderRadius: 4 }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { labels: { color: '#f8fafc', font: { family: 'Cairo' } } }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { family: 'Cairo', size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', precision: 0 }, grid: { color: '#223150' } }
          }
        }
      });
    }

    // 4. Lost Reasons Chart
    const ctxLost = document.getElementById('chartLostReasons');
    if (ctxLost) {
      if (state.chartInstances.lost) state.chartInstances.lost.destroy();

      const reasons = chartData.lostReasons.length ? chartData.lostReasons.map(r => r.reason) : ['لا توجد صفقات خاسرة مسجلة'];
      const counts = chartData.lostReasons.length ? chartData.lostReasons.map(r => r.count) : [0];

      state.chartInstances.lost = new Chart(ctxLost, {
        type: 'bar',
        data: {
          labels: reasons,
          datasets: [{
            label: 'عدد الحالات',
            data: counts,
            backgroundColor: '#ef4444',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', precision: 0 }, grid: { color: '#223150' } },
            y: { ticks: { color: '#cbd5e1', font: { family: 'Cairo', size: 10 } }, grid: { display: false } }
          }
        }
      });
    }
  }

  // Load Leads Table
  async function loadLeads(params = {}) {
    const q = document.getElementById('globalSearchInput')?.value || '';
    const status = document.getElementById('filterStatus')?.value || params.status || '';
    const priority = document.getElementById('filterPriority')?.value || params.priority || '';
    const campaign = document.getElementById('filterCampaign')?.value || '';
    const sortBy = document.getElementById('filterSortBy')?.value || 'score_desc';

    let url = `/api/leads?sort_by=${sortBy}`;
    if (q) url += `&q=${encodeURIComponent(q)}`;
    if (status) url += `&status=${encodeURIComponent(status)}`;
    if (priority) url += `&priority=${encodeURIComponent(priority)}`;
    if (campaign) url += `&campaign=${encodeURIComponent(campaign)}`;

    const data = await api(url);
    state.leads = data.leads;
    renderLeadsTable(data.leads);

    // Populate Campaign Filter Dropdown dynamically if empty
    const cmpSelect = document.getElementById('filterCampaign');
    if (cmpSelect && cmpSelect.options.length <= 1) {
      const cmpSet = new Set(data.leads.map(l => l.campaign_name).filter(Boolean));
      cmpSet.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        cmpSelect.appendChild(opt);
      });
    }
  }

  function getStatusBadge(status) {
    const map = {
      'contact_today': { label: 'اتصال اليوم', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' },
      'followup_today': { label: 'متابعة اليوم', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' },
      'contacted_awaiting': { label: 'بانتظار الرد', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)' },
      'in_negotiation': { label: 'تفاوض وعرض سعر', color: '#c084fc', bg: 'rgba(139, 92, 246, 0.2)' },
      'future_opportunity': { label: 'فرصة مستقبلية', color: '#38bdf8', bg: 'rgba(6, 182, 212, 0.2)' },
      'won': { label: 'تم التعاقد 🏆', color: '#34d399', bg: 'rgba(16, 185, 129, 0.2)' },
      'not_interested': { label: 'غير مهتم', color: '#94a3b8', bg: 'rgba(100, 116, 139, 0.2)' },
      'lost': { label: 'فرصة ضائعة', color: '#f87171', bg: 'rgba(220, 38, 38, 0.2)' },
      'invalid_data': { label: 'بيانات ناقصة', color: '#facc15', bg: 'rgba(234, 179, 8, 0.2)' },
      'cold_low': { label: 'أولوية منخفضة', color: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.2)' }
    };
    const s = map[status] || { label: status, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
    return `<span class="badge badge-status" style="color: ${s.color}; background: ${s.bg}; border: 1px solid ${s.color}40;">${s.label}</span>`;
  }

  function getPriorityBadge(priority) {
    const map = {
      'hot': '<span class="badge badge-hot">🔥 ساخن</span>',
      'warm': '<span class="badge badge-warm">⚡ دافئ</span>',
      'nurture': '<span class="badge badge-nurture">⏳ متابعة دورية</span>',
      'low': '<span class="badge badge-low">❄️ منخفض</span>'
    };
    return map[priority] || `<span class="badge badge-low">${priority}</span>`;
  }

  function getScoreBadge(score) {
    let cls = 'score-low';
    if (score >= 80) cls = 'score-high';
    else if (score >= 60) cls = 'score-mid';
    else if (score >= 35) cls = 'score-warm';
    return `<span class="score-pill ${cls}">${score}</span>`;
  }

  function renderLeadsTable(leads) {
    const tbody = document.getElementById('leadsTableBody');
    const showingCount = document.getElementById('showingCount');
    const emptyState = document.getElementById('tableEmptyState');

    tbody.innerHTML = '';
    showingCount.textContent = leads.length;

    if (leads.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    leads.forEach(lead => {
      const tr = document.createElement('tr');
      const isSelected = state.selectedLeadIds.has(lead.id);

      const normPhone = lead.normalized_phone || lead.phone_number || '';
      const displayPhone = lead.phone_number || 'غير متوفر';
      const waUrl = normPhone ? `https://wa.me/${normPhone}?text=${encodeURIComponent(lead.whatsapp_draft || '')}` : '#';
      const telUrl = normPhone ? `tel:${normPhone}` : '#';

      tr.innerHTML = `
        <td><input type="checkbox" class="lead-row-checkbox" data-id="${lead.id}" ${isSelected ? 'checked' : ''}></td>
        <td>
          <div style="font-weight: 800; color: #ffffff; cursor: pointer;" class="btn-open-lead-drawer" data-id="${lead.id}">${escapeHtml(lead.full_name)}</div>
          <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(lead.job_title || 'بدون مسمى')}</div>
        </td>
        <td>
          <a href="${telUrl}" class="phone-link" style="color: #60a5fa; text-decoration: none; font-weight: 700; font-family: monospace;">${escapeHtml(displayPhone)}</a>
        </td>
        <td style="max-width: 180px; font-size: 0.8rem; color: #e2e8f0;">${escapeHtml(lead.package_requested || 'غير محدد')}</td>
        <td style="font-size: 0.8rem; font-weight: 600;">${escapeHtml(lead.start_timeline || 'غير محدد')}</td>
        <td>${getScoreBadge(lead.lead_score)}</td>
        <td>${getPriorityBadge(lead.lead_priority)}</td>
        <td>${getStatusBadge(lead.crm_status)}</td>
        <td style="font-size: 0.78rem; color: ${lead.next_followup_date ? '#facc15' : 'var(--text-dim)'};">
          ${lead.next_followup_date ? formatDateTime(lead.next_followup_date) : 'غير مجدول'}
        </td>
        <td style="max-width: 220px; font-size: 0.78rem; color: #cbd5e1; line-height: 1.4;">
          ${escapeHtml(lead.recommended_action || 'لا توجد توصية')}
        </td>
        <td style="font-size: 0.76rem; color: var(--text-muted); max-width: 130px;">
          ${escapeHtml(lead.campaign_name || 'حملة عامة')}
        </td>
        <td>
          <div class="row-actions">
            ${normPhone ? `
              <a href="${telUrl}" class="btn-action-icon call" title="اتصال هاتفي">📞</a>
              <a href="${waUrl}" target="_blank" class="btn-action-icon whatsapp" title="فتح واتساب بالرسالة المجهزة">💬</a>
            ` : ''}
            <button class="btn-action-icon btn-quick-call" data-id="${lead.id}" title="تسجيل نتيجة اتصال">📝</button>
            <button class="btn-action-icon btn-open-lead-drawer" data-id="${lead.id}" title="عرض تفاصيل العميل والتحليل">👁️</button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });

    attachTableEvents();
  }

  function attachTableEvents() {
    // Lead row checkbox
    document.querySelectorAll('.lead-row-checkbox').forEach(cb => {
      cb.addEventListener('change', e => {
        const id = parseInt(e.target.dataset.id, 10);
        if (e.target.checked) state.selectedLeadIds.add(id);
        else state.selectedLeadIds.delete(id);
        updateBulkBar();
      });
    });

    // Open Lead Profile Drawer
    document.querySelectorAll('.btn-open-lead-drawer').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        openLeadDrawer(id);
      });
    });

    // Quick Call Modal
    document.querySelectorAll('.btn-quick-call').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.id, 10);
        openQuickCallModal(id);
      });
    });
  }

  function updateBulkBar() {
    const bar = document.getElementById('bulkActionsBar');
    const countEl = document.getElementById('selectedLeadsCount');
    const count = state.selectedLeadIds.size;
    countEl.textContent = count;
    bar.style.display = count > 0 ? 'flex' : 'none';
  }

  // Load Today's Follow-up Workspace
  async function loadFollowupWorkspace(workspace = 'today') {
    state.currentWorkspaceTab = workspace;

    // Update Tab Styles
    document.querySelectorAll('.workspace-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.ws === workspace);
    });

    const data = await api(`/api/leads?workspace=${workspace}`);
    renderFollowupCards(data.leads, workspace);

    // Update counts for all sub-tabs
    updateWorkspaceBadges();
  }

  async function updateWorkspaceBadges() {
    const todayData = await api('/api/leads?workspace=today');
    const overdueData = await api('/api/leads?workspace=overdue');
    const hotData = await api('/api/leads?workspace=untouched_hot');
    const awaitingData = await api('/api/leads?workspace=awaiting');
    const upcomingData = await api('/api/leads?workspace=upcoming');
    const reviewData = await api('/api/leads?workspace=review_archive');

    document.getElementById('wsCountToday').textContent = todayData.count;
    document.getElementById('wsCountOverdue').textContent = overdueData.count;
    document.getElementById('wsCountHot').textContent = hotData.count;
    document.getElementById('wsCountAwaiting').textContent = awaitingData.count;
    document.getElementById('wsCountUpcoming').textContent = upcomingData.count;
    document.getElementById('wsCountReview').textContent = reviewData.count;
  }

  function renderFollowupCards(leads, workspace) {
    const grid = document.getElementById('followupCardsGrid');
    grid.innerHTML = '';

    if (leads.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; background: var(--bg-card); border: 1px dashed var(--border-subtle); border-radius: var(--radius-lg); padding: 48px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🎉</div>
          <h3 style="font-size: 1.15rem; font-weight: 800; color: #ffffff; margin-bottom: 6px;">لا توجد مهام متابعة معلقة في هذا القسم حالياً</h3>
          <p style="font-size: 0.85rem;">تم إنجاز متابعات هذه القائمة بنجاح، أو لم يحن موعدها بعد.</p>
        </div>
      `;
      return;
    }

    leads.forEach(lead => {
      const card = document.createElement('div');
      card.className = 'followup-card';

      const normPhone = lead.normalized_phone || lead.phone_number || '';
      const waUrl = normPhone ? `https://wa.me/${normPhone}?text=${encodeURIComponent(lead.whatsapp_draft || '')}` : '#';
      const telUrl = normPhone ? `tel:${normPhone}` : '#';

      card.innerHTML = `
        <div class="followup-card-header">
          <div class="lead-name-box">
            <h3 class="btn-open-lead-drawer" data-id="${lead.id}" style="cursor: pointer;">
              ${escapeHtml(lead.full_name)}
              ${getScoreBadge(lead.lead_score)}
            </h3>
            <p>${escapeHtml(lead.job_title || 'بدون مسمى وظيفي')} • <span style="color: #60a5fa;">${escapeHtml(lead.phone_number)}</span></p>
          </div>
          ${getStatusBadge(lead.crm_status)}
        </div>

        <div style="font-size: 0.82rem; color: #e2e8f0; display: flex; flex-direction: column; gap: 4px;">
          <div><strong style="color: var(--text-dim);">الباقة المطلوبة:</strong> ${escapeHtml(lead.package_requested || 'غير محدد')}</div>
          <div><strong style="color: var(--text-dim);">توقيت البدء:</strong> ${escapeHtml(lead.start_timeline || 'غير محدد')}</div>
          ${lead.raw_feedback ? `<div><strong style="color: var(--gold);">الملاحظات السابقة:</strong> ${escapeHtml(lead.raw_feedback)}</div>` : ''}
        </div>

        <div class="followup-advice-box">
          <div class="advice-label">
            <span>💡</span>
            <span>ماذا تقول للعميل في المكالمة؟ (Sales Pitch)</span>
          </div>
          <div style="font-size: 0.84rem; font-weight: 700; color: #ffffff; line-height: 1.5;">
            ${escapeHtml(lead.recommended_action || 'اتصل بالعميل واستكشف احتياجه')}
          </div>
          <div style="font-size: 0.76rem; color: #94a3b8; display: flex; justify-content: space-between;">
            <span>القناة المقترحة: <strong style="color: #60a5fa;">${lead.recommended_channel === 'call' ? '📞 مكالمة هاتفية' : '💬 رسالة واتساب'}</strong></span>
            <span>التوقيت: <strong style="color: var(--gold);">${escapeHtml(lead.recommended_timing || 'اليوم')}</strong></span>
          </div>
        </div>

        <div class="followup-quick-actions">
          <a href="${telUrl}" class="btn btn-primary btn-sm" style="flex: 1;">
            <span>📞</span>
            <span>اتصال الآن</span>
          </a>
          <a href="${waUrl}" target="_blank" class="btn btn-success btn-sm" style="flex: 1;">
            <span>💬</span>
            <span>واتساب</span>
          </a>
          <button class="btn btn-outline btn-sm btn-quick-call" data-id="${lead.id}">
            <span>📝</span>
            <span>تسجيل النتيجة</span>
          </button>
        </div>
      `;

      grid.appendChild(card);
    });

    // Attach click events
    grid.querySelectorAll('.btn-open-lead-drawer').forEach(el => {
      el.addEventListener('click', () => openLeadDrawer(parseInt(el.dataset.id, 10)));
    });
    grid.querySelectorAll('.btn-quick-call').forEach(el => {
      el.addEventListener('click', () => openQuickCallModal(parseInt(el.dataset.id, 10)));
    });
  }

  // Load Hot Leads Page
  async function loadHotLeads() {
    const data = await api('/api/leads?priority=hot');
    const container = document.getElementById('hotLeadsContainer');
    container.innerHTML = '';
    renderFollowupCards(data.leads, 'hot_page');
  }

  // Load Future Opportunities Page
  async function loadFutureOpps() {
    const data = await api('/api/leads?status=future_opportunity');
    const container = document.getElementById('futureOppsContainer');
    container.innerHTML = '';
    renderFollowupCards(data.leads, 'future_page');
  }

  // Load Pipeline Kanban Board
  async function loadPipelineKanban() {
    const data = await api('/api/leads');
    const board = document.getElementById('kanbanBoard');
    board.innerHTML = '';

    const stages = [
      { id: 'contact_today', title: 'اتصال اليوم', color: '#ef4444' },
      { id: 'contacted_awaiting', title: 'تم التواصل - انتظار الرد', color: '#3b82f6' },
      { id: 'in_negotiation', title: 'تفاوض وعرض سعر', color: '#8b5cf6' },
      { id: 'future_opportunity', title: 'فرصة مستقبلية', color: '#06b6d4' },
      { id: 'won', title: 'تم التعاقد 🏆', color: '#10b981' },
      { id: 'not_interested', title: 'غير مهتم / ملغي', color: '#64748b' }
    ];

    stages.forEach(stage => {
      const col = document.createElement('div');
      col.className = 'kanban-col';
      const stageLeads = data.leads.filter(l => l.crm_status === stage.id);

      col.innerHTML = `
        <div class="kanban-col-header" style="border-top: 3px solid ${stage.color};">
          <div class="kanban-col-title">
            <span style="color: ${stage.color};">●</span>
            <span>${stage.title}</span>
          </div>
          <span class="nav-badge primary">${stageLeads.length}</span>
        </div>
        <div class="kanban-cards-list" data-stage="${stage.id}">
          ${stageLeads.map(lead => `
            <div class="kanban-card" data-id="${lead.id}">
              <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="font-weight: 800; color: #ffffff; font-size: 0.88rem; cursor: pointer;" class="btn-open-lead-drawer" data-id="${lead.id}">
                  ${escapeHtml(lead.full_name)}
                </div>
                ${getScoreBadge(lead.lead_score)}
              </div>
              <div style="font-size: 0.76rem; color: var(--text-muted);">${escapeHtml(lead.job_title || 'بدون مسمى')}</div>
              <div style="font-size: 0.78rem; color: #e2e8f0;">${escapeHtml(lead.package_requested || 'باقة غير محددة')}</div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; font-size: 0.74rem;">
                <span style="color: #60a5fa;">${escapeHtml(lead.phone_number || '')}</span>
                <button class="btn btn-outline btn-sm btn-quick-call" data-id="${lead.id}" style="padding: 2px 6px; font-size: 0.72rem;">تسجيل</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      board.appendChild(col);
    });

    // Attach card events
    board.querySelectorAll('.btn-open-lead-drawer').forEach(el => {
      el.addEventListener('click', () => openLeadDrawer(parseInt(el.dataset.id, 10)));
    });
    board.querySelectorAll('.btn-quick-call').forEach(el => {
      el.addEventListener('click', () => openQuickCallModal(parseInt(el.dataset.id, 10)));
    });
  }

  // Load Campaigns Performance Report
  async function loadCampaignsReport() {
    const data = await api('/api/dashboard/stats');
    const tbody = document.getElementById('campaignsReportTableBody');
    tbody.innerHTML = '';

    const campaigns = data.charts.byCampaign || [];
    if (campaigns.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim);">لا توجد بيانات حملات مسجلة</td></tr>';
      return;
    }

    campaigns.forEach(c => {
      const cr = c.total > 0 ? ((c.won_count / c.total) * 100).toFixed(1) : '0';
      const hotPct = c.total > 0 ? ((c.hot_count / c.total) * 100).toFixed(0) : '0';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: #ffffff;">${escapeHtml(c.name)}</td>
        <td><span class="badge badge-warm">Facebook / Instagram Ads</span></td>
        <td style="font-weight: 800;">${c.total}</td>
        <td><span class="badge badge-hot">${c.hot_count} (${hotPct}%)</span></td>
        <td><span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">${c.won_count}</span></td>
        <td style="font-weight: 800; color: #34d399;">${cr}%</td>
        <td>
          <div style="background: var(--bg-surface); border-radius: var(--radius-full); height: 8px; width: 100px; overflow: hidden; display: inline-block;">
            <div style="background: #3b82f6; width: ${Math.min(100, Math.max(10, hotPct))}%; height: 100%;"></div>
          </div>
          <span style="font-size: 0.74rem; color: var(--text-muted); margin-right: 6px;">${hotPct >= 50 ? 'ممتازة' : 'متوسطة'}</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // Load Archived Leads
  async function loadArchive() {
    const data = await api('/api/leads?archived=1');
    const tbody = document.getElementById('archiveTableBody');
    tbody.innerHTML = '';

    if (data.leads.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 30px;">الأرشيف فارغ حالياً</td></tr>';
      return;
    }

    data.leads.forEach(l => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700; color: #ffffff;">${escapeHtml(l.full_name)}</td>
        <td>${escapeHtml(l.phone_number)}</td>
        <td>${escapeHtml(l.package_requested || 'غير محدد')}</td>
        <td style="color: #f87171;">${escapeHtml(l.disqualified_reason || l.raw_feedback || 'مستبعد')}</td>
        <td>${getScoreBadge(l.lead_score)}</td>
        <td>
          <button class="btn btn-outline btn-sm btn-restore-lead" data-id="${l.id}">
            <span>↩️</span>
            <span>استعادة للمتابعة</span>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-restore-lead').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.dataset.id, 10);
        await api('/api/leads/bulk', {
          method: 'POST',
          body: JSON.stringify({ ids: [id], action: 'restore' })
        });
        showToast('تمت استعادة العميل بنجاح إلى القائمة النشطة', 'success');
        loadArchive();
      });
    });
  }

  // Load Settings
  async function loadSettings() {
    const cfg = await api('/api/settings');
    state.settings = cfg;

    const w = cfg.scoring_weights || {};
    document.getElementById('weightTimeline').value = w.timeline || 30;
    document.getElementById('weightTimelineVal').textContent = (w.timeline || 30) + '%';
    document.getElementById('weightPackage').value = w.package || 20;
    document.getElementById('weightPackageVal').textContent = (w.package || 20) + '%';
    document.getElementById('weightQuality').value = w.lead_quality || 20;
    document.getElementById('weightQualityVal').textContent = (w.lead_quality || 20) + '%';
    document.getElementById('weightContact').value = w.contact_completeness || 15;
    document.getElementById('weightContactVal').textContent = (w.contact_completeness || 15) + '%';
    document.getElementById('weightFeedback').value = w.feedback || 15;
    document.getElementById('weightFeedbackVal').textContent = (w.feedback || 15) + '%';

    document.getElementById('settingMaxAttempts').value = cfg.max_unanswered_attempts || 4;
    document.getElementById('settingThreshHot').value = cfg.thresholds?.hot || 80;
    document.getElementById('settingThreshWarm').value = cfg.thresholds?.warm || 60;
  }

  // Lead Profile Drawer Handlers
  async function openLeadDrawer(id) {
    const data = await api(`/api/leads/${id}`);
    state.activeLead = data.lead;

    document.getElementById('drawerLeadName').textContent = data.lead.full_name;
    document.getElementById('drawerLeadPhone').textContent = `${data.lead.job_title || ''} • ${data.lead.phone_number || ''}`;

    // Score & Badges
    const scoreBadge = document.getElementById('drawerScoreBadge');
    scoreBadge.textContent = data.lead.lead_score;
    scoreBadge.className = `score-pill ${data.lead.lead_score >= 80 ? 'score-high' : (data.lead.lead_score >= 60 ? 'score-mid' : 'score-low')}`;

    document.getElementById('drawerExplanation').textContent = data.lead.scoring_explanation || 'لا يوجد تحليل مفصل';
    document.getElementById('drawerActionAdvice').textContent = data.lead.recommended_action || 'اتصل بالعميل';
    document.getElementById('drawerTimingAdvice').textContent = `توقيت المتابعة المقترح: ${data.lead.recommended_timing || 'اليوم'}`;

    // Status Select & Follow-up input
    document.getElementById('drawerStatusSelect').value = data.lead.crm_status;
    document.getElementById('drawerSalesNotes').value = data.lead.sales_notes || '';
    if (data.lead.next_followup_date) {
      document.getElementById('drawerNextFollowupInput').value = data.lead.next_followup_date.substring(0, 16);
    } else {
      document.getElementById('drawerNextFollowupInput').value = '';
    }

    // WhatsApp Tab
    document.getElementById('drawerWaDraftText').value = data.lead.whatsapp_draft || '';

    // Activities Tab
    const actList = document.getElementById('drawerActivitiesList');
    actList.innerHTML = '';
    if (data.activities.length === 0) {
      actList.innerHTML = '<div style="color: var(--text-dim); font-size: 0.8rem;">لا توجد تفاعلات أو مكالمات سابقة مسجلة</div>';
    } else {
      data.activities.forEach(a => {
        const item = document.createElement('div');
        item.style.cssText = 'background: rgba(11, 17, 32, 0.6); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.78rem;';
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-weight: 700; color: #ffffff; margin-bottom: 2px;">
            <span>${a.type === 'call' ? '📞 مكالمة هاتفية' : (a.type === 'whatsapp' ? '💬 واتساب' : a.type)}</span>
            <span style="color: var(--text-dim);">${formatDateTime(a.created_at)}</span>
          </div>
          <div style="color: #60a5fa; font-weight: 600;">النتيجة: ${escapeHtml(a.outcome)}</div>
          ${a.notes ? `<div style="color: #cbd5e1; margin-top: 2px;">${escapeHtml(a.notes)}</div>` : ''}
        `;
        actList.appendChild(item);
      });
    }

    // Raw Source Tab
    const srcList = document.getElementById('drawerSourceDataList');
    srcList.innerHTML = '';
    const rawFields = [
      ['معرف العميل بالإعلان (Lead ID)', data.lead.source_lead_id],
      ['تاريخ إنشاء العميل في فيسبوك', data.lead.created_time],
      ['الحملة الإعلانية', data.lead.campaign_name],
      ['المجموعة الإعلانية', data.lead.adset_name],
      ['اسم الإعلان', data.lead.ad_name],
      ['المنصة الإعلانية', data.lead.platform],
      ['اسم الاستمارة (Form)', data.lead.form_name],
      ['الباقة المختارة في الاستمارة', data.lead.package_requested],
      ['توقيت البدء المذكور', data.lead.start_timeline],
      ['البريد الإلكتروني الشخصي', data.lead.email],
      ['بريد العمل', data.lead.work_email],
      ['تقييم الجودة الأولي (Lead Quality)', data.lead.raw_lead_quality],
      ['حالة العميل الأولية (Lead Status)', data.lead.raw_lead_status],
      ['الملاحظات الأولية (Feedback)', data.lead.raw_feedback],
      ['رابط محادثة صفحة الإعلان', data.lead.inbox_url]
    ];

    rawFields.forEach(([label, val]) => {
      const row = document.createElement('div');
      row.style.cssText = 'display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(34, 49, 80, 0.4);';
      row.innerHTML = `
        <span style="color: var(--text-dim);">${label}:</span>
        <span style="font-weight: 700; color: #ffffff; max-width: 60%; word-break: break-all;">${escapeHtml(val || '—')}</span>
      `;
      srcList.appendChild(row);
    });

    // Reset Tab to Overview
    switchDrawerTab('overview');

    // Open Drawer
    document.getElementById('drawerOverlay').classList.add('open');
    document.getElementById('leadDrawer').classList.add('open');
  }

  function closeLeadDrawer() {
    document.getElementById('drawerOverlay').classList.remove('open');
    document.getElementById('leadDrawer').classList.remove('open');
    state.activeLead = null;
  }

  function switchDrawerTab(tabId) {
    document.querySelectorAll('.drawer-tab').forEach(t => t.classList.toggle('active', t.dataset.dtab === tabId));
    document.querySelectorAll('.dtab-content').forEach(c => {
      c.style.display = c.id === `dtab-${tabId}` ? 'block' : 'none';
      c.classList.toggle('active', c.id === `dtab-${tabId}`);
    });
  }

  // Quick Call Modal Handlers
  function openQuickCallModal(leadId) {
    const lead = state.leads.find(l => l.id === leadId) || state.activeLead;
    if (!lead) return;

    state.quickCallLeadId = leadId;
    document.getElementById('modalCallLeadName').textContent = `تسجيل نتيجة مكالمة: ${lead.full_name} (${lead.phone_number || ''})`;
    document.getElementById('quickCallNotes').value = '';
    document.getElementById('quickCallNextDate').value = '';

    document.getElementById('quickCallModal').classList.add('open');
  }

  function closeQuickCallModal() {
    document.getElementById('quickCallModal').classList.remove('open');
    state.quickCallLeadId = null;
  }

  // Excel & CSV Import Engine
  function handleFileSelect(file) {
    if (!file) return;
    state.importData.fileName = file.name;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonRows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonRows.length === 0) {
          showToast('الملف فارغ أو لا يحتوي على صفوف بيانات صالحة', 'error');
          return;
        }

        processRawImportData(jsonRows, file.name);
      } catch (err) {
        console.error('Error parsing spreadsheet:', err);
        showToast('تعذر قراءة ملف الإكسيل: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function processRawImportData(jsonRows, fileName) {
    state.importData.rawRows = jsonRows;
    state.importData.fileName = fileName;

    // Extract Headers
    const headers = Object.keys(jsonRows[0] || {});
    state.importData.rawHeaders = headers;

    // Detect column mappings
    state.importData.detectedMappings = {};
    headers.forEach(h => {
      state.importData.detectedMappings[h] = autoDetectField(h);
    });

    // Render Step 2 (Mapping)
    renderMappingTable();
    showImportStep(2);
  }

  function renderMappingTable() {
    const tbody = document.getElementById('mappingTableBody');
    tbody.innerHTML = '';

    const firstRow = state.importData.rawRows[0] || {};

    state.importData.rawHeaders.forEach(header => {
      const tr = document.createElement('tr');
      const detectedField = state.importData.detectedMappings[header] || '';
      const sampleValue = firstRow[header] || '';

      const selectHtml = `
        <select class="filter-select mapping-field-select" data-header="${escapeHtml(header)}" style="width: 100%;">
          <option value="">-- تجاهل هذا العمود --</option>
          ${STANDARD_FIELDS.map(f => `
            <option value="${f.key}" ${f.key === detectedField ? 'selected' : ''}>
              ${f.label}
            </option>
          `).join('')}
        </select>
      `;

      tr.innerHTML = `
        <td style="font-weight: 700; color: #ffffff;">${escapeHtml(header)}</td>
        <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${escapeHtml(String(sampleValue))}
        </td>
        <td>${selectHtml}</td>
        <td>
          ${detectedField ? '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">تم التعرف تلقائياً ✓</span>' : '<span class="badge" style="background: rgba(100, 116, 139, 0.2); color: #cbd5e1;">غير مطابق</span>'}
        </td>
      `;

      tbody.appendChild(tr);
    });

    // Attach change handlers to re-map
    tbody.querySelectorAll('.mapping-field-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const h = e.target.dataset.header;
        state.importData.detectedMappings[h] = e.target.value;
      });
    });
  }

  async function proceedToImportPreview() {
    // Transform rows according to mapping
    const mappedRows = [];
    state.importData.rawRows.forEach(rawRow => {
      const newRow = {};
      Object.keys(rawRow).forEach(header => {
        const targetField = state.importData.detectedMappings[header];
        if (targetField) {
          newRow[targetField] = rawRow[header];
        }
      });
      mappedRows.push(newRow);
    });

    // Send to preview API
    const res = await api('/api/import/preview', {
      method: 'POST',
      body: JSON.stringify({
        rows: mappedRows,
        rawHeaders: state.importData.rawHeaders
      })
    });

    state.importData.previewResult = res;
    state.importData.mappedRows = mappedRows;

    // Render Preview
    document.getElementById('previewTotalRows').textContent = res.total_rows;
    document.getElementById('previewNewRows').textContent = res.new_count;
    document.getElementById('previewDupRows').textContent = res.duplicate_count;
    document.getElementById('previewFlaggedRows').textContent = res.flagged_count;

    const tbody = document.getElementById('previewTableBody');
    tbody.innerHTML = '';

    res.preview_sample.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${item.original_index}</td>
        <td style="font-weight: 700; color: #ffffff;">${escapeHtml(item.data.full_name || 'بدون اسم')}</td>
        <td>${escapeHtml(item.data.phone_number || '')}</td>
        <td style="font-family: monospace; color: #60a5fa;">${escapeHtml(item.normalized_phone || '—')}</td>
        <td style="font-size: 0.8rem;">${escapeHtml(item.data.choose_your_virtual_address_package_ || item.data.package_requested || '—')}</td>
        <td>${escapeHtml(item.data.when_do_you_want_to_start_ || item.data.start_timeline || '—')}</td>
        <td>${getScoreBadge(item.scoring.score)} ${getPriorityBadge(item.scoring.priority)}</td>
        <td>
          ${item.is_duplicate ? `<span class="badge" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24;">مكرر: ${escapeHtml(item.duplicate_reason)}</span>` : '<span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">عميل جديد</span>'}
        </td>
        <td>
          ${item.warnings.length ? `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">${item.warnings.join('، ')}</span>` : '<span style="color: #10b981;">سليم ✓</span>'}
        </td>
      `;
      tbody.appendChild(tr);
    });

    showImportStep(3);
  }

  async function commitImport() {
    const dupStrategy = document.getElementById('dupStrategySelect').value;
    const res = await api('/api/import/commit', {
      method: 'POST',
      body: JSON.stringify({
        rows: state.importData.mappedRows,
        fileName: state.importData.fileName,
        duplicateStrategy: dupStrategy,
        rawHeaders: state.importData.rawHeaders
      })
    });

    showToast(`تم استيراد ${res.importedCount} عميل جديد وتحديث ${res.updatedCount} عميل بنجاح!`, 'success');
    showImportStep(1);
    loadImportHistory();
    loadDashboard();
  }

  async function loadImportHistory() {
    const res = await api('/api/import/history');
    const tbody = document.getElementById('importHistoryTableBody');
    tbody.innerHTML = '';

    if (!res.history || res.history.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 20px;">لا توجد عمليات استيراد سابقة</td></tr>';
      return;
    }

    res.history.forEach((h, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td style="font-weight: 700; color: #ffffff;">${escapeHtml(h.file_name)}</td>
        <td style="color: var(--text-muted);">${formatDateTime(h.created_at)}</td>
        <td style="font-weight: 800;">${h.total_rows}</td>
        <td><span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399;">${h.imported_count}</span></td>
        <td><span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa;">${h.updated_count}</span></td>
        <td>${h.flagged_count > 0 ? `<span class="badge" style="background: rgba(239, 68, 68, 0.2); color: #f87171;">${h.flagged_count}</span>` : '0'}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function showImportStep(step) {
    document.getElementById('importStep1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('importStep2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('importStep3').style.display = step === 3 ? 'block' : 'none';

    document.getElementById('step1Indicator').classList.toggle('active', step >= 1);
    document.getElementById('step2Indicator').classList.toggle('active', step >= 2);
    document.getElementById('step3Indicator').classList.toggle('active', step >= 3);
  }

  // Generate Sample Excel Template for Smart Address Egypt
  function downloadSampleTemplate() {
    const sampleHeaders = [
      'id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name',
      'campaign_id', 'campaign_name', 'form_id', 'form_name', 'is_organic',
      'platform', 'choose_your_virtual_address_package_', 'when_do_you_want_to_start_',
      'email', 'full_name', 'phone_number', 'job_title', 'work_email',
      'inbox_url', 'lead_status', 'Lead Quality', 'Next Action', 'fedback'
    ];

    const sampleRows = [
      [
        'fb_lead_9001', '2026-10-09T09:30:00Z', 'ad_101', 'إعلان المقر الإداري للبطاقة الضريبية',
        'adset_201', 'رواد الأعمال - القاهرة الجديدة', 'cmp_301', 'FB_Virtual_Office_Tax_Card_Q4',
        'frm_401', 'استمارة باقات المقر الافتراضي', 'FALSE', 'fb',
        'باقة العنوان الافتراضي السنوية (البطاقة الضريبية والسجل التجاري)', 'فوراً',
        'kareem.salem@apex-tech.eg', 'م/ كريم سالم إبراهيم', '01011223344',
        'الرئيس التنفيذي - Apex Tech', 'kareem@apex-tech.eg',
        'https://business.facebook.com/latest/inbox/messenger', 'New', 'High',
        'Call Today', 'تأسيس شركة برمجة جديدة ومحتاج العنوان والبطاقة الضريبية هذا الأسبوع'
      ],
      [
        'fb_lead_9002', '2026-10-09T08:15:00Z', 'ad_102', 'إعلان حجز قاعات اجتماعات للشركات',
        'adset_202', 'المستشارين والمدربين', 'cmp_302', 'IG_Meeting_Rooms_Training_Q4',
        'frm_402', 'حجز باقات قاعات الاجتماعات', 'FALSE', 'ig',
        'باقة قاعات الاجتماعات (20 ساعة شهرياً)', 'خلال أسبوعين',
        'dr.hany.audit@gmail.com', 'د/ هاني عبد السلام', '01155443322',
        'مراقب حسابات ومستشار ضرائب', '',
        'https://business.facebook.com/latest/inbox/messenger', 'Contacted', 'High',
        'Follow up brochure', 'محتاج قاعة اجتماعات مكيفة مع شاشات عرض لعقد جلسات عملاء بالمعادي والتجمع'
      ],
      [
        'fb_lead_9003', '2026-10-08T18:00:00Z', 'ad_101', 'إعلان المقر الإداري للبطاقة الضريبية',
        'adset_201', 'رواد الأعمال - القاهرة الجديدة', 'cmp_301', 'FB_Virtual_Office_Tax_Card_Q4',
        'frm_401', 'استمارة باقات المقر الافتراضي', 'FALSE', 'fb',
        'باقة العنوان الافتراضي السنوية', 'بعد 3 شهور',
        'mona.fashion@outlook.com', 'أ/ منى الشافعي', '01299887766',
        'مصممة أزياء ومؤسسة براند تجاري', '',
        '', 'Nurture', 'Medium', 'Follow up Q1',
        'لسه في مرحلة تحضير رأس المال والتسجيل بداية العام القادم'
      ]
    ];

    const wsData = [sampleHeaders, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads_Template');
    XLSX.writeFile(wb, 'Smart_Address_Egypt_Leads_Template.xlsx');
    showToast('تم تحميل نموذج إكسيل Smart Address Egypt بنجاح!', 'success');
  }

  // Export Filtered Leads to Excel / CSV
  function exportLeads(format = 'xlsx') {
    if (state.leads.length === 0) {
      showToast('لا توجد بيانات عملاء لتصديرها', 'error');
      return;
    }

    const exportRows = state.leads.map(l => ({
      'اسم العميل': l.full_name,
      'رقم الهاتف': l.phone_number,
      'الهاتف المنسق': l.normalized_phone,
      'البريد الإلكتروني': l.email,
      'المسمى الوظيفي': l.job_title,
      'الباقة المطلوبة': l.package_requested,
      'توقيت البدء': l.start_timeline,
      'تقييم العميل': l.lead_score,
      'الأولوية': l.lead_priority,
      'حالة الـ CRM': l.crm_status,
      'التوصية المقترحة': l.recommended_action,
      'توقيت المتابعة': l.recommended_timing,
      'تاريخ المتابعة القادمة': l.next_followup_date || '',
      'الحملة الإعلانية': l.campaign_name,
      'المنصة': l.platform,
      'الملاحظات الأصلية': l.raw_feedback,
      'ملاحظات المبيعات': l.sales_notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Smart_Address_Leads');

    if (format === 'csv') {
      XLSX.writeFile(wb, `Smart_Address_Egypt_Leads_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, `Smart_Address_Egypt_Leads_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }

    showToast(`تم تصدير ${state.leads.length} عميل بصيغة ${format.toUpperCase()}`, 'success');
  }

  // Utility Functions
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoStr;
    }
  }

  // DOM Event Listeners Initialization
  function initEvents() {
    // Navigation items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        navigateTo(el.dataset.page);
      });
    });

    // Mobile sidebar toggle
    document.getElementById('btnToggleMobileSidebar')?.addEventListener('click', () => {
      document.getElementById('appSidebar').classList.toggle('mobile-open');
    });

    // Topbar Search & Refresh
    document.getElementById('globalSearchInput')?.addEventListener('input', () => {
      if (state.currentPage === 'all-leads') loadLeads();
      else navigateTo('all-leads');
    });
    document.getElementById('btnRefreshData')?.addEventListener('click', () => {
      loadDashboard();
      showToast('تم تحديث البيانات من الخادم', 'success');
    });
    document.getElementById('btnQuickImport')?.addEventListener('click', () => navigateTo('import-center'));

    // KPI Card Click Interactions (Filters leads table directly!)
    document.getElementById('kpiTotal')?.addEventListener('click', () => {
      navigateTo('all-leads');
    });
    document.getElementById('kpiHot')?.addEventListener('click', () => {
      navigateTo('hot-leads');
    });
    document.getElementById('kpiWarm')?.addEventListener('click', () => {
      navigateTo('all-leads');
      setTimeout(() => {
        document.getElementById('filterPriority').value = 'warm';
        loadLeads({ priority: 'warm' });
      }, 50);
    });
    document.getElementById('kpiContactToday')?.addEventListener('click', () => {
      navigateTo('today-followups', 'today');
    });
    document.getElementById('kpiOverdue')?.addEventListener('click', () => {
      navigateTo('today-followups', 'overdue');
    });
    document.getElementById('kpiNegotiation')?.addEventListener('click', () => {
      navigateTo('all-leads');
      setTimeout(() => {
        document.getElementById('filterStatus').value = 'in_negotiation';
        loadLeads({ status: 'in_negotiation' });
      }, 50);
    });
    document.getElementById('kpiWon')?.addEventListener('click', () => {
      navigateTo('all-leads');
      setTimeout(() => {
        document.getElementById('filterStatus').value = 'won';
        loadLeads({ status: 'won' });
      }, 50);
    });

    // Leads Table Filters
    document.getElementById('filterStatus')?.addEventListener('change', () => loadLeads());
    document.getElementById('filterPriority')?.addEventListener('change', () => loadLeads());
    document.getElementById('filterCampaign')?.addEventListener('change', () => loadLeads());
    document.getElementById('filterSortBy')?.addEventListener('change', () => loadLeads());

    // Select All Checkbox
    document.getElementById('selectAllCheckbox')?.addEventListener('change', e => {
      const checked = e.target.checked;
      document.querySelectorAll('.lead-row-checkbox').forEach(cb => {
        cb.checked = checked;
        const id = parseInt(cb.dataset.id, 10);
        if (checked) state.selectedLeadIds.add(id);
        else state.selectedLeadIds.delete(id);
      });
      updateBulkBar();
    });

    // Bulk Actions
    document.getElementById('btnApplyBulkStatus')?.addEventListener('click', async () => {
      const status = document.getElementById('bulkStatusSelect').value;
      if (!status) {
        showToast('يرجى اختيار الحالة أولاً', 'error');
        return;
      }
      await api('/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(state.selectedLeadIds), action: 'update_status', value: status })
      });
      showToast('تم تحديث حالة العملاء المحددين بنجاح', 'success');
      state.selectedLeadIds.clear();
      updateBulkBar();
      loadLeads();
    });

    document.getElementById('btnBulkSchedule')?.addEventListener('click', async () => {
      const date = prompt('أدخل تاريخ ووقت المتابعة (مثال: 2026-10-15T12:00):');
      if (!date) return;
      await api('/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(state.selectedLeadIds), action: 'schedule_followup', value: date })
      });
      showToast('تمت جدولة المتابعة للعملاء المحددين', 'success');
      state.selectedLeadIds.clear();
      updateBulkBar();
      loadLeads();
    });

    document.getElementById('btnBulkArchive')?.addEventListener('click', async () => {
      if (!confirm('هل أنت متأكد من أرشفة هؤلاء العملاء؟ يمكنك استعادتهم من صفحة الأرشيف في أي وقت.')) return;
      await api('/api/leads/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids: Array.from(state.selectedLeadIds), action: 'archive', value: 'أرشفة جماعية' })
      });
      showToast('تمت أرشفة العملاء المحددين', 'success');
      state.selectedLeadIds.clear();
      updateBulkBar();
      loadLeads();
    });

    // Export Buttons
    document.getElementById('btnExportExcel')?.addEventListener('click', () => exportLeads('xlsx'));
    document.getElementById('btnExportCSV')?.addEventListener('click', () => exportLeads('csv'));

    // Today's Follow-up Workspace Sub-tabs
    document.querySelectorAll('.workspace-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        loadFollowupWorkspace(tab.dataset.ws);
      });
    });

    // Drawer Tabs
    document.querySelectorAll('.drawer-tab').forEach(tab => {
      tab.addEventListener('click', () => switchDrawerTab(tab.dataset.dtab));
    });
    document.getElementById('btnCloseDrawer')?.addEventListener('click', closeLeadDrawer);
    document.getElementById('drawerOverlay')?.addEventListener('click', closeLeadDrawer);

    // Save Lead from Drawer
    document.getElementById('btnSaveDrawerLead')?.addEventListener('click', async () => {
      if (!state.activeLead) return;
      const newStatus = document.getElementById('drawerStatusSelect').value;
      const newNotes = document.getElementById('drawerSalesNotes').value;
      const nextFollowup = document.getElementById('drawerNextFollowupInput').value;

      await api(`/api/leads/${state.activeLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          crm_status: newStatus,
          sales_notes: newNotes,
          next_followup_date: nextFollowup || null,
          recalculate_score: true
        })
      });

      showToast('تم حفظ تعديلات العميل وتحديث التقييم بنجاح', 'success');
      closeLeadDrawer();
      if (state.currentPage === 'all-leads') loadLeads();
      else if (state.currentPage === 'today-followups') loadFollowupWorkspace(state.currentWorkspaceTab);
      else loadDashboard();
    });

    // Archive Lead from Drawer
    document.getElementById('btnArchiveLead')?.addEventListener('click', async () => {
      if (!state.activeLead) return;
      const reason = prompt('يرجى تحديد سبب الاستبعاد أو الأرشفة:') || 'استبعاد يدوي من مسؤول المبيعات';
      await api(`/api/leads/${state.activeLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          is_archived: 1,
          disqualified_reason: reason
        })
      });
      showToast('تمت أرشفة العميل بنجاح', 'success');
      closeLeadDrawer();
      if (state.currentPage === 'all-leads') loadLeads();
      else loadDashboard();
    });

    // Launch WhatsApp from Drawer
    document.getElementById('btnLaunchWhatsApp')?.addEventListener('click', () => {
      if (!state.activeLead) return;
      const phone = state.activeLead.normalized_phone || state.activeLead.phone_number;
      const text = document.getElementById('drawerWaDraftText').value;
      if (!phone) {
        showToast('رقم الهاتف غير متوفر', 'error');
        return;
      }
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
    });

    // Log Activity from Drawer
    document.getElementById('btnSubmitLogActivity')?.addEventListener('click', async () => {
      if (!state.activeLead) return;
      const type = document.getElementById('logActivityType').value;
      const outcome = document.getElementById('logActivityOutcome').value;
      const notes = document.getElementById('logActivityNotes').value;

      await api(`/api/leads/${state.activeLead.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          activity_type: type,
          activity_outcome: outcome,
          activity_notes: notes,
          crm_status: outcome === 'won' ? 'won' : (outcome === 'not_interested' ? 'not_interested' : state.activeLead.crm_status)
        })
      });

      showToast('تم تسجيل التفاعل بنجاح', 'success');
      openLeadDrawer(state.activeLead.id);
    });

    // Quick Call Modal Actions
    document.getElementById('btnCloseCallModal')?.addEventListener('click', closeQuickCallModal);
    document.getElementById('btnCancelCallModal')?.addEventListener('click', closeQuickCallModal);
    document.getElementById('btnSaveQuickCall')?.addEventListener('click', async () => {
      if (!state.quickCallLeadId) return;
      const outcome = document.getElementById('quickCallOutcome').value;
      const notes = document.getElementById('quickCallNotes').value;
      const nextDate = document.getElementById('quickCallNextDate').value;

      let newStatus = 'contact_today';
      if (outcome === 'won') newStatus = 'won';
      else if (outcome === 'not_interested') newStatus = 'not_interested';
      else if (outcome === 'interested') newStatus = 'in_negotiation';
      else if (outcome === 'call_later' || outcome === 'meeting_scheduled') newStatus = 'followup_today';
      else if (outcome === 'no_answer') newStatus = 'contacted_awaiting';

      await api(`/api/leads/${state.quickCallLeadId}`, {
        method: 'PUT',
        body: JSON.stringify({
          activity_type: 'call',
          activity_outcome: outcome,
          activity_notes: notes,
          crm_status: newStatus,
          next_followup_date: nextDate || null,
          recalculate_score: true
        })
      });

      showToast('تم تسجيل نتيجة المكالمة وتحديث حالة العميل', 'success');
      closeQuickCallModal();
      if (state.currentPage === 'all-leads') loadLeads();
      else if (state.currentPage === 'today-followups') loadFollowupWorkspace(state.currentWorkspaceTab);
      else if (state.currentPage === 'pipeline') loadPipelineKanban();
      else loadDashboard();
    });

    // Import Center File Drop & Change
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    fileInput?.addEventListener('change', e => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    if (dropZone) {
      dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
      });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFileSelect(e.dataTransfer.files[0]);
        }
      });
    }

    // Paste Excel Modal
    document.getElementById('btnOpenPasteModal')?.addEventListener('click', () => {
      document.getElementById('pasteDataTextarea').value = '';
      document.getElementById('pasteTableModal').classList.add('open');
    });
    document.getElementById('btnClosePasteModal')?.addEventListener('click', () => {
      document.getElementById('pasteTableModal').classList.remove('open');
    });
    document.getElementById('btnCancelPasteModal')?.addEventListener('click', () => {
      document.getElementById('pasteTableModal').classList.remove('open');
    });
    document.getElementById('btnProcessPastedData')?.addEventListener('click', () => {
      const text = document.getElementById('pasteDataTextarea').value.trim();
      if (!text) {
        showToast('يرجى لصق بيانات الجدول أولاً', 'error');
        return;
      }

      // Parse TSV/CSV text
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        showToast('البيانات الملصقة يجب أن تحتوي على صف عناوين الأعمدة وصف بيانات واحد على الأقل', 'error');
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(',') ? ',' : ';');
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

      const jsonRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const row = {};
        headers.forEach((h, idx) => {
          row[h] = cells[idx] || '';
        });
        jsonRows.push(row);
      }

      document.getElementById('pasteTableModal').classList.remove('open');
      processRawImportData(jsonRows, 'Pasted_Excel_Data');
    });

    // Import Step Navigation Buttons
    document.getElementById('btnBackToStep1')?.addEventListener('click', () => showImportStep(1));
    document.getElementById('btnProceedToStep3')?.addEventListener('click', proceedToImportPreview);
    document.getElementById('btnBackToStep2')?.addEventListener('click', () => showImportStep(2));
    document.getElementById('btnCommitImport')?.addEventListener('click', commitImport);
    document.getElementById('btnDownloadTemplate')?.addEventListener('click', downloadSampleTemplate);

    // Settings Sliders
    ['Timeline', 'Package', 'Quality', 'Contact', 'Feedback'].forEach(key => {
      const input = document.getElementById(`weight${key}`);
      const val = document.getElementById(`weight${key}Val`);
      input?.addEventListener('input', () => {
        val.textContent = input.value + '%';
      });
    });

    document.getElementById('btnSaveScoringSettings')?.addEventListener('click', async () => {
      const scoring_weights = {
        timeline: parseInt(document.getElementById('weightTimeline').value, 10),
        package: parseInt(document.getElementById('weightPackage').value, 10),
        lead_quality: parseInt(document.getElementById('weightQuality').value, 10),
        contact_completeness: parseInt(document.getElementById('weightContact').value, 10),
        feedback: parseInt(document.getElementById('weightFeedback').value, 10)
      };

      const thresholds = {
        hot: parseInt(document.getElementById('settingThreshHot').value, 10),
        warm: parseInt(document.getElementById('settingThreshWarm').value, 10),
        nurture: 35
      };

      const max_unanswered_attempts = parseInt(document.getElementById('settingMaxAttempts').value, 10);
      const recalculate = document.getElementById('chkRecalcLeads').checked;

      await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          ...state.settings,
          scoring_weights,
          thresholds,
          max_unanswered_attempts,
          recalculate_all_leads: recalculate
        })
      });

      showToast('تم حفظ وتطبيق قواعد التقييم بنجاح', 'success');
      loadDashboard();
    });

    // Export Full Backup JSON
    document.getElementById('btnExportFullBackup')?.addEventListener('click', async () => {
      const leadsData = await api('/api/leads');
      const settingsData = await api('/api/settings');
      const backup = {
        exported_at: new Date().toISOString(),
        company: 'Smart Address Egypt',
        leads: leadsData.leads,
        settings: settingsData
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Smart_Address_CRM_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('تم تصدير النسخة الاحتياطية بنجاح', 'success');
    });

    // Seed Sample Leads
    document.getElementById('btnSeedSampleLeads')?.addEventListener('click', async () => {
      if (!confirm('هل تريد إضافة بيانات تجريبية واقعية لباقات Smart Address Egypt؟')) return;
      const res = await api('/api/sample-data/seed', { method: 'POST' });
      showToast(`تمت إضافة ${res.seededCount} عميل تجريبي بنجاح`, 'success');
      loadDashboard();
    });

    // Retry Connection Button
    document.getElementById('btnRetryConnection')?.addEventListener('click', async () => {
      showToast('جاري فحص الاتصال بالخادم...', 'info');
      const isOnline = await checkServerHealth();
      if (isOnline) {
        showToast('تمت استعادة الاتصال بالخادم بنجاح! 🚀', 'success');
        navigateTo(state.currentPage);
      } else {
        showToast('تعذر الاتصال. تأكد من تشغيل start_crm.bat أولاً.', 'error');
      }
    });
  }

  // Periodic Health Check & Auto-Reconnect
  setInterval(async () => {
    const banner = document.getElementById('connectionErrorBanner');
    // If banner is currently visible (disconnected), ping every 6 seconds to auto-recover
    if (banner && banner.style.display !== 'none') {
      const isOnline = await checkServerHealth();
      if (isOnline) {
        showToast('تمت استعادة الاتصال بالخادم تلقائياً! 🚀', 'success');
        navigateTo(state.currentPage);
      }
    }
  }, 6000);

  // Initialize Application on DOM Ready
  document.addEventListener('DOMContentLoaded', () => {
    initEvents();
    navigateTo('dashboard');
  });

})();
