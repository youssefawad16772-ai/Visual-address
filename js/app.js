/**
 * Smart Address Egypt CRM - Main Controller & Application Logic
 */

class SmartAddressCRM {
  constructor() {
    this.currentView = 'dashboard';
    this.activeFilters = {
      search: '',
      status: '',
      priority: '',
      package: '',
      campaign: '',
      sort: 'score_desc'
    };
    this.selectedLeadIds = new Set();
  }

  async init() {
    console.log('Initializing Smart Address Egypt CRM...');

    // Wait for DB ready
    if (!window.crmDb.isReady) {
      await new Promise(resolve => {
        const unsub = window.crmDb.subscribe((event) => {
          if (event === 'init') {
            unsub();
            resolve();
          }
        });
      });
    }

    // Check if DB is empty, auto-seed realistic Egyptian dataset on first run
    const existing = await window.crmDb.getAllLeads(true);
    if (existing.length === 0) {
      console.log('Database empty, seeding realistic sample Egyptian leads...');
      await window.loadRealisticSampleData();
    }

    this.bindEvents();
    this.updateSidebarBadges();
    await this.navigate('dashboard');

    // React to DB changes
    window.crmDb.subscribe((event) => {
      this.updateSidebarBadges();
      if (['lead_saved', 'leads_bulk_saved', 'lead_deleted', 'lead_restored', 'backup_imported'].includes(event)) {
        this.refreshActiveView();
      }
    });
  }

