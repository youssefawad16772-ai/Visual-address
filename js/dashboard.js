/**
 * Smart Address Egypt CRM - Main Dashboard & Real Analytics Engine
 * Dynamic Chart.js charts, interactive drill-down KPIs, and real database metrics
 */

class DashboardManager {
  constructor() {
    this.charts = {};
  }

  async renderDashboard() {
    const allLeads = await window.crmDb.getAllLeads(true); // include archived for KPIs
    const activeLeads = allLeads.filter(l => !l.is_archived);
    const archivedLeads = allLeads.filter(l => l.is_archived);

    this.calculateAndRenderKPIs(allLeads, activeLeads, archivedLeads);
    this.renderCharts(activeLeads, allLeads);
  }

  calculateAndRenderKPIs(allLeads, activeLeads, archivedLeads) {
    const totalCount = allLeads.length;
    const newCount = activeLeads.filter(l => l.crm_status === 'جديد' || l.crm_status === 'تواصل اليوم').length;
    const hotCount = activeLeads.filter(l => l.lead_priority === 'hot').length;
    const warmCount = activeLeads.filter(l => l.lead_priority === 'warm').length;

    // Follow-ups today & overdue
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    let dueTodayCount = 0;
    let overdueCount = 0;

    activeLeads.forEach(l => {
      if (l.next_followup_date) {
        const fDate = new Date(l.next_followup_date);
        if (fDate < now && fDate < todayStart) {
          overdueCount++;
        } else if (fDate >= todayStart && fDate <= todayEnd) {
          dueTodayCount++;
        } else if (fDate < now) {
          // overdue earlier today
          dueTodayCount++;
        }
      }
    });

    const interestedCount = activeLeads.filter(l => 
      l.crm_status === 'مهتم — في مرحلة التفاوض' || 
      l.crm_status === 'تم التواصل — بانتظار الرد'
    ).length;

    const negotiationCount = activeLeads.filter(l => l.crm_status === 'مهتم — في مرحلة التفاوض').length;
    const wonCount = activeLeads.filter(l => l.crm_status === 'تم التعاقد').length;
    const notInterestedCount = activeLeads.filter(l => l.crm_status === 'غير مهتم').length;
    const archivedCount = archivedLeads.length;

    // Conversion rate: Won / (Total Qualified or Total Leads)
    const conversionRate = totalCount > 0 ? ((wonCount / totalCount) * 100).toFixed(1) : 0;

    // Update DOM
    this.setElText('kpi-total', totalCount);
    this.setElText('kpi-new', newCount);
    this.setElText('kpi-hot', hotCount);
    this.setElText('kpi-warm', warmCount);
    this.setElText('kpi-due-today', dueTodayCount);
    this.setElText('kpi-overdue', overdueCount);
    this.setElText('kpi-interested', interestedCount);
    this.setElText('kpi-negotiation', negotiationCount);
    this.setElText('kpi-won', wonCount);
    this.setElText('kpi-not-interested', notInterestedCount);
    this.setElText('kpi-archived', archivedCount);
    this.setElText('kpi-conversion', `${conversionRate}%`);
  }

  setElText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  renderCharts(leads, allLeads) {
    if (!window.Chart) {
      console.warn('Chart.js not loaded');
      return;
    }

    // Palette
    const navyBorder = '#1E3358';
    const textLight = '#CBD5E1';

    Chart.defaults.color = textLight;
    Chart.defaults.font.family = "'Cairo', sans-serif";

    // 1. Leads by CRM Status (Doughnut)
    this.renderStatusChart(leads);

    // 2. Lead Quality & Priority Distribution (Bar)
    this.renderPriorityChart(leads);

    // 3. Leads by Campaign (Horizontal Bar)
    this.renderCampaignChart(leads);

    // 4. Leads by Advertising Platform (Pie)
    this.renderPlatformChart(leads);

    // 5. Conversion Rates by Campaign (Bar)
    this.renderCampaignConversionChart(allLeads);

    // 6. Reasons for Lost Opportunities (Bar)
    this.renderLostReasonsChart(allLeads);
  }

