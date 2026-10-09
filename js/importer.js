/**
 * Smart Address Egypt CRM - Excel & CSV Import Center
 * Full parsing with SheetJS, intelligent alias auto-mapping, validation, duplicate handling, and auditing
 */

class LeadImporter {
  constructor() {
    this.currentRawRows = [];
    this.currentHeaders = [];
    this.currentMappings = {};
    this.currentFileName = '';
    this.previewLeads = [];
    this.duplicateMap = new Map(); // existing leads mapped by phone & email

    // Standard CRM Fields & their Fuzzy Aliases
    this.fieldDefinitions = {
      source_id: {
        label: 'معرّف المصدر (Source ID)',
        required: false,
        aliases: ['id', 'lead_id', 'leadid', 'source_id', 'معرف', 'كود العميل', 'رقم العميل']
      },
      created_time: {
        label: 'تاريخ الإنشاء (Created Time)',
        required: false,
        aliases: ['created_time', 'created_at', 'date', 'creation_date', 'timestamp', 'تاريخ', 'تاريخ الإنشاء', 'تاريخ التسجيل']
      },
      full_name: {
        label: 'الاسم الكامل (Full Name)',
        required: true,
        aliases: ['full_name', 'name', 'fullname', 'client_name', 'الاسم', 'اسم العميل', 'الاسم بالكامل', 'اسم المتصل']
      },
      phone_number: {
        label: 'رقم الهاتف (Phone Number)',
        required: true,
        aliases: ['phone_number', 'phone', 'mobile', 'telephone', 'cellphone', 'الهاتف', 'المحمول', 'رقم الهاتف', 'الموبايل', 'رقم الموبايل', 'تليفون']
      },
      email: {
        label: 'البريد الإلكتروني (Personal Email)',
        required: false,
        aliases: ['email', 'personal_email', 'mail', 'البريد', 'الإيميل', 'البريد الإلكتروني', 'ايميل']
      },
      work_email: {
        label: 'بريد العمل (Work Email)',
        required: false,
        aliases: ['work_email', 'business_email', 'company_email', 'بريد العمل', 'ايميل الشركة']
      },
      job_title: {
        label: 'المسمى الوظيفي (Job Title)',
        required: false,
        aliases: ['job_title', 'title', 'position', 'job', 'المسمى الوظيفي', 'الوظيفة', 'المنصب']
      },
      package: {
        label: 'الباقة أو الخدمة المطلوبة (Package)',
        required: false,
        aliases: [
          'choose_your_virtual_address_package_',
          'choose_your_virtual_address_package',
          'package',
          'service',
          'plan',
          'virtual_address_package',
          'الباقة',
          'الباقة المطلوبة',
          'الخدمة المطلوبة',
          'نوع الخدمة',
          'باقة العنوان الافتراضي'
        ]
      },
      start_timeline: {
        label: 'موعد البدء المتوقع (Start Timeline)',
        required: false,
        aliases: [
          'when_do_you_want_to_start_',
          'when_do_you_want_to_start',
          'start_date',
          'timeline',
          'start_time',
          'موعد البدء',
          'متى تريد البدء',
          'تاريخ البدء المتوقع',
          'توقيت البدء'
        ]
      },
      source_lead_status: {
        label: 'حالة العميل بالمصدر (Lead Status)',
        required: false,
        aliases: ['lead_status', 'status', 'حالة العميل', 'الحالة بالمصدر']
      },
      source_lead_quality: {
        label: 'جودة العميل بالمصدر (Lead Quality)',
        required: false,
        aliases: ['lead quality', 'lead_quality', 'quality', 'جودة العميل', 'تصنيف الجودة']
      },
      source_next_action: {
        label: 'الإجراء القادم بالمصدر (Next Action)',
        required: false,
        aliases: ['next action', 'next_action', 'action', 'الاجراء التالي', 'الخطوة التالية']
      },
      source_feedback: {
        label: 'الملاحظات والتعليقات بالمصدر (Feedback)',
        required: false,
        aliases: ['fedback', 'feedback', 'notes', 'comments', 'تعليق', 'ملاحظات', 'الفيدباك', 'رد العميل']
      },
      platform: {
        label: 'المنصة الإعلانية (Platform)',
        required: false,
        aliases: ['platform', 'source', 'channel', 'المنصة', 'المصدر', 'قناة الإعلان']
      },
      campaign_name: {
        label: 'اسم الحملة (Campaign Name)',
        required: false,
        aliases: ['campaign_name', 'campaign', 'اسم الحملة', 'الحملة الإعلانية']
      },
      campaign_id: {
        label: 'معرّف الحملة (Campaign ID)',
        required: false,
        aliases: ['campaign_id', 'معرف الحملة']
      },
      adset_name: {
        label: 'المجموعة الإعلانية (Adset Name)',
        required: false,
        aliases: ['adset_name', 'adset', 'المجموعة الإعلانية']
      },
      adset_id: {
        label: 'معرّف المجموعة الإعلانية (Adset ID)',
        required: false,
        aliases: ['adset_id', 'معرف المجموعة']
      },
      ad_name: {
        label: 'اسم الإعلان (Ad Name)',
        required: false,
        aliases: ['ad_name', 'ad', 'اسم الإعلان']
      },
      ad_id: {
        label: 'معرّف الإعلان (Ad ID)',
        required: false,
        aliases: ['ad_id', 'معرف الإعلان']
      },
      form_name: {
        label: 'اسم النموذج (Form Name)',
        required: false,
        aliases: ['form_name', 'اسم الفورم', 'اسم النموذج']
      },
      form_id: {
        label: 'معرّف النموذج (Form ID)',
        required: false,
        aliases: ['form_id', 'معرف الفورم']
      },
      is_organic: {
        label: 'أورجانيك (Is Organic)',
        required: false,
        aliases: ['is_organic', 'organic', 'مجاني']
      },
      inbox_url: {
        label: 'رابط المحادثة (Inbox URL)',
        required: false,
        aliases: ['inbox_url', 'inbox', 'fb_inbox', 'messenger_url', 'رابط المحادثة', 'شات فيسبوك']
      }
    };
  }

