/**
 * Smart Address Egypt CRM - Export Utilities
 * Export filtered leads to real Excel (.xlsx) and CSV with Arabic UTF-8 BOM support
 */

class LeadExporter {
  /**
   * Export an array of leads to Excel (.xlsx)
   */
  exportToExcel(leads, filename = 'smart_address_leads_export.xlsx') {
    if (!leads || !leads.length) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }

    if (!window.XLSX) {
      alert('مكتبة SheetJS غير متوفرة للتصدير إلى Excel');
      return;
    }

    // Format rows with clear Arabic headers and proper columns
    const dataRows = leads.map(l => ({
      'كود العميل': l.id,
      'معرف المصدر': l.source_id || '',
      'الاسم الكامل': l.full_name || '',
      'رقم الهاتف': l.phone_number || '',
      'الرقم المعتمد': l.phone_display || l.phone_normalized || '',
      'البريد الإلكتروني': l.email || '',
      'بريد العمل': l.work_email || '',
      'المسمى الوظيفي': l.job_title || '',
      'الباقة المطلوبة': l.package || '',
      'موعد البدء المتوقع': l.start_timeline || '',
      'درجة التأهيل (0-100)': l.lead_score || 0,
      'الأولوية': this.getPriorityLabel(l.lead_priority),
      'حالة الـ CRM': l.crm_status || 'جديد',
      'الإجراء المقترح': l.recommended_action || '',
      'موعد المتابعة القادم': l.next_followup_date ? new Date(l.next_followup_date).toLocaleString('ar-EG') : 'غير محدد',
      'عدد محاولات الاتصال': l.contact_attempts || 0,
      'تاريخ آخر اتصال': l.last_contact_date ? new Date(l.last_contact_date).toLocaleString('ar-EG') : 'لم يتم الاتصال',
      'الحملة الإعلانية': l.campaign_name || '',
      'المجموعة الإعلانية': l.adset_name || '',
      'الإعلان': l.ad_name || '',
      'المنصة': l.platform || 'Meta Ads',
      'الملاحظات الأصلية': l.source_feedback || '',
      'ملاحظات المبيعات الداخلية': l.internal_notes || '',
      'تاريخ التسجيل': l.created_time ? new Date(l.created_time).toLocaleString('ar-EG') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'العملاء المحتملون');

    // Auto-fit column widths
    const colWidths = Object.keys(dataRows[0] || {}).map(k => ({ wch: Math.max(k.length * 2, 18) }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, filename);
  }

  /**
   * Export an array of leads to CSV with UTF-8 BOM
   */
  exportToCsv(leads, filename = 'smart_address_leads_export.csv') {
    if (!leads || !leads.length) {
      alert('لا توجد بيانات لتصديرها');
      return;
    }

    const headers = [
      'الاسم الكامل',
      'رقم الهاتف',
      'الباقة المطلوبة',
      'موعد البدء',
      'الدرجة',
      'الأولوية',
      'حالة CRM',
      'الإجراء المقترح',
      'موعد المتابعة',
      'الحملة',
      'الملاحظات'
    ];

    const rows = leads.map(l => [
      `"${(l.full_name || '').replace(/"/g, '""')}"`,
      `"${(l.phone_number || '').replace(/"/g, '""')}"`,
      `"${(l.package || '').replace(/"/g, '""')}"`,
      `"${(l.start_timeline || '').replace(/"/g, '""')}"`,
      l.lead_score || 0,
      `"${this.getPriorityLabel(l.lead_priority)}"`,
      `"${l.crm_status || 'جديد'}"`,
      `"${(l.recommended_action || '').replace(/"/g, '""')}"`,
      `"${l.next_followup_date ? new Date(l.next_followup_date).toLocaleDateString('ar-EG') : ''}"`,
      `"${(l.campaign_name || '').replace(/"/g, '""')}"`,
      `"${(l.source_feedback || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getPriorityLabel(priority) {
    switch (priority) {
      case 'hot': return 'ساخن (Hot)';
      case 'warm': return 'دافئ (Warm)';
      case 'nurture': return 'رعاية (Nurture)';
      case 'low': return 'منخفض (Low)';
      default: return 'غير مصنف';
    }
  }
}

// Global instance
window.leadExporter = new LeadExporter();