  renderStatusChart(leads) {
    const ctx = document.getElementById('chart-status');
    if (!ctx) return;
    if (this.charts.status) this.charts.status.destroy();

    const counts = {};
    leads.forEach(l => {
      const st = l.crm_status || 'جديد';
      counts[st] = (counts[st] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    const colors = [
      '#38BDF8', '#F59E0B', '#EF4444', '#A855F7', '#3B82F6',
      '#10B981', '#64748B', '#F97316', '#06B6D4', '#EC4899'
    ];

    this.charts.status = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels.length ? labels : ['لا توجد بيانات'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: data.length ? colors.slice(0, labels.length) : ['#1E3358'],
          borderColor: '#111F38',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14 } }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0 && labels.length) {
            const clickedLabel = labels[elements[0].index];
            window.app.navigate('all-leads', { statusFilter: clickedLabel });
          }
        }
      }
    });
  }

  renderPriorityChart(leads) {
    const ctx = document.getElementById('chart-priority');
    if (!ctx) return;
    if (this.charts.priority) this.charts.priority.destroy();

    const hot = leads.filter(l => l.lead_priority === 'hot').length;
    const warm = leads.filter(l => l.lead_priority === 'warm').length;
    const nurture = leads.filter(l => l.lead_priority === 'nurture').length;
    const low = leads.filter(l => l.lead_priority === 'low').length;

    this.charts.priority = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['عملاء ساخنون (Hot)', 'عملاء دافئون (Warm)', 'عملاء رعاية (Nurture)', 'أولوية منخفضة (Low)'],
        datasets: [{
          label: 'عدد العملاء',
          data: [hot, warm, nurture, low],
          backgroundColor: ['#F59E0B', '#3B82F6', '#A855F7', '#64748B'],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0) {
            const priorities = ['hot', 'warm', 'nurture', 'low'];
            const clicked = priorities[elements[0].index];
            window.app.navigate('all-leads', { priorityFilter: clicked });
          }
        }
      }
    });
  }

  renderCampaignChart(leads) {
    const ctx = document.getElementById('chart-campaigns');
    if (!ctx) return;
    if (this.charts.campaigns) this.charts.campaigns.destroy();

    const counts = {};
    leads.forEach(l => {
      const camp = l.campaign_name || 'حملة غير محددة';
      counts[camp] = (counts[camp] || 0) + 1;
    });

    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);

    this.charts.campaigns = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['لا توجد حملات مسجلة'],
        datasets: [{
          label: 'عدد العملاء',
          data: data.length ? data : [0],
          backgroundColor: '#2563EB',
          borderRadius: 6
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          y: { grid: { display: false } }
        },
        onClick: (evt, elements) => {
          if (elements.length > 0 && labels.length) {
            const clickedCampaign = labels[elements[0].index];
            window.app.navigate('all-leads', { searchFilter: clickedCampaign });
          }
        }
      }
    });
  }

  renderPlatformChart(leads) {
    const ctx = document.getElementById('chart-platforms');
    if (!ctx) return;
    if (this.charts.platforms) this.charts.platforms.destroy();

    const counts = {};
    leads.forEach(l => {
      let p = l.platform || 'Meta Ads';
      if (p.toLowerCase().includes('fb') || p.toLowerCase().includes('facebook')) p = 'فيسبوك (Facebook)';
      else if (p.toLowerCase().includes('ig') || p.toLowerCase().includes('instagram')) p = 'إنستجرام (Instagram)';
      else if (p.toLowerCase().includes('google')) p = 'إعلانات جوجل (Google)';
      else if (l.is_organic) p = 'أورجانيك (Organic)';
      counts[p] = (counts[p] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = Object.values(counts);

    this.charts.platforms = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels.length ? labels : ['لا توجد بيانات'],
        datasets: [{
          data: data.length ? data : [1],
          backgroundColor: ['#1877F2', '#E1306C', '#00A4EF', '#10B981'],
          borderColor: '#111F38',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
  }

  renderCampaignConversionChart(leads) {
    const ctx = document.getElementById('chart-conversion-campaign');
    if (!ctx) return;
    if (this.charts.conversionCampaign) this.charts.conversionCampaign.destroy();

    const campTotals = {};
    const campWon = {};

    leads.forEach(l => {
      const camp = l.campaign_name || 'أخرى';
      campTotals[camp] = (campTotals[camp] || 0) + 1;
      if (l.crm_status === 'تم التعاقد') {
        campWon[camp] = (campWon[camp] || 0) + 1;
      }
    });

    const campaigns = Object.keys(campTotals).slice(0, 5);
    const rates = campaigns.map(c => {
      const tot = campTotals[c] || 1;
      const won = campWon[c] || 0;
      return ((won / tot) * 100).toFixed(1);
    });

    this.charts.conversionCampaign = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: campaigns.length ? campaigns : ['لا توجد حملات'],
        datasets: [{
          label: 'نسبة التحويل (%)',
          data: rates.length ? rates : [0],
          backgroundColor: '#10B981',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  renderLostReasonsChart(leads) {
    const ctx = document.getElementById('chart-lost-reasons');
    if (!ctx) return;
    if (this.charts.lostReasons) this.charts.lostReasons.destroy();

    const reasons = {};
    leads.filter(l => l.crm_status === 'خسر' || l.crm_status === 'غير مهتم').forEach(l => {
      const r = l.lost_reason || l.source_feedback || 'سعر غير مناسب / غير مهتم';
      // simplify reason
      let key = 'غير محدد';
      if (r.includes('سعر') || r.includes('غالي')) key = 'السعر مرتفع';
      else if (r.includes('منافس') || r.includes('مكان')) key = 'اختار منافس / الموقع الجغرافي';
      else if (r.includes('تأسيس') || r.includes('سجل')) key = 'لا يحتاج سجل تجاري حالياً';
      else if (r.includes('رقم') || r.includes('تواصل')) key = 'تعذر الوصول للعميل';
      else key = 'عدم اهتمام بالخدمة';

      reasons[key] = (reasons[key] || 0) + 1;
    });

    const labels = Object.keys(reasons);
    const data = Object.values(reasons);

    this.charts.lostReasons = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels.length ? labels : ['لا توجد فرص خاسرة مسجلة'],
        datasets: [{
          label: 'عدد العملاء',
          data: data.length ? data : [0],
          backgroundColor: '#EF4444',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// Global instance
window.dashboardManager = new DashboardManager();
