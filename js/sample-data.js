/**
 * Smart Address Egypt CRM - Realistic Sample Egyptian B2B Leads Dataset
 * Tailored for Smart Address Egypt (Virtual addresses, commercial registry, meeting rooms)
 */

const SAMPLE_LEADS_DATA = [
  {
    source_id: 'meta_lead_101',
    created_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    full_name: 'مهندس حسام الدين عثمان',
    phone_number: '01023456781',
    email: 'hossam.osman@novasolutions.eg',
    work_email: 'ceo@novasolutions.eg',
    job_title: 'مؤسس ورئيس تنفيذي',
    package: 'باقة المقر الافتراضي السنوية الشاملة (تأسيس شركة + لوحة + قاعة اجتماعات)',
    start_timeline: 'فوراً خلال هذا الأسبوع',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة تأسيس الشركات وتراخيص الاستثمار - Q4',
    adset_name: 'رواد الأعمال والمدراء التنفيذيون - التجمع الخامس',
    ad_name: 'إعلان المقر الافتراضي المعتمد قانونياً',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_101',
    source_lead_status: 'جديد',
    source_lead_quality: 'High',
    source_next_action: 'Call Immediately',
    source_feedback: 'محتاج عنوان معتمد لاستخراج بطاقة ضريبية وسجل تجاري لشركة سوفت وير جديدة',
    crm_status: 'تواصل اليوم',
    contact_attempts: 0,
    is_archived: false,
    next_followup_date: new Date(Date.now() + 4 * 3600 * 1000).toISOString() // Today in 4 hours
  },
  {
    source_id: 'meta_lead_102',
    created_time: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
    full_name: 'د. رانيا عبد المنعم الشريف',
    phone_number: '01198765432',
    email: 'rania.elshereef@pharmahub.com',
    work_email: 'dr.rania@pharmahub.com',
    job_title: 'شريك إداري ومدير تسويق',
    package: 'باقة العنوان الافتراضي السنوية + باقة قاعات اجتماعات (10 ساعات)',
    start_timeline: 'خلال أسبوعين',
    platform: 'Meta Ads (Instagram)',
    campaign_name: 'حملة العناوين الافتراضية - المعادي والزمالك',
    adset_name: 'الشركات الطبية ومستحضرات التجميل',
    ad_name: 'إعلان خدمات العناوين المعتمدة لاستلام المراسلات',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_102',
    source_lead_status: 'متابعة',
    source_lead_quality: 'High',
    source_next_action: 'Send Contract Proposal',
    source_feedback: 'بتسأل عن إمكانية استلام المراسلات البنكية والحكومية وأرقام الهواتف الأرضية المباشرة',
    crm_status: 'مهتم — في مرحلة التفاوض',
    contact_attempts: 1,
    last_contact_date: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    next_followup_date: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // Overdue by 2 hours!
    is_archived: false
  },
  {
    source_id: 'meta_lead_103',
    created_time: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    full_name: 'أحمد ماهر الشناوي',
    phone_number: '01211223344',
    email: 'ahmed.maher@cairoconsult.eg',
    work_email: 'ahmed@cairoconsult.eg',
    job_title: 'استشاري نظم معلومات وإدارة مشاريع',
    package: 'باقة قاعات الاجتماعات الشهرية (20 ساعة)',
    start_timeline: 'بعد 3 شهور',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة قاعات الاجتماعات ومساحات العمل - الشيخ زايد',
    adset_name: 'الاستشاريون وأصحاب الأعمال الحرة',
    ad_name: 'إعلان قاعات اجتماعات VIP مجهزة بأحدث شاشات العرض',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_103',
    source_lead_status: 'مهتم لاحقاً',
    source_lead_quality: 'Medium',
    source_next_action: 'Follow up in 2 months',
    source_feedback: 'عقده الحالي في مكتب المعادي ينتهي بعد 3 شهور وينوي الانتقال لمقر زايد',
    crm_status: 'فرص مستقبلية',
    contact_attempts: 1,
    last_contact_date: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
    next_followup_date: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(), // In 2 months
    is_archived: false
  },
  {
    source_id: 'meta_lead_104',
    created_time: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    full_name: 'الأستاذ سامح جلال الدسوقي',
    phone_number: '01099887766',
    email: 'sameh.galal@tradewave.eg',
    work_email: 'sg@tradewave.eg',
    job_title: 'مدير عام وشريك',
    package: 'باقة المقر الافتراضي السنوية',
    start_timeline: 'فوراً',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة تأسيس الشركات وتراخيص الاستثمار - Q4',
    adset_name: 'رواد الأعمال والمدراء التنفيذيون - التجمع الخامس',
    ad_name: 'إعلان المقر الافتراضي المعتمد قانونياً',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_104',
    source_lead_status: 'جديد',
    source_lead_quality: 'High',
    source_next_action: 'Call today',
    source_feedback: 'محتاج المقر ضروري لتقديم أوراق الغرفة التجارية هذا الأسبوع',
    crm_status: 'متابعة اليوم',
    contact_attempts: 0,
    next_followup_date: new Date(Date.now() + 1 * 3600 * 1000).toISOString(), // Due today
    is_archived: false
  },
  {
    source_id: 'meta_lead_105',
    created_time: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    full_name: 'طارق عبد العزيز الفقي',
    phone_number: '01555443322',
    email: 'tarek.feky@freelance.net',
    work_email: '',
    job_title: 'مصمم جرافيك حر',
    package: 'باقة العنوان الافتراضي الأساسية',
    start_timeline: 'غير محدد',
    platform: 'Meta Ads (Instagram)',
    campaign_name: 'حملة مساحات العمل والمقرات الافتراضية',
    adset_name: 'الفريلانسرز ورواد الأعمال المنفردين',
    ad_name: 'إعلان المقرات المرنة للمستقلين',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_105',
    source_lead_status: 'غير مهتم',
    source_lead_quality: 'Low',
    source_next_action: 'Stop Followup',
    source_feedback: 'العميل قال إنه غير مهتم ووجد السعر غالي جداً ومش محتاج سجل تجاري حالياً ورفض العرض',
    crm_status: 'غير مهتم',
    contact_attempts: 2,
    last_contact_date: new Date(Date.now() - 60 * 3600 * 1000).toISOString(),
    is_archived: false
  },
  {
    source_id: 'meta_lead_106',
    created_time: new Date(Date.now() - 30 * 3600 * 1000).toISOString(),
    full_name: 'دينا مصطفى المنشاوي',
    phone_number: '01122334455',
    email: 'dina.menshawy@fintech-eg.com',
    work_email: 'dina@fintech-eg.com',
    job_title: 'مديرة عمليات وتطوير أعمال',
    package: 'باقة المقر الافتراضي السنوية الشاملة',
    start_timeline: 'خلال أسبوعين إلى شهر',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة تأسيس الشركات وتراخيص الاستثمار - Q4',
    adset_name: 'رواد الأعمال والمدراء التنفيذيون - التجمع الخامس',
    ad_name: 'إعلان المقر الافتراضي المعتمد قانونياً',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_106',
    source_lead_status: 'تم التواصل',
    source_lead_quality: 'High',
    source_next_action: 'Waiting for board approval',
    source_feedback: 'تحدثنا معها وأرسلنا العرض الفني، بانتظار موافقة مجلس الإدارة في اجتماع الخميس',
    crm_status: 'تم التواصل — بانتظار الرد',
    contact_attempts: 1,
    last_contact_date: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    next_followup_date: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    is_archived: false
  },
  {
    source_id: 'meta_lead_107',
    created_time: new Date(Date.now() - 96 * 3600 * 1000).toISOString(),
    full_name: 'م. كريم يوسف الألفي',
    phone_number: '01001122334',
    email: 'karim.elfy@alphycorp.com',
    work_email: 'karim@alphycorp.com',
    job_title: 'رئيس مجلس الإدارة',
    package: 'باقة المقر الافتراضي السنوية الشاملة',
    start_timeline: 'فوراً',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة تأسيس الشركات وتراخيص الاستثمار - Q4',
    adset_name: 'رواد الأعمال والمدراء التنفيذيون - التجمع الخامس',
    ad_name: 'إعلان المقر الافتراضي المعتمد قانونياً',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_107',
    source_lead_status: 'تم التعاقد',
    source_lead_quality: 'High',
    source_next_action: 'Handover Documents',
    source_feedback: 'تم توقيع العقد السنوي لمقر التجمع وسداد 24,000 ج.م وتسليم عقد الإيجار الموثق',
    crm_status: 'تم التعاقد',
    contact_attempts: 3,
    last_contact_date: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    is_archived: false
  },
  {
    source_id: 'meta_lead_108',
    created_time: new Date(Date.now() - 80 * 3600 * 1000).toISOString(),
    full_name: 'ياسر محمد رضوان',
    phone_number: '01288990011',
    email: 'yasser.radwan@exporteg.com',
    work_email: 'yasser@exporteg.com',
    job_title: 'مدير تصدير',
    package: 'باقة العنوان الافتراضي الأساسية',
    start_timeline: 'خلال شهر',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة العناوين الافتراضية - المعادي والزمالك',
    adset_name: 'شركات التصدير والخدمات اللوجستية',
    ad_name: 'إعلان خدمات العناوين المعتمدة لاستلام المراسلات',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_108',
    source_lead_status: 'خسر',
    source_lead_quality: 'Medium',
    source_next_action: 'Lost to competitor',
    source_feedback: 'العميل اختار منافس آخر في مدينة نصر لقرب المسافة من مقر سكنه',
    crm_status: 'خسر',
    lost_reason: 'اختار منافس آخر بسبب الموقع الجغرافي',
    contact_attempts: 2,
    last_contact_date: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    is_archived: false
  },
  {
    source_id: 'meta_lead_109',
    created_time: new Date(Date.now() - 15 * 3600 * 1000).toISOString(),
    full_name: 'هبة الله نبيل زكي',
    phone_number: '01155667789',
    email: 'heba.zaki@artisan.eg',
    work_email: '',
    job_title: 'صاحبة مشروع متجر إلكتروني',
    package: 'باقة العنوان الافتراضي السنوية',
    start_timeline: 'فوراً',
    platform: 'Meta Ads (Instagram)',
    campaign_name: 'حملة مساحات العمل والمقرات الافتراضية',
    adset_name: 'التجارة الإلكترونية والأنشطة المنزلية',
    ad_name: 'إعلان استخراج السجل والبطاقة لرواد التجارة الإلكترونية',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_109',
    source_lead_status: 'جديد',
    source_lead_quality: 'High',
    source_next_action: 'Call Today',
    source_feedback: 'محتاجة مقر رسمي للتسجيل في الفاتورة الإلكترونية وهيئة الاستثمار',
    crm_status: 'تواصل اليوم',
    contact_attempts: 0,
    next_followup_date: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    is_archived: false
  },
  {
    source_id: 'meta_lead_110',
    created_time: new Date(Date.now() - 120 * 3600 * 1000).toISOString(),
    full_name: 'عمرو إبراهيم الشناوي',
    phone_number: '0100000000', // Invalid phone intentionally
    email: 'amr.fake@mail.com',
    work_email: '',
    job_title: 'مهندس حر',
    package: 'باقة قاعات الاجتماعات',
    start_timeline: 'غير محدد',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة مساحات العمل والمقرات الافتراضية',
    adset_name: 'الفريلانسرز ورواد الأعمال المنفردين',
    ad_name: 'إعلان المقرات المرنة للمستقلين',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_110',
    source_lead_status: 'بيانات ناقصة',
    source_lead_quality: 'Low',
    source_next_action: 'Verify Number',
    source_feedback: 'الرقم غير صحيح ومكون من أصفار، محتاج مراسلة عبر الإنبوكس',
    crm_status: 'بيانات غير مكتملة',
    contact_attempts: 1,
    last_contact_date: new Date(Date.now() - 100 * 3600 * 1000).toISOString(),
    is_archived: false
  },
  {
    source_id: 'meta_lead_111',
    created_time: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    full_name: 'وائل فاروق كمال',
    phone_number: '01222334411',
    email: 'wael.kamal@e-commerce.eg',
    work_email: 'wael@e-commerce.eg',
    job_title: 'المدير التنفيذي',
    package: 'باقة المقر الافتراضي السنوية',
    start_timeline: 'خلال أسبوعين',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة تأسيس الشركات وتراخيص الاستثمار - Q4',
    adset_name: 'رواد الأعمال والمدراء التنفيذيون - التجمع الخامس',
    ad_name: 'إعلان المقر الافتراضي المعتمد قانونياً',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_111',
    source_lead_status: 'متابعة',
    source_lead_quality: 'High',
    source_next_action: 'Call Due Today',
    source_feedback: 'طلب معاينة قاعة الاجتماعات بمقر التجمع لتحديد ميعاد مع المحاسب القانوني',
    crm_status: 'متابعة اليوم',
    contact_attempts: 1,
    last_contact_date: new Date(Date.now() - 20 * 3600 * 1000).toISOString(),
    next_followup_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Due today in 30 mins
    is_archived: false
  },
  {
    source_id: 'meta_lead_112',
    created_time: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
    full_name: 'شريف عبد الحليم الباجوري',
    phone_number: '01011122233',
    email: 'sherif.bajoury@holding.eg',
    work_email: 'sb@holding.eg',
    job_title: 'مستشار مالي وقانوني',
    package: 'باقة المقر الافتراضي السنوية الشاملة',
    start_timeline: 'خلال شهر',
    platform: 'Meta Ads (Facebook)',
    campaign_name: 'حملة تأسيس الشركات وتراخيص الاستثمار - Q4',
    adset_name: 'رواد الأعمال والمدراء التنفيذيون - التجمع الخامس',
    ad_name: 'إعلان المقر الافتراضي المعتمد قانونياً',
    inbox_url: 'https://business.facebook.com/messages/t/meta_lead_112',
    source_lead_status: 'في التفاوض',
    source_lead_quality: 'High',
    source_next_action: 'Send Commercial Discount',
    source_feedback: 'عايز يسجل 3 شركات تابعة للمجموعة وطلب خصم كميات 15% على إجمالي الباقات',
    crm_status: 'مهتم — في مرحلة التفاوض',
    contact_attempts: 2,
    last_contact_date: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    next_followup_date: new Date(Date.now() - 8 * 3600 * 1000).toISOString(), // Overdue by 8 hrs!
    is_archived: false
  }
];

