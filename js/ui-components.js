/**
 * Smart Address Egypt CRM - Interactive UI Modals, Drawer & Notification System
 */

class UIComponents {
  constructor() {
    this.activeLeadId = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // Backdrop clicks close drawers and modals
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('drawer-backdrop')) {
        this.closeLeadDrawer();
      }
      if (e.target.classList.contains('modal-overlay')) {
        this.closeAllModals();
      }
    });

    // ESC key closes modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeLeadDrawer();
        this.closeAllModals();
      }
    });
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#10B981" fill="none" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#EF4444" fill="none" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#F59E0B" fill="none" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    } else {
      iconSvg = `<svg viewBox="0 0 24 24" width="20" height="20" stroke="#38BDF8" fill="none" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `
      <div style="flex-shrink:0;">${iconSvg}</div>
      <div style="flex:1;">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // --- Lead Details Drawer ---
  async openLeadDrawer(leadId) {
    this.activeLeadId = leadId;
    const lead = await window.crmDb.getLeadById(leadId);
    if (!lead) return;

    const drawer = document.getElementById('lead-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer || !backdrop) return;

    // Populate drawer header
    document.getElementById('drawer-lead-name').textContent = lead.full_name || 'عميل بدون اسم';
    document.getElementById('drawer-lead-job').textContent = [lead.job_title, lead.package].filter(Boolean).join(' • ') || 'استفسار عن الخدمات';

    // Populate Score Pill
    const scorePill = document.getElementById('drawer-score-pill');
    scorePill.textContent = lead.lead_score || 50;
    scorePill.className = `score-pill score-${lead.lead_priority || 'warm'}`;

    // Priority & Status Select
    const statusSelect = document.getElementById('drawer-status-select');
    statusSelect.value = lead.crm_status || 'جديد';

    // Direct Action Links
    const callBtn = document.getElementById('drawer-call-btn');
    if (lead.phone_normalized) {
      callBtn.href = `tel:+${lead.phone_normalized}`;
      callBtn.style.display = 'inline-flex';
    } else {
      callBtn.style.display = 'none';
    }

    const waBtn = document.getElementById('drawer-wa-btn');
    if (lead.phone_normalized) {
      const waText = encodeURIComponent(lead.whatsapp_draft || `أهلاً بحضرتك ${lead.full_name}، معاك يوسف من Smart Address Egypt.`);
      waBtn.href = `https://wa.me/${lead.phone_normalized}?text=${waText}`;
      waBtn.target = '_blank';
      waBtn.style.display = 'inline-flex';
    } else {
      waBtn.style.display = 'none';
    }

    const inboxBtn = document.getElementById('drawer-inbox-btn');
    if (lead.inbox_url) {
      inboxBtn.href = lead.inbox_url;
      inboxBtn.target = '_blank';
      inboxBtn.style.display = 'inline-flex';
    } else {
      inboxBtn.style.display = 'none';
    }

    // AI & Scoring Section
    const evalObj = lead.scoring_breakdown || window.scoringEngine.evaluateLead(lead);
    document.getElementById('drawer-priority-label').textContent = evalObj.priorityLabel || lead.lead_priority;
    document.getElementById('drawer-confidence').textContent = evalObj.confidence || 'متوسطة';
    document.getElementById('drawer-action-text').textContent = lead.recommended_action || evalObj.recommendedAction;
    document.getElementById('drawer-timing-text').textContent = lead.recommended_timing || evalObj.recommendedTiming;
    document.getElementById('drawer-channel-text').textContent = lead.recommended_channel || evalObj.recommendedChannel;

    // Signals
    const posList = document.getElementById('drawer-positive-signals');
    posList.innerHTML = (evalObj.positiveSignals || []).map(s => `<li>✓ ${s}</li>`).join('') || '<li style="color:var(--text-muted)">لا توجد إشارات إيجابية بارزة</li>';

    const negList = document.getElementById('drawer-negative-signals');
    negList.innerHTML = (evalObj.negativeSignals || []).map(s => `<li>⚠ ${s}</li>`).join('') || '<li style="color:var(--emerald-won)">لا توجد إشارات سلبية أو موانع</li>';

    // WhatsApp Draft Box
    const waDraftText = document.getElementById('drawer-wa-draft');
    waDraftText.value = lead.whatsapp_draft || evalObj.whatsappDraft || '';

    // Contact and CRM details
    document.getElementById('drawer-phone').textContent = lead.phone_display || lead.phone_number || 'غير مسجل';
    document.getElementById('drawer-email').textContent = lead.email || 'غير مسجل';
    document.getElementById('drawer-work-email').textContent = lead.work_email || 'غير مسجل';
    document.getElementById('drawer-package').textContent = lead.package || 'غير محدد';
    document.getElementById('drawer-timeline').textContent = lead.start_timeline || 'غير محدد';
    document.getElementById('drawer-campaign').textContent = lead.campaign_name || 'غير محدد';
    document.getElementById('drawer-source-feedback').textContent = lead.source_feedback || 'لا توجد ملاحظات بالمصدر';

    // Notes
    document.getElementById('drawer-internal-notes').value = lead.internal_notes || '';

    // Activities timeline
    await this.renderDrawerTimeline(leadId);

    // Switch to overview tab
    this.switchDrawerTab('overview');

    // Open
    backdrop.classList.add('active');
    drawer.classList.add('active');
  }

  closeLeadDrawer() {
    const drawer = document.getElementById('lead-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) drawer.classList.remove('active');
    if (backdrop) backdrop.classList.remove('active');
    this.activeLeadId = null;
  }

  switchDrawerTab(tabName) {
    document.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.drawer-tab-content').forEach(c => c.style.display = 'none');

    const tabBtn = document.querySelector(`.drawer-tab[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(`drawer-content-${tabName}`);

    if (tabBtn) tabBtn.classList.add('active');
    if (tabContent) tabContent.style.display = 'block';
  }

  async renderDrawerTimeline(leadId) {
    const timelineContainer = document.getElementById('drawer-timeline-container');
    if (!timelineContainer) return;

    const activities = await window.crmDb.getActivitiesForLead(leadId);
    if (!activities.length) {
      timelineContainer.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:18px;">لم يتم تسجيل أي اتصالات أو متابعات سابقة لهذا العميل بعد.</div>';
      return;
    }

    timelineContainer.innerHTML = activities.reverse().map(act => {
      const dateStr = new Date(act.created_at).toLocaleString('ar-EG');
      const outcomeText = this.getOutcomeLabel(act.outcome);
      return `
        <div class="timeline-item">
          <div class="timeline-time">${dateStr}</div>
          <div style="font-weight:700; color:var(--blue-light); margin-bottom:4px;">${outcomeText}</div>
          ${act.notes ? `<div style="color:var(--text-secondary); font-size:12.5px;">${act.notes}</div>` : ''}
          ${act.next_followup_set ? `<div style="color:var(--amber-hot); font-size:11.5px; margin-top:4px;">📅 تم جدولة متابعة: ${new Date(act.next_followup_set).toLocaleString('ar-EG')}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  getOutcomeLabel(outcome) {
    const map = {
      no_answer: 'لم يرد على الاتصال',
      interested: 'مهتم جداً بالخدمة',
      not_interested: 'رد - غير مهتم بالخدمة',
      requested_quote: 'طلب عرض سعر ومواصفات تفصيلية',
      call_later: 'طلب الاتصال في وقت لاحق',
      invalid_number: 'الرقم غير متاح أو خطأ',
      meeting_scheduled: 'تم حجز موعد / زيارة للمقر',
      converted: 'تم التعاقد وسداد الدفعة',
      other: 'تواصل / إجراء آخر'
    };
    return map[outcome] || outcome;
  }

  // --- Save Drawer Changes ---
  async saveDrawerLeadChanges() {
    if (!this.activeLeadId) return;
    const lead = await window.crmDb.getLeadById(this.activeLeadId);
    if (!lead) return;

    const newStatus = document.getElementById('drawer-status-select').value;
    const internalNotes = document.getElementById('drawer-internal-notes').value;

    lead.crm_status = newStatus;
    lead.internal_notes = internalNotes;

    // If marked won or lost
    if (newStatus === 'تم التعاقد') lead.lead_score = 100;

    await window.crmDb.saveLead(lead);
    this.showToast('تم حفظ تعديلات العميل بنجاح', 'success');
    window.app.refreshActiveView();
  }

  // --- Call Logging Modal ---
  openLogCallModal(leadId) {
    this.activeLeadId = leadId;
    window.crmDb.getLeadById(leadId).then(lead => {
      if (!lead) return;
      document.getElementById('log-call-client-name').textContent = lead.full_name;
      document.getElementById('log-call-phone').textContent = lead.phone_display || lead.phone_number;
      document.getElementById('log-call-notes').value = '';
      document.getElementById('log-call-outcome').value = 'interested';
      document.getElementById('log-call-next-date').value = '';

      const modal = document.getElementById('modal-log-call');
      if (modal) modal.classList.add('active');
    });
  }

  async submitLogCall() {
    if (!this.activeLeadId) return;
    const outcome = document.getElementById('log-call-outcome').value;
    const notes = document.getElementById('log-call-notes').value;
    const nextDate = document.getElementById('log-call-next-date').value;

    const lead = await window.crmDb.getLeadById(this.activeLeadId);
    if (!lead) return;

    // Log Activity
    await window.crmDb.addActivity(this.activeLeadId, {
      activity_type: 'call',
      outcome: outcome,
      notes: notes,
      next_followup_set: nextDate ? new Date(nextDate).toISOString() : null
    });

    // Smart status & score update based on outcome
    if (outcome === 'interested') {
      lead.crm_status = 'مهتم — في مرحلة التفاوض';
      lead.lead_score = Math.min(100, Math.max(75, lead.lead_score + 15));
      lead.lead_priority = 'hot';
    } else if (outcome === 'not_interested') {
      lead.crm_status = 'غير مهتم';
      lead.lead_score = Math.min(15, lead.lead_score);
      lead.lead_priority = 'low';
      lead.lost_reason = notes || 'العميل أبلغ بعدم الاهتمام أثناء الاتصال';
    } else if (outcome === 'converted') {
      lead.crm_status = 'تم التعاقد';
      lead.lead_score = 100;
      lead.lead_priority = 'hot';
    } else if (outcome === 'meeting_scheduled') {
      lead.crm_status = 'مهتم — في مرحلة التفاوض';
      lead.lead_score = Math.min(100, Math.max(85, lead.lead_score + 20));
      lead.lead_priority = 'hot';
    } else if (outcome === 'call_later') {
      lead.crm_status = 'متابعة اليوم';
    } else if (outcome === 'no_answer') {
      lead.crm_status = 'تم التواصل — بانتظار الرد';
    } else if (outcome === 'invalid_number') {
      lead.crm_status = 'بيانات غير مكتملة';
      lead.phone_valid = false;
    }

    if (nextDate) {
      lead.next_followup_date = new Date(nextDate).toISOString();
    }

    await window.crmDb.saveLead(lead);

    this.closeAllModals();
    this.showToast('تم تسجيل نتيجة الاتصال وتحديث حالة العميل بنجاح', 'success');
    window.app.refreshActiveView();
  }

  // --- Schedule Follow-up Modal ---
  openScheduleModal(leadId) {
    this.activeLeadId = leadId;
    window.crmDb.getLeadById(leadId).then(lead => {
      if (!lead) return;
      document.getElementById('schedule-client-name').textContent = lead.full_name;

      // Suggest reasonable date
      let suggestedDate = new Date();
      if (lead.start_timeline && lead.start_timeline.includes('3')) {
        suggestedDate.setDate(suggestedDate.getDate() + 45); // 1.5 months
      } else {
        suggestedDate.setDate(suggestedDate.getDate() + 2); // 2 days
      }

      const iso = new Date(suggestedDate.getTime() - suggestedDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      document.getElementById('schedule-datetime').value = iso;
      document.getElementById('schedule-notes').value = '';

      const modal = document.getElementById('modal-schedule');
      if (modal) modal.classList.add('active');
    });
  }

  async submitSchedule() {
    if (!this.activeLeadId) return;
    const dt = document.getElementById('schedule-datetime').value;
    const notes = document.getElementById('schedule-notes').value;

    if (!dt) {
      alert('يرجى تحديد موعد المتابعة');
      return;
    }

    const lead = await window.crmDb.getLeadById(this.activeLeadId);
    if (!lead) return;

    lead.next_followup_date = new Date(dt).toISOString();
    if (notes) {
      lead.internal_notes = (lead.internal_notes ? lead.internal_notes + '\n' : '') + `[موعد مجدول: ${new Date(dt).toLocaleString('ar-EG')}] ${notes}`;
    }

    // If future opportunity
    if (new Date(dt) > new Date(Date.now() + 30 * 24 * 3600 * 1000)) {
      lead.crm_status = 'فرص مستقبلية';
    }

    await window.crmDb.saveLead(lead);

    this.closeAllModals();
    this.showToast('تم جدولة موعد المتابعة بنجاح', 'success');
    window.app.refreshActiveView();
  }

  closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }
}

// Global instance
window.uiComponents = new UIComponents();