  /**
   * Parse File (.xlsx, .xls, .csv)
   */
  async parseFile(file) {
    this.currentFileName = file.name;
    const extension = file.name.split('.').pop().toLowerCase();

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      if (extension === 'csv') {
        reader.onload = (e) => {
          try {
            const content = e.target.result;
            const rows = this.parseCsvString(content);
            this.processParsedRawData(rows);
            resolve(this.getSummary());
          } catch (err) {
            reject(new Error('فشل قراءة ملف CSV: ' + err.message));
          }
        };
        reader.readAsText(file, 'UTF-8');
      } else {
        // Excel .xlsx or .xls
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            if (!window.XLSX) throw new Error('مكتبة SheetJS غير محملة');
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
            this.processParsedRawData(rows);
            resolve(this.getSummary());
          } catch (err) {
            reject(new Error('فشل قراءة ملف Excel: ' + err.message));
          }
        };
        reader.readAsArrayBuffer(file);
      }
    });
  }

  /**
   * Parse Pasted Tabular Data from Clipboard
   */
  parsePastedData(text) {
    this.currentFileName = 'بيانات ملصوقة - ' + new Date().toLocaleTimeString('ar-EG');
    const rows = this.parseTabOrCommaString(text);
    this.processParsedRawData(rows);
    return this.getSummary();
  }

  parseTabOrCommaString(text) {
    if (!text || !text.trim()) return [];
    const lines = text.trim().split(/\r?\n/);
    if (!lines.length) return [];
    const isTab = lines[0].includes('\t');
    const separator = isTab ? '\t' : (lines[0].includes(',') ? ',' : ';');

    return lines.map(line => {
      if (separator === '\t') return line.split('\t').map(c => c.trim());
      return this.parseCsvLine(line, separator);
    });
  }

  parseCsvString(csvText) {
    const lines = csvText.trim().split(/\r?\n/);
    if (!lines.length) return [];
    return lines.map(line => this.parseCsvLine(line, ','));
  }

  parseCsvLine(text, delimiter = ',') {
    const result = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  }

  /**
   * Normalize and map headers
   */
  processParsedRawData(rawRows) {
    if (!rawRows || rawRows.length < 2) {
      throw new Error('الملف فارغ أو لا يحتوي على صفوف بيانات كافية (مطلوب على الأقل صف العناوين وصف بيانات).');
    }

    // Header row might be row 0
    let headerRowIdx = 0;
    // Check if first row is empty or numeric
    while (headerRowIdx < rawRows.length && (!rawRows[headerRowIdx] || rawRows[headerRowIdx].every(c => !c || String(c).trim() === ''))) {
      headerRowIdx++;
    }

    this.currentHeaders = rawRows[headerRowIdx].map(h => String(h || '').trim());
    this.currentRawRows = rawRows.slice(headerRowIdx + 1).filter(r => r && r.some(c => c !== null && String(c).trim() !== ''));

    // Auto-map headers
    this.currentMappings = this.autoMapHeaders(this.currentHeaders);

    // Build preview leads
    this.buildPreviewLeads();
  }

  autoMapHeaders(headers) {
    const mappings = {}; // crmField -> headerIndex

    Object.keys(this.fieldDefinitions).forEach(crmField => {
      const def = this.fieldDefinitions[crmField];
      const matchIndex = headers.findIndex(header => {
        const hNorm = this.cleanString(header);
        return def.aliases.some(alias => {
          const aNorm = this.cleanString(alias);
          return hNorm === aNorm || hNorm.includes(aNorm) || aNorm.includes(hNorm);
        });
      });

      if (matchIndex !== -1) {
        mappings[crmField] = matchIndex;
      }
    });

    return mappings;
  }

  cleanString(str) {
    return String(str || '')
      .toLowerCase()
      .trim()
      .replace(/[\s\-_]/g, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');
  }

  updateMapping(crmField, headerIndex) {
    if (headerIndex === -1 || headerIndex === null) {
      delete this.currentMappings[crmField];
    } else {
      this.currentMappings[crmField] = parseInt(headerIndex, 10);
    }
    this.buildPreviewLeads();
  }

  /**
   * Build preview leads and check duplicates & anomalies
   */
  async buildPreviewLeads() {
    const existingLeads = await window.crmDb.getAllLeads(true);
    const existingPhones = new Map();
    const existingEmails = new Map();
    const existingSourceIds = new Map();

    existingLeads.forEach(l => {
      if (l.phone_normalized) existingPhones.set(l.phone_normalized, l);
      if (l.email) existingEmails.set(l.email.toLowerCase().trim(), l);
      if (l.source_id) existingSourceIds.set(String(l.source_id).trim(), l);
    });

    const batchId = 'batch_' + Date.now();
    const previewList = [];

    this.currentRawRows.forEach((row, rowIndex) => {
      const rawRowObj = {};
      this.currentHeaders.forEach((h, colIdx) => {
        rawRowObj[h || `عمود_${colIdx + 1}`] = row[colIdx] !== undefined ? row[colIdx] : '';
      });

      // Extract mapped values
      const getVal = (field) => {
        const colIdx = this.currentMappings[field];
        if (colIdx !== undefined && row[colIdx] !== undefined) {
          return String(row[colIdx]).trim();
        }
        return '';
      };

      const rawPhone = getVal('phone_number');
      const phoneEval = window.scoringEngine.normalizeEgyptianPhone(rawPhone);

      const rawEmail = getVal('email');
      const rawSourceId = getVal('source_id') || `row_${rowIndex + 1}`;
      const fullName = getVal('full_name') || 'عميل بدون اسم';

      // Check duplicates
      let isDuplicate = false;
      let matchedLead = null;
      let duplicateReason = '';

      if (phoneEval.isValid && existingPhones.has(phoneEval.normalized)) {
        isDuplicate = true;
        matchedLead = existingPhones.get(phoneEval.normalized);
        duplicateReason = `رقم الهاتف مسجل مسبقاً (${matchedLead.full_name})`;
      } else if (rawEmail && existingEmails.has(rawEmail.toLowerCase())) {
        isDuplicate = true;
        matchedLead = existingEmails.get(rawEmail.toLowerCase());
        duplicateReason = `البريد الإلكتروني مسجل مسبقاً (${matchedLead.full_name})`;
      } else if (rawSourceId && existingSourceIds.has(String(rawSourceId))) {
        isDuplicate = true;
        matchedLead = existingSourceIds.get(String(rawSourceId));
        duplicateReason = `معرف العميل ${rawSourceId} مسجل مسبقاً`;
      }

      // Format created_time
      let createdTimeVal = getVal('created_time');
      let parsedTime = new Date().toISOString();
      if (createdTimeVal) {
        const d = new Date(createdTimeVal);
        if (!isNaN(d.getTime())) parsedTime = d.toISOString();
      }

      const leadObj = {
        source_id: rawSourceId,
        created_time: parsedTime,
        imported_at: new Date().toISOString(),
        full_name: fullName,
        phone_number: rawPhone,
        phone_normalized: phoneEval.normalized,
        phone_display: phoneEval.display,
        phone_valid: phoneEval.isValid,
        phone_operator: phoneEval.operator,
        email: rawEmail,
        work_email: getVal('work_email'),
        job_title: getVal('job_title'),
        package: getVal('package'),
        start_timeline: getVal('start_timeline'),
        source_lead_status: getVal('source_lead_status'),
        source_lead_quality: getVal('source_lead_quality'),
        source_next_action: getVal('source_next_action'),
        source_feedback: getVal('source_feedback'),
        platform: getVal('platform') || 'Meta Ads',
        campaign_name: getVal('campaign_name') || 'حملة غير محددة',
        campaign_id: getVal('campaign_id'),
        adset_name: getVal('adset_name'),
        adset_id: getVal('adset_id'),
        ad_name: getVal('ad_name'),
        ad_id: getVal('ad_id'),
        form_name: getVal('form_name'),
        form_id: getVal('form_id'),
        is_organic: String(getVal('is_organic')).toLowerCase() === 'true',
        inbox_url: getVal('inbox_url'),
        import_batch_id: batchId,

        // CRM Status initial assignment
        crm_status: 'جديد',
        contact_attempts: 0,
        is_archived: false,

        // Duplicate metadata
        is_duplicate: isDuplicate,
        duplicate_matched_id: matchedLead ? matchedLead.id : null,
        duplicate_reason: duplicateReason,

        // Verbatim source preserved
        raw_source: rawRowObj
      };

      // Score this lead
      const evaluation = window.scoringEngine.evaluateLead(leadObj);
      leadObj.lead_score = evaluation.score;
      leadObj.lead_priority = evaluation.priority;
      leadObj.scoring_breakdown = evaluation;
      leadObj.recommended_action = evaluation.recommendedAction;
      leadObj.recommended_timing = evaluation.recommendedTiming;
      leadObj.recommended_channel = evaluation.recommendedChannel;
      leadObj.whatsapp_draft = evaluation.whatsappDraft;
      leadObj.confidence_level = evaluation.confidence;

      previewList.push(leadObj);
    });

    this.previewLeads = previewList;
  }

  getSummary() {
    const total = this.previewLeads.length;
    const duplicates = this.previewLeads.filter(l => l.is_duplicate).length;
    const newLeads = total - duplicates;
    const invalidPhones = this.previewLeads.filter(l => !l.phone_valid).length;
    const hotLeads = this.previewLeads.filter(l => l.lead_priority === 'hot').length;
    const warmLeads = this.previewLeads.filter(l => l.lead_priority === 'warm').length;

    return {
      fileName: this.currentFileName,
      totalRows: total,
      newLeads,
      duplicates,
      invalidPhones,
      hotLeads,
      warmLeads,
      headers: this.currentHeaders,
      mappings: this.currentMappings,
      previewSample: this.previewLeads.slice(0, 10)
    };
  }

  /**
   * Final Execute Import
   * duplicateAction: 'update' (default) | 'skip' | 'create_new'
   */
  async executeImport(duplicateAction = 'update') {
    if (!this.previewLeads || !this.previewLeads.length) {
      throw new Error('لا توجد بيانات للاستيراد');
    }

    const batchId = 'batch_' + Date.now();
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const leadsToSave = [];

    for (const lead of this.previewLeads) {
      lead.import_batch_id = batchId;

      if (lead.is_duplicate) {
        if (duplicateAction === 'skip') {
          skippedCount++;
          continue;
        } else if (duplicateAction === 'update') {
          // Fetch existing record to preserve internal notes, activities, and custom CRM edits
          const existing = await window.crmDb.getLeadById(lead.duplicate_matched_id);
          if (existing) {
            const merged = {
              ...lead,
              id: existing.id,
              // PRESERVE internal CRM fields
              crm_status: existing.crm_status || lead.crm_status,
              contact_attempts: existing.contact_attempts || 0,
              last_contact_date: existing.last_contact_date || null,
              next_followup_date: existing.next_followup_date || null,
              is_archived: existing.is_archived || false,
              internal_notes: existing.internal_notes || '',
              // Keep original import batch or reference
              previous_batch_id: existing.import_batch_id
            };
            leadsToSave.push(merged);
            updatedCount++;
            continue;
          }
        }
      }

      // New lead
      lead.id = 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      leadsToSave.push(lead);
      importedCount++;
    }

    if (leadsToSave.length > 0) {
      await window.crmDb.bulkSaveLeads(leadsToSave);
    }

    // Log Batch in History
    await window.crmDb.logBatch({
      id: batchId,
      file_name: this.currentFileName,
      total_records: this.previewLeads.length,
      imported_count: importedCount,
      updated_count: updatedCount,
      flagged_count: skippedCount,
      raw_summary: {
        total: this.previewLeads.length,
        imported: importedCount,
        updated: updatedCount,
        skipped: skippedCount,
        duplicateAction
      }
    });

    return {
      batchId,
      total: this.previewLeads.length,
      importedCount,
      updatedCount,
      skippedCount
    };
  }
}

// Global instance
window.leadImporter = new LeadImporter();