  bindEvents() {
    // Navigation items
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) this.navigate(view);
      });
    });

    // Quick Search in Top Bar
    const topSearch = document.getElementById('top-search-input');
    if (topSearch) {
      topSearch.addEventListener('input', (e) => {
        this.activeFilters.search = e.target.value.trim();
        if (this.currentView !== 'all-leads') {
          this.navigate('all-leads');
        } else {
          this.renderLeadsTable();
        }
      });
    }

    // Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mobileOverlay = document.getElementById('mobile-overlay');
    if (mobileBtn && sidebar && mobileOverlay) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('mobile-open');
        mobileOverlay.classList.toggle('active');
      });
      mobileOverlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        mobileOverlay.classList.remove('active');
      });
    }

    // Global Action Buttons
    const exportExcelBtn = document.getElementById('btn-export-excel');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', () => this.handleExport('excel'));
    }

    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', () => this.handleExport('csv'));
    }

    // Lead drawer tabs
    document.querySelectorAll('.drawer-tab').forEach(t => {
      t.addEventListener('click', () => {
        const tab = t.getAttribute('data-tab');
        window.uiComponents.switchDrawerTab(tab);
      });
    });

    // Save lead changes from drawer
    const drawerSaveBtn = document.getElementById('drawer-save-btn');
    if (drawerSaveBtn) {
      drawerSaveBtn.addEventListener('click', () => window.uiComponents.saveDrawerLeadChanges());
    }

    // Drawer WhatsApp copy & send
    const copyWaBtn = document.getElementById('drawer-copy-wa-btn');
    if (copyWaBtn) {
      copyWaBtn.addEventListener('click', () => {
        const txt = document.getElementById('drawer-wa-draft').value;
        navigator.clipboard.writeText(txt).then(() => {
          window.uiComponents.showToast('تم نسخ نص رسالة الواتساب بنجاح', 'success');
        });
      });
    }
  }

  async navigate(viewName, params = {}) {
    this.currentView = viewName;

    // Update active nav class
    document.querySelectorAll('.nav-item').forEach(i => {
      i.classList.toggle('active', i.getAttribute('data-view') === viewName);
    });

    // Close mobile menu if open
    const sb = document.querySelector('.sidebar');
    if (sb) sb.classList.remove('mobile-open');
    const mo = document.getElementById('mobile-overlay');
    if (mo) mo.classList.remove('active');

    // Switch view containers
    document.querySelectorAll('.view-container').forEach(c => c.classList.remove('active'));
    const targetView = document.getElementById(`view-${viewName}`);
    if (targetView) targetView.classList.add('active');

    // Update header title
    const titles = {
      'dashboard': { title: 'نظرة عامة والتحليلات', desc: 'مؤشرات الأداء المباشرة وتدفق العملاء المحتملين' },
      'all-leads': { title: 'كل العملاء المحتملين', desc: 'جدول شامل لإدارة وتصفية وفرز العملاء وتتبع مراحل البيع' },
      'today-followups': { title: 'متابعات اليوم', desc: 'بيئة العمل اليومية لإجراء الاتصالات وتتبع المواعيد العاجلة' },
      'hot-leads': { title: 'العملاء الأكثر أولوية (Hot Leads)', desc: 'العملاء ذوو أعلى نية شراء وجاهزية للتعاقد الفوري' },
      'future-leads': { title: 'فرص مستقبلية (Nurture)', desc: 'العملاء المخططون للبدء بعد 3 أشهر ومشاريع الربع القادم' },
      'pipeline': { title: 'مراحل البيع (Pipeline)', desc: 'المسار البيعي التفاعلي لنقل العملاء حتى إتمام التعاقد' },
      'campaigns': { title: 'تحليل الحملات الإعلانية', desc: 'أداء حملات Meta Ads ومعدلات جودة وتحويل كل إعلان' },
      'import': { title: 'مركز استيراد Excel و CSV', desc: 'استيراد القوائم ومعالجة الأعمدة وكشف التكرار والتحقق' },
      'archive': { title: 'أرشيف العملاء', desc: 'العملاء المؤرشفون مع إمكانية الاستعادة الكاملة' },
      'settings': { title: 'إعدادات النظام والمزامنة', desc: 'أوزان النقاط، شروط الأولويات، ومزامنة السحابة' }
    };

    const header = titles[viewName] || { title: 'Smart Address Egypt', desc: 'CRM' };
    const h2 = document.getElementById('view-title');
    const p = document.getElementById('view-desc');
    if (h2) h2.textContent = header.title;
    if (p) p.textContent = header.desc;

    // Apply any params
    if (params.statusFilter) this.activeFilters.status = params.statusFilter;
    if (params.priorityFilter) this.activeFilters.priority = params.priorityFilter;
    if (params.searchFilter) this.activeFilters.search = params.searchFilter;

    // View specific render
    await this.renderView(viewName);
  }

  async renderView(viewName) {
    switch (viewName) {
      case 'dashboard':
        await window.dashboardManager.renderDashboard();
        break;
      case 'all-leads':
        await this.renderLeadsTable();
        break;
      case 'today-followups':
        await this.renderTodayFollowups();
        break;
      case 'hot-leads':
        this.activeFilters.priority = 'hot';
        await this.renderLeadsTable();
        break;
      case 'future-leads':
        await this.renderFutureLeads();
        break;
      case 'pipeline':
        await this.renderPipeline();
        break;
      case 'campaigns':
        await this.renderCampaignsReport();
        break;
      case 'import':
        this.renderImportCenter();
        break;
      case 'archive':
        await this.renderArchiveTable();
        break;
      case 'settings':
        await this.renderSettings();
        break;
    }
  }

  async refreshActiveView() {
    await this.renderView(this.currentView);
  }

  async updateSidebarBadges() {
    const allLeads = await window.crmDb.getAllLeads(false);
    const hotCount = allLeads.filter(l => l.lead_priority === 'hot').length;

    // Calculate due today
    const now = new Date();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const dueCount = allLeads.filter(l => {
      if (!l.next_followup_date) return false;
      const d = new Date(l.next_followup_date);
      return d <= todayEnd;
    }).length;

    const hotBadge = document.getElementById('badge-nav-hot');
    if (hotBadge) hotBadge.textContent = hotCount;

    const todayBadge = document.getElementById('badge-nav-today');
    if (todayBadge) todayBadge.textContent = dueCount;
  }

  // --- Leads Table Rendering ---
  async renderLeadsTable() {
    const leads = await window.crmDb.getAllLeads(false);
    const filtered = this.filterAndSortLeads(leads);

    const tbody = document.getElementById('leads-table-body');
    const countBadge = document.getElementById('leads-count-badge');
    if (countBadge) countBadge.textContent = `${filtered.length} من أصل ${leads.length}`;

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding: 40px;">
            <div class="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <h4>لا توجد نتائج تطابق شروط البحث أو التصفية</h4>
              <p>جرّب تعديل الفلاتر أو إفراغ خانة البحث لعرض كافة العملاء.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(lead => {
      const isSelected = this.selectedLeadIds.has(lead.id);
      const phoneDisplay = lead.phone_display || lead.phone_number || 'بدون هاتف';
      const isPhoneValid = lead.phone_valid !== false;

      // WhatsApp URL
      const waDraft = encodeURIComponent(lead.whatsapp_draft || `أهلاً بحضرتك ${lead.full_name}، معاك يوسف من Smart Address Egypt.`);
      const waUrl = lead.phone_normalized ? `https://wa.me/${lead.phone_normalized}?text=${waDraft}` : '#';
      const callUrl = lead.phone_normalized ? `tel:+${lead.phone_normalized}` : '#';

      return `
        <tr class="${isSelected ? 'row-selected' : ''}" data-lead-id="${lead.id}">
          <td style="width: 40px; text-align: center;">
            <input type="checkbox" class="custom-checkbox lead-row-check" data-id="${lead.id}" ${isSelected ? 'checked' : ''} />
          </td>
          <td>
            <div class="lead-name-cell" style="cursor:pointer;" onclick="window.uiComponents.openLeadDrawer('${lead.id}')">
              <span>${lead.full_name || 'بدون اسم'}</span>
              <span class="lead-sub-cell">${lead.job_title || 'عميل محتمل'} • ${lead.campaign_name || 'حملة عامة'}</span>
            </div>
          </td>
          <td>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-family:monospace; direction:ltr; unicode-bidi:embed; font-size:12.5px;">${phoneDisplay}</span>
              ${!isPhoneValid ? '<span style="color:var(--rose-lost);" title="رقم غير صالح أو ناقص">⚠</span>' : ''}
            </div>
          </td>
          <td>
            <div style="font-size:12px; max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${lead.package || ''}">
              ${lead.package || '<span style="color:var(--text-muted)">غير محدد</span>'}
            </div>
          </td>
          <td>
            <span class="score-pill score-${lead.lead_priority || 'warm'}">${lead.lead_score || 0}</span>
          </td>
          <td>
            <span class="badge badge-priority-${lead.lead_priority || 'low'}">
              <span class="badge-dot"></span>
              ${this.getPriorityArabicLabel(lead.lead_priority)}
            </span>
          </td>
          <td>
            <span class="badge ${this.getStatusBadgeClass(lead.crm_status)}">
              ${lead.crm_status || 'جديد'}
            </span>
          </td>
          <td>
            <div style="font-size:12px;">
              ${lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '<span style="color:var(--text-muted)">غير مجدول</span>'}
            </div>
          </td>
          <td>
            <div class="row-actions-cell">
              ${isPhoneValid && lead.phone_normalized ? `
                <a href="${callUrl}" class="btn btn-sm btn-phone btn-icon-only" title="اتصال هاتفي">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                </a>
                <a href="${waUrl}" target="_blank" class="btn btn-sm btn-whatsapp btn-icon-only" title="محادثة واتساب">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z"/></svg>
                </a>
              ` : ''}
              <button class="btn btn-sm btn-secondary btn-icon-only" title="تسجيل مكالمة / نشاط" onclick="window.uiComponents.openLogCallModal('${lead.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn btn-sm btn-secondary btn-icon-only" title="جدولة متابعة" onclick="window.uiComponents.openScheduleModal('${lead.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </button>
              <button class="btn btn-sm btn-primary" onclick="window.uiComponents.openLeadDrawer('${lead.id}')">
                التفاصيل
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Bind row check events
    document.querySelectorAll('.lead-row-check').forEach(chk => {
      chk.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        if (e.target.checked) this.selectedLeadIds.add(id);
        else this.selectedLeadIds.delete(id);
        this.updateBulkActionBar();
      });
    });

    // Select all checkbox
    const selectAll = document.getElementById('table-select-all');
    if (selectAll) {
      selectAll.checked = filtered.length > 0 && filtered.every(l => this.selectedLeadIds.has(l.id));
      selectAll.onchange = (e) => {
        if (e.target.checked) {
          filtered.forEach(l => this.selectedLeadIds.add(l.id));
        } else {
          filtered.forEach(l => this.selectedLeadIds.delete(l.id));
        }
        this.renderLeadsTable();
        this.updateBulkActionBar();
      };
    }
  }

  filterAndSortLeads(leads) {
    return leads.filter(lead => {
      // Search
      if (this.activeFilters.search) {
        const q = this.activeFilters.search.toLowerCase();
        const str = [
          lead.full_name,
          lead.phone_number,
          lead.phone_normalized,
          lead.email,
          lead.campaign_name,
          lead.job_title,
          lead.source_feedback
        ].join(' ').toLowerCase();
        if (!str.includes(q)) return false;
      }

      // Status
      if (this.activeFilters.status && lead.crm_status !== this.activeFilters.status) {
        return false;
      }

      // Priority
      if (this.activeFilters.priority && lead.lead_priority !== this.activeFilters.priority) {
        return false;
      }

      // Package
      if (this.activeFilters.package && (!lead.package || !lead.package.includes(this.activeFilters.package))) {
        return false;
      }

      // Campaign
      if (this.activeFilters.campaign && lead.campaign_name !== this.activeFilters.campaign) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (this.activeFilters.sort === 'score_desc') return (b.lead_score || 0) - (a.lead_score || 0);
      if (this.activeFilters.sort === 'score_asc') return (a.lead_score || 0) - (b.lead_score || 0);
      if (this.activeFilters.sort === 'newest') return new Date(b.created_time || 0) - new Date(a.created_time || 0);
      if (this.activeFilters.sort === 'urgency') {
        const da = a.next_followup_date ? new Date(a.next_followup_date) : new Date(9999, 1, 1);
        const db = b.next_followup_date ? new Date(b.next_followup_date) : new Date(9999, 1, 1);
        return da - db;
      }
      return 0;
    });
  }

  updateBulkActionBar() {
    const bulkBar = document.getElementById('bulk-actions-bar');
    const selectedCountSpan = document.getElementById('selected-count-span');
    if (!bulkBar) return;

    if (this.selectedLeadIds.size > 0) {
      bulkBar.style.display = 'flex';
      if (selectedCountSpan) selectedCountSpan.textContent = `تم تحديد ${this.selectedLeadIds.size} عميل`;
    } else {
      bulkBar.style.display = 'none';
    }
  }

  async applyBulkStatus(newStatus) {
    if (!this.selectedLeadIds.size) return;
    const leads = await window.crmDb.getAllLeads(true);
    const toUpdate = leads.filter(l => this.selectedLeadIds.has(l.id));

    toUpdate.forEach(l => {
      l.crm_status = newStatus;
      if (newStatus === 'تم التعاقد') l.lead_score = 100;
    });

    await window.crmDb.bulkSaveLeads(toUpdate);
    window.uiComponents.showToast(`تم تحديث حالة ${toUpdate.length} عميل إلى "${newStatus}"`, 'success');
    this.selectedLeadIds.clear();
    this.updateBulkActionBar();
    this.renderLeadsTable();
  }

  async applyBulkArchive() {
    if (!this.selectedLeadIds.size) return;
    if (!confirm(`هل أنت متأكد من رغبتك في أرشفة ${this.selectedLeadIds.size} عميل؟ يمكنك استعادتهم لاحقاً من قسم الأرشيف.`)) {
      return;
    }

    const leads = await window.crmDb.getAllLeads(true);
    const toUpdate = leads.filter(l => this.selectedLeadIds.has(l.id));

    toUpdate.forEach(l => {
      l.is_archived = true;
      l.archived_at = new Date().toISOString();
    });

    await window.crmDb.bulkSaveLeads(toUpdate);
    window.uiComponents.showToast(`تم أرشفة ${toUpdate.length} عميل بنجاح`, 'info');
    this.selectedLeadIds.clear();
    this.updateBulkActionBar();
    this.renderLeadsTable();
  }

  async handleExport(type) {
    const leads = await window.crmDb.getAllLeads(false);
    const filtered = this.filterAndSortLeads(leads);
    const listToExport = this.selectedLeadIds.size > 0 
      ? filtered.filter(l => this.selectedLeadIds.has(l.id))
      : filtered;

    if (type === 'excel') {
      window.leadExporter.exportToExcel(listToExport);
    } else {
      window.leadExporter.exportToCsv(listToExport);
    }
    window.uiComponents.showToast(`تم تصدير ${listToExport.length} سجل بنجاح`, 'success');
  }

  // --- Daily Follow-up Workspace (متابعات اليوم) ---
  async renderTodayFollowups() {
    const allLeads = await window.crmDb.getAllLeads(false);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const overdueLeads = [];
    const dueTodayLeads = [];
    const hotUncontacted = [];
    const awaitingReply = [];
    const upcomingLeads = [];
    const needsReviewLeads = [];

    allLeads.forEach(lead => {
      const attempts = lead.contact_attempts || 0;

      // Overdue & Due today
      if (lead.next_followup_date) {
        const d = new Date(lead.next_followup_date);
        if (d < todayStart) {
          overdueLeads.push(lead);
        } else if (d >= todayStart && d <= todayEnd) {
          dueTodayLeads.push(lead);
        } else if (d > todayEnd && d <= new Date(now.getTime() + 7 * 24 * 3600 * 1000)) {
          upcomingLeads.push(lead);
        }
      }

      // Hot uncontacted
      if (lead.lead_priority === 'hot' && attempts === 0 && lead.crm_status !== 'تم التعاقد' && lead.crm_status !== 'غير مهتم') {
        hotUncontacted.push(lead);
      }

      // Awaiting response
      if (lead.crm_status === 'تم التواصل — بانتظار الرد') {
        awaitingReply.push(lead);
      }

      // Needs review before archive (>= 3 attempts)
      if (attempts >= 3 && lead.crm_status !== 'تم التعاقد' && lead.crm_status !== 'غير مهتم') {
        needsReviewLeads.push(lead);
      }
    });

    this.renderFollowupCategory('overdue-container', overdueLeads, 'overdue');
    this.renderFollowupCategory('due-today-container', dueTodayLeads, 'due-today');
    this.renderFollowupCategory('hot-uncontacted-container', hotUncontacted, 'hot');
    this.renderFollowupCategory('awaiting-container', awaitingReply, 'awaiting');
    this.renderFollowupCategory('upcoming-container', upcomingLeads, 'upcoming');
    this.renderFollowupCategory('needs-review-container', needsReviewLeads, 'review');

    // Counts on tab labels
    this.setElText('cnt-overdue', overdueLeads.length);
    this.setElText('cnt-due-today', dueTodayLeads.length);
    this.setElText('cnt-hot', hotUncontacted.length);
    this.setElText('cnt-awaiting', awaitingReply.length);
    this.setElText('cnt-upcoming', upcomingLeads.length);
    this.setElText('cnt-review', needsReviewLeads.length);
  }

  renderFollowupCategory(containerId, leads, categoryType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!leads.length) {
      container.innerHTML = `
        <div style="color:var(--text-muted); padding:24px; text-align:center; background:var(--navy-card); border-radius:var(--radius-md); border:1px dashed var(--navy-border);">
          ✓ لا توجد حالات في هذا القسم حالياً. عمل رائع!
        </div>
      `;
      return;
    }

    container.innerHTML = leads.map(lead => {
      const waDraft = encodeURIComponent(lead.whatsapp_draft || `أهلاً بحضرتك ${lead.full_name}، معاك يوسف من Smart Address Egypt.`);
      const waUrl = lead.phone_normalized ? `https://wa.me/${lead.phone_normalized}?text=${waDraft}` : '#';
      const callUrl = lead.phone_normalized ? `tel:+${lead.phone_normalized}` : '#';

      return `
        <div class="followup-card card-${categoryType}">
          <div class="followup-card-header">
            <div class="followup-client-title">
              <h4>${lead.full_name || 'بدون اسم'}</h4>
              <span>${lead.job_title || 'صاحب شركة'} • ${lead.package || 'عنوان افتراضي'}</span>
            </div>
            <span class="score-pill score-${lead.lead_priority || 'warm'}">${lead.lead_score || 0}</span>
          </div>

          <div style="font-size:13px; color:var(--text-secondary); display:flex; align-items:center; gap:8px;">
            <span>📞 <strong style="direction:ltr; unicode-bidi:embed; font-family:monospace;">${lead.phone_display || lead.phone_number}</strong></span>
            <span style="font-size:11px; color:var(--text-muted);">(${lead.contact_attempts || 0} محاولات اتصال)</span>
          </div>

          <!-- Why contact -->
          <div class="followup-reason-box">
            <div class="reason-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              سبب الاتصال والمتابعة:
            </div>
            <div>${lead.recommended_action || 'متابعة لمعرفة المستجدات وعرض تفاصيل الباقة'}</div>
          </div>

          <!-- What to say in Egyptian Arabic -->
          <div class="followup-pitch-box">
            <div class="pitch-label">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              ماذا تقول للعميل (نصائح التحدث):
            </div>
            <div style="font-size:12px; line-height:1.5;">
              استفسر عن موعد تأسيس الشركة بالسجل التجاري واعرض إمكانية حجز زيارة لمعاينة المقر وقاعات الاجتماعات بالتجمع/المعادي.
            </div>
          </div>

          <!-- Action buttons -->
          <div class="followup-actions-bar">
            <div style="display:flex; gap:6px;">
              ${lead.phone_normalized ? `
                <a href="${callUrl}" class="btn btn-sm btn-phone" title="اتصال هاتفي">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  اتصال
                </a>
                <a href="${waUrl}" target="_blank" class="btn btn-sm btn-whatsapp" title="واتساب مباشر">
                  واتساب
                </a>
              ` : ''}
              <button class="btn btn-sm btn-secondary" onclick="window.uiComponents.openLogCallModal('${lead.id}')">
                تسجيل النتيجة
              </button>
            </div>
            <button class="btn btn-sm btn-secondary" onclick="window.uiComponents.openLeadDrawer('${lead.id}')">
              الملف
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Future Leads View ---
  async renderFutureLeads() {
    const allLeads = await window.crmDb.getAllLeads(false);
    const future = allLeads.filter(l => 
      l.crm_status === 'فرص مستقبلية' || 
      (l.start_timeline && (l.start_timeline.includes('3') || l.start_timeline.includes('أشهر')))
    );

    const container = document.getElementById('future-leads-container');
    if (!container) return;

    if (!future.length) {
      container.innerHTML = `
        <div class="empty-state">
          <h4>لا توجد فرص مستقبلية مسجلة حالياً</h4>
          <p>العملاء الذين يحددون بدء النشاط بعد 3 أشهر يتم إدراجهم هنا تلقائياً لجدولة متابعات في الربع القادم.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = future.map(lead => `
      <div class="crm-card" style="margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
        <div>
          <h4 style="font-size:15px; color:var(--text-main); margin-bottom:4px;">${lead.full_name}</h4>
          <p style="font-size:12px; color:var(--text-muted);">${lead.job_title || ''} • موعد البدء المتوقع: <strong style="color:var(--purple-nurture);">${lead.start_timeline}</strong></p>
          <p style="font-size:12px; color:var(--text-secondary); margin-top:4px;">📅 المتابعة المجدولة: ${lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString('ar-EG') : 'غير محددة'}</p>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-sm btn-secondary" onclick="window.uiComponents.openScheduleModal('${lead.id}')">
            إعادة جدولة
          </button>
          <button class="btn btn-sm btn-primary" onclick="window.uiComponents.openLeadDrawer('${lead.id}')">
            عرض الملف
          </button>
        </div>
      </div>
    `).join('');
  }

  // --- Pipeline / Kanban View ---
  async renderPipeline() {
    const leads = await window.crmDb.getAllLeads(false);
    const stages = [
      { id: 'جديد', title: 'عملاء جدد', color: '#38BDF8' },
      { id: 'تواصل اليوم', title: 'تواصل اليوم', color: '#FBBF24' },
      { id: 'متابعة اليوم', title: 'متابعة اليوم', color: '#F87171' },
      { id: 'تم التواصل — بانتظار الرد', title: 'بانتظار الرد', color: '#C084FC' },
      { id: 'مهتم — في مرحلة التفاوض', title: 'في مرحلة التفاوض', color: '#60A5FA' },
      { id: 'فرص مستقبلية', title: 'فرص مستقبلية', color: '#A855F7' },
      { id: 'تم التعاقد', title: 'تم التعاقد (Won)', color: '#10B981' },
      { id: 'خسر', title: 'فرص خاسرة (Lost)', color: '#EF4444' }
    ];

    const board = document.getElementById('pipeline-board');
    if (!board) return;

    board.innerHTML = stages.map(stage => {
      const stageLeads = leads.filter(l => (l.crm_status || 'جديد') === stage.id);
      return `
        <div class="pipeline-column">
          <div class="pipeline-col-header">
            <span style="font-weight:700; color:${stage.color}; display:flex; align-items:center; gap:6px;">
              <span style="width:8px; height:8px; border-radius:50%; background:${stage.color};"></span>
              ${stage.title}
            </span>
            <span class="badge" style="background:var(--navy-surface); color:var(--text-secondary);">${stageLeads.length}</span>
          </div>
          <div class="pipeline-cards-list">
            ${stageLeads.length ? stageLeads.map(l => `
              <div class="pipeline-lead-card" onclick="window.uiComponents.openLeadDrawer('${l.id}')">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
                  <strong style="color:var(--text-main); font-size:13.5px;">${l.full_name}</strong>
                  <span class="score-pill score-${l.lead_priority || 'warm'}" style="width:28px; height:20px; font-size:11px;">${l.lead_score || 0}</span>
                </div>
                <div style="font-size:11.5px; color:var(--blue-light); margin-bottom:4px;">${l.package || 'باقة افتراضية'}</div>
                <div style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between;">
                  <span>${l.campaign_name ? l.campaign_name.substring(0, 18) + '...' : ''}</span>
                  <span>${l.contact_attempts || 0} اتصالات</span>
                </div>
              </div>
            `).join('') : '<div style="color:var(--text-muted); font-size:11.5px; text-align:center; padding:16px;">لا توجد عملاء في هذه المرحلة</div>'}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Campaign Reports View ---
  async renderCampaignsReport() {
    const leads = await window.crmDb.getAllLeads(true);
    const campaignsMap = {};

    leads.forEach(l => {
      const name = l.campaign_name || 'حملة غير محددة';
      if (!campaignsMap[name]) {
        campaignsMap[name] = {
          name,
          platform: l.platform || 'Meta Ads',
          total: 0,
          hot: 0,
          won: 0,
          lost: 0,
          adsets: new Set()
        };
      }
      campaignsMap[name].total++;
      if (l.lead_priority === 'hot') campaignsMap[name].hot++;
      if (l.crm_status === 'تم التعاقد') campaignsMap[name].won++;
      if (l.crm_status === 'خسر' || l.crm_status === 'غير مهتم') campaignsMap[name].lost++;
      if (l.adset_name) campaignsMap[name].adsets.add(l.adset_name);
    });

    const tbody = document.getElementById('campaigns-table-body');
    if (!tbody) return;

    tbody.innerHTML = Object.values(campaignsMap).map(c => {
      const convRate = c.total > 0 ? ((c.won / c.total) * 100).toFixed(1) : 0;
      const hotRate = c.total > 0 ? ((c.hot / c.total) * 100).toFixed(0) : 0;
      return `
        <tr>
          <td>
            <strong>${c.name}</strong>
            <div style="font-size:11px; color:var(--text-muted);">${c.adsets.size} مجموعات إعلانية مستهدفة</div>
          </td>
          <td><span class="badge" style="background:var(--navy-surface); color:var(--blue-light);">${c.platform}</span></td>
          <td><strong>${c.total}</strong></td>
          <td><span style="color:var(--amber-hot); font-weight:700;">${c.hot} (${hotRate}%)</span></td>
          <td><span style="color:var(--emerald-won); font-weight:700;">${c.won}</span></td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-weight:700; color:var(--emerald-won);">${convRate}%</span>
              <div style="flex:1; height:6px; background:var(--navy-surface); border-radius:3px; overflow:hidden; min-width:60px;">
                <div style="width:${convRate}%; height:100%; background:var(--emerald-won);"></div>
              </div>
            </div>
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="window.app.navigate('all-leads', { searchFilter: '${c.name}' })">
              تصفية العملاء
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Import Center ---
  renderImportCenter() {
    const dropzone = document.getElementById('import-dropzone');
    const fileInput = document.getElementById('import-file-input');
    const pasteInput = document.getElementById('import-paste-input');
    const parsePasteBtn = document.getElementById('btn-parse-paste');

    if (dropzone && fileInput) {
      dropzone.onclick = () => fileInput.click();

      dropzone.ondragover = (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      };
      dropzone.ondragleave = () => dropzone.classList.remove('dragover');
      dropzone.ondrop = async (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
          await this.handleFileSelection(e.dataTransfer.files[0]);
        }
      };

      fileInput.onchange = async (e) => {
        if (e.target.files.length) {
          await this.handleFileSelection(e.target.files[0]);
        }
      };
    }

    if (parsePasteBtn && pasteInput) {
      parsePasteBtn.onclick = () => {
        const text = pasteInput.value.trim();
        if (!text) {
          alert('يرجى لصق بيانات جدولية أولاً');
          return;
        }
        try {
          const summary = window.leadImporter.parsePastedData(text);
          this.showImportPreview(summary);
        } catch (err) {
          alert('خطأ في معالجة البيانات: ' + err.message);
        }
      };
    }

    // Render Batch History
    this.renderImportHistory();
  }

  async handleFileSelection(file) {
    try {
      window.uiComponents.showToast('جاري قراءة وتحليل الملف...', 'info');
      const summary = await window.leadImporter.parseFile(file);
      this.showImportPreview(summary);
    } catch (err) {
      alert('خطأ في قراءة الملف: ' + err.message);
    }
  }

  showImportPreview(summary) {
    document.getElementById('import-step-upload').style.display = 'none';
    const previewStep = document.getElementById('import-step-preview');
    if (previewStep) previewStep.style.display = 'block';

    document.getElementById('prev-filename').textContent = summary.fileName;
    document.getElementById('prev-total').textContent = summary.totalRows;
    document.getElementById('prev-new').textContent = summary.newLeads;
    document.getElementById('prev-duplicates').textContent = summary.duplicates;
    document.getElementById('prev-invalid-phones').textContent = summary.invalidPhones;

    // Render Mapping Table
    const mapContainer = document.getElementById('import-mappings-grid');
    if (mapContainer) {
      const defs = window.leadImporter.fieldDefinitions;
      mapContainer.innerHTML = Object.keys(defs).map(crmField => {
        const def = defs[crmField];
        const mappedIdx = summary.mappings[crmField];
        return `
          <div style="background:var(--navy-surface); padding:10px 14px; border-radius:var(--radius-md); display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="font-size:12.5px; color:var(--text-main);">${def.label}</strong>
              ${def.required ? '<span style="color:var(--rose-lost)">*</span>' : ''}
            </div>
            <select class="form-select mapping-select" data-field="${crmField}" style="font-size:12px; padding:4px 8px;">
              <option value="-1">-- غير مربوط --</option>
              ${summary.headers.map((h, i) => `
                <option value="${i}" ${mappedIdx === i ? 'selected' : ''}>${h || `عمود ${i + 1}`}</option>
              `).join('')}
            </select>
          </div>
        `;
      }).join('');

      // Bind mapping change
      document.querySelectorAll('.mapping-select').forEach(sel => {
        sel.onchange = (e) => {
          const f = e.target.getAttribute('data-field');
          const idx = parseInt(e.target.value, 10);
          window.leadImporter.updateMapping(f, idx);
          this.refreshPreviewTable();
        };
      });
    }

    this.refreshPreviewTable();
  }

  refreshPreviewTable() {
    const summary = window.leadImporter.getSummary();
    const tbody = document.getElementById('import-preview-tbody');
    if (!tbody) return;

    tbody.innerHTML = summary.previewSample.map(lead => `
      <tr style="${lead.is_duplicate ? 'background:rgba(245, 158, 11, 0.08);' : ''}">
        <td><strong>${lead.full_name}</strong></td>
        <td>
          <span style="font-family:monospace; direction:ltr; unicode-bidi:embed;">${lead.phone_display || lead.phone_number}</span>
          ${!lead.phone_valid ? '<span style="color:var(--rose-lost)" title="رقم غير متوافق">⚠</span>' : ''}
        </td>
        <td>${lead.package || 'غير محدد'}</td>
        <td><span class="score-pill score-${lead.lead_priority}">${lead.lead_score}</span></td>
        <td>
          ${lead.is_duplicate 
            ? `<span class="badge" style="background:var(--amber-hot-bg); color:var(--amber-hot);">تكرار محتمل: ${lead.duplicate_reason}</span>`
            : `<span class="badge" style="background:var(--emerald-won-bg); color:var(--emerald-won);">سجل جديد</span>`
          }
        </td>
      </tr>
    `).join('');
  }

  async confirmImport() {
    const dupChecked = document.querySelector('input[name="dup-action"]:checked');
    const dupAction = (dupChecked && dupChecked.value) || 'update';
    try {
      window.uiComponents.showToast('جاري حفظ وسحب البيانات إلى النظام...', 'info');
      const res = await window.leadImporter.executeImport(dupAction);
      window.uiComponents.showToast(`تم بنجاح استيراد ${res.importedCount} عميل جديد وتحديث ${res.updatedCount} عميل مكرر.`, 'success');
      
      // Reset view
      document.getElementById('import-step-preview').style.display = 'none';
      document.getElementById('import-step-upload').style.display = 'block';
      await this.navigate('all-leads');
    } catch (err) {
      alert('خطأ أثناء الاستيراد: ' + err.message);
    }
  }

  cancelImport() {
    document.getElementById('import-step-preview').style.display = 'none';
    document.getElementById('import-step-upload').style.display = 'block';
  }

  async renderImportHistory() {
    const batches = await window.crmDb.getAllBatches();
    const tbody = document.getElementById('batches-table-body');
    if (!tbody) return;

    if (!batches.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:20px;">لا يوجد سجل استيراد سابق.</td></tr>';
      return;
    }

    tbody.innerHTML = batches.map(b => `
      <tr>
        <td><strong>${b.file_name}</strong></td>
        <td>${new Date(b.created_at).toLocaleString('ar-EG')}</td>
        <td>${b.total_records}</td>
        <td><span style="color:var(--emerald-won); font-weight:700;">+${b.imported_count}</span></td>
        <td><span style="color:var(--blue-light); font-weight:700;">${b.updated_count}</span></td>
      </tr>
    `).join('');
  }

  // --- Archive Table ---
  async renderArchiveTable() {
    const leads = await window.crmDb.getAllLeads(true);
    const archived = leads.filter(l => l.is_archived);
    const tbody = document.getElementById('archive-table-body');
    if (!tbody) return;

    if (!archived.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:40px;">سلة الأرشيف فارغة. لا توجد سجلات مؤرشفة.</td></tr>';
      return;
    }

    tbody.innerHTML = archived.map(lead => `
      <tr>
        <td><strong>${lead.full_name}</strong></td>
        <td><span style="font-family:monospace; direction:ltr; unicode-bidi:embed;">${lead.phone_display || lead.phone_number}</span></td>
        <td>${lead.crm_status || 'غير محدد'}</td>
        <td>${lead.archived_at ? new Date(lead.archived_at).toLocaleString('ar-EG') : 'مؤرشف'}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="window.app.restoreLead('${lead.id}')">
            استعادة العميل
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.app.permanentlyDeleteLead('${lead.id}')">
            حذف نهائي
          </button>
        </td>
      </tr>
    `).join('');
  }

  async restoreLead(id) {
    await window.crmDb.restoreLead(id);
    window.uiComponents.showToast('تمت استعادة العميل بنجاح إلى القائمة النشطة', 'success');
    await this.renderArchiveTable();
  }

  async permanentlyDeleteLead(id) {
    if (!confirm('تحذير: هذا الإجراء سيحذف العميل وسجل اتصالاته نهائياً من قاعدة البيانات. هل تريد الاستمرار؟')) {
      return;
    }
    await window.crmDb.deleteLead(id, true);
    window.uiComponents.showToast('تم حذف السجل نهائياً', 'info');
    await this.renderArchiveTable();
  }

  // --- Settings ---
  async renderSettings() {
    const s = await window.crmDb.getSettings();

    // Fill form
    document.getElementById('set-weight-intent').value = s.score_weights.intent;
    document.getElementById('set-weight-timeline').value = s.score_weights.timeline;
    document.getElementById('set-weight-package').value = s.score_weights.package;
    document.getElementById('set-weight-contact').value = s.score_weights.contact_validity;
    document.getElementById('set-weight-decision').value = s.score_weights.decision_maker;

    document.getElementById('set-thresh-hot').value = s.thresholds.hot;
    document.getElementById('set-thresh-warm').value = s.thresholds.warm;
    document.getElementById('set-thresh-nurture').value = s.thresholds.nurture;

    document.getElementById('set-max-attempts').value = s.max_unsuccessful_attempts;

    // Supabase
    document.getElementById('set-supabase-url').value = s.supabase_url || '';
    document.getElementById('set-supabase-key').value = s.supabase_key || '';
    document.getElementById('set-sync-enabled').checked = !!s.cloud_sync_enabled;
  }

  async saveSettingsForm() {
    const s = await window.crmDb.getSettings();

    s.score_weights.intent = parseInt(document.getElementById('set-weight-intent').value, 10);
    s.score_weights.timeline = parseInt(document.getElementById('set-weight-timeline').value, 10);
    s.score_weights.package = parseInt(document.getElementById('set-weight-package').value, 10);
    s.score_weights.contact_validity = parseInt(document.getElementById('set-weight-contact').value, 10);
    s.score_weights.decision_maker = parseInt(document.getElementById('set-weight-decision').value, 10);

    s.thresholds.hot = parseInt(document.getElementById('set-thresh-hot').value, 10);
    s.thresholds.warm = parseInt(document.getElementById('set-thresh-warm').value, 10);
    s.thresholds.nurture = parseInt(document.getElementById('set-thresh-nurture').value, 10);

    s.max_unsuccessful_attempts = parseInt(document.getElementById('set-max-attempts').value, 10);

    s.supabase_url = document.getElementById('set-supabase-url').value.trim();
    s.supabase_key = document.getElementById('set-supabase-key').value.trim();
    s.cloud_sync_enabled = document.getElementById('set-sync-enabled').checked;

    await window.crmDb.saveSettings(s);
    window.uiComponents.showToast('تم حفظ الإعدادات بنجاح وتم تطبيق القواعد', 'success');
  }

  async testSupabaseConnection() {
    const url = document.getElementById('set-supabase-url').value.trim();
    const key = document.getElementById('set-supabase-key').value.trim();

    if (!url || !key) {
      alert('يرجى إدخال عنوان URL والمفتاح أولاً');
      return;
    }

    try {
      window.uiComponents.showToast('جاري اختبار الاتصال بسحابة Supabase...', 'info');
      const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/leads?select=id&limit=1`, {
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`
        }
      });

      if (res.ok) {
        window.uiComponents.showToast('تم الاتصال بنجاح بقاعدة بيانات Supabase!', 'success');
      } else {
        const err = await res.text();
        alert('استجابة الخادم: ' + err);
      }
    } catch (e) {
      alert('فشل الاتصال: ' + e.message);
    }
  }

  async downloadFullBackup() {
    const backup = await window.crmDb.exportFullBackup();
    const str = JSON.stringify(backup, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart_address_crm_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    window.uiComponents.showToast('تم تحميل ملف النسخ الاحتياطي بنجاح', 'success');
  }

  async restoreBackupFile(inputEl) {
    if (!inputEl.files.length) return;
    const file = inputEl.files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const json = JSON.parse(e.target.result);
        await window.crmDb.importFullBackup(json);
        window.uiComponents.showToast('تم استعادة النسخة الاحتياطية بنجاح!', 'success');
        this.refreshActiveView();
      } catch (err) {
        alert('خطأ في استعادة النسخة الاحتياطية: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  async resetDatabaseConfirm() {
    if (confirm('هل أنت متأكد من تفريغ قاعدة البيانات بالكامل؟ سيتم مسح جميع العملاء وسجلات الاتصالات!')) {
      await window.crmDb.clearDatabase();
      window.uiComponents.showToast('تم تفريغ قاعدة البيانات بالكامل', 'warning');
      this.refreshActiveView();
    }
  }

  async reloadSeedData() {
    if (confirm('هل تريد إعادة تحميل البيانات التجريبية الواقعية لـ Smart Address Egypt؟')) {
      await window.loadRealisticSampleData(true);
      window.uiComponents.showToast('تم تحميل العملاء التجريبيين بنجاح', 'success');
      this.refreshActiveView();
    }
  }

  // Helpers
  getPriorityArabicLabel(p) {
    switch (p) {
      case 'hot': return 'ساخن (Hot)';
      case 'warm': return 'دافئ (Warm)';
      case 'nurture': return 'رعاية (Nurture)';
      case 'low': return 'منخفض (Low)';
      default: return 'غير محدد';
    }
  }

  getStatusBadgeClass(status) {
    switch (status) {
      case 'جديد': return 'badge-status-new';
      case 'تواصل اليوم': return 'badge-status-contact-today';
      case 'متابعة اليوم': return 'badge-status-followup-today';
      case 'تم التواصل — بانتظار الرد': return 'badge-status-awaiting';
      case 'مهتم — في مرحلة التفاوض': return 'badge-status-negotiation';
      case 'فرص مستقبلية': return 'badge-status-future';
      case 'غير مهتم': return 'badge-status-uninterested';
      case 'بيانات غير مكتملة': return 'badge-status-invalid';
      case 'بارد': return 'badge-status-cold';
      case 'تم التعاقد': return 'badge-status-won';
      case 'خسر': return 'badge-status-lost';
      default: return 'badge-status-new';
    }
  }

  setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }
}

// Global instance
window.app = new SmartAddressCRM();
document.addEventListener('DOMContentLoaded', () => window.app.init());