/**
 * Helper to populate DB with realistic sample leads
 */
async function loadRealisticSampleData(force = false) {
  const existing = await window.crmDb.getAllLeads(true);
  if (existing.length > 0 && !force) {
    return existing;
  }

  const batchId = 'batch_sample_seed_' + Date.now();
  const leadsToInsert = SAMPLE_LEADS_DATA.map((lead, idx) => {
    const phoneNorm = window.scoringEngine.normalizeEgyptianPhone(lead.phone_number);
    const leadCopy = {
      ...lead,
      id: 'lead_sample_' + (idx + 1),
      phone_normalized: phoneNorm.normalized,
      phone_display: phoneNorm.display,
      phone_valid: phoneNorm.isValid,
      phone_operator: phoneNorm.operator,
      import_batch_id: batchId,
      raw_source: { ...lead }
    };

    // Calculate score & recommendations
    const evaluation = window.scoringEngine.evaluateLead(leadCopy);
    leadCopy.lead_score = evaluation.score;
    leadCopy.lead_priority = evaluation.priority;
    leadCopy.scoring_breakdown = evaluation;
    leadCopy.recommended_action = evaluation.recommendedAction;
    leadCopy.recommended_timing = evaluation.recommendedTiming;
    leadCopy.recommended_channel = evaluation.recommendedChannel;
    leadCopy.whatsapp_draft = evaluation.whatsappDraft;
    leadCopy.confidence_level = evaluation.confidence;

    return leadCopy;
  });

  await window.crmDb.bulkSaveLeads(leadsToInsert);

  // Add initial batch log
  await window.crmDb.logBatch({
    id: batchId,
    file_name: 'smart_address_meta_leads_seed.xlsx',
    total_records: leadsToInsert.length,
    imported_count: leadsToInsert.length,
    updated_count: 0,
    flagged_count: 0,
    raw_summary: { source: 'Smart Address Egypt Seed Generator' }
  });

  // Seed sample activities
  await window.crmDb.addActivity('lead_sample_2', {
    activity_type: 'call',
    outcome: 'interested',
    notes: 'تم الاتصال بالدكتورة رانيا؛ مهتمة جداً بباقة المعادي وسألت عن المراسلات البنكية وتم تحديد موعد متابعة اليوم.',
    created_at: new Date(Date.now() - 18 * 3600 * 1000).toISOString(),
    next_followup_set: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  });

  await window.crmDb.addActivity('lead_sample_7', {
    activity_type: 'meeting',
    outcome: 'converted',
    notes: 'اجتماع بمقر التجمع؛ تم توقيع العقد واستلام إيصال السداد وعقد الإيجار الموثق.',
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  });

  console.log(`Loaded ${leadsToInsert.length} realistic sample leads into Smart Address Egypt CRM.`);
  return leadsToInsert;
}

window.loadRealisticSampleData = loadRealisticSampleData;
