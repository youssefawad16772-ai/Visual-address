/**
 * Smart Address Egypt CRM - Lead Scoring & AI Recommendation Engine
 * Real rules-based engine with Egyptian business contextual intelligence
 */

class ScoringEngine {
  constructor() {
    this.defaultWeights = {
      intent: 25,
      timeline: 20,
      package: 20,
      contact_validity: 15,
      decision_maker: 10,
      quality_feedback: 10
    };
  }

  /**
   * Normalize Egyptian phone numbers
   * Valid Egyptian mobile prefixes: 010 (Vodafone), 011 (Etisalat), 012 (Orange), 015 (WE)
   */
  normalizeEgyptianPhone(rawPhone) {
    if (!rawPhone) return { normalized: '', display: 'بدون هاتف', isValid: false, reason: 'رقم الهاتف فارغ' };

    let cleaned = String(rawPhone).trim().replace(/[\s\-\(\)\.]/g, '');
    // Remove Meta 'p:' prefix if present
    cleaned = cleaned.replace(/^p:/i, '');

    // Convert international prefix
    if (cleaned.startsWith('0020')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('+20')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('20') && cleaned.length === 12) {
      cleaned = cleaned.substring(2);
    }

    // Now cleaned should start with 010, 011, 012, 015 or 10, 11, 12, 15
    if (cleaned.length === 10 && /^(10|11|12|15)/.test(cleaned)) {
      cleaned = '0' + cleaned;
    }

    // Check Egyptian mobile pattern: 11 digits starting with 010, 011, 012, 015
    const isEgyptianMobile = /^0(10|11|12|15)\d{8}$/.test(cleaned);

    if (isEgyptianMobile) {
      const normalized = '2' + cleaned; // 2010xxxxxxxx for wa.me & tel:
      const display = cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1 $2 $3');
      return {
        normalized,
        display,
        isValid: true,
        operator: this.detectOperator(cleaned)
      };
    }

    // If landline or non-standard international
    if (/^\+?\d{8,15}$/.test(cleaned)) {
      return {
        normalized: cleaned.replace(/^\+/, ''),
        display: cleaned,
        isValid: true,
        operator: 'رقم دولي / أرضي'
      };
    }

    return {
      normalized: cleaned,
      display: String(rawPhone),
      isValid: false,
      reason: 'تنسيق الرقم غير متوافق مع شبكات المحمول المصرية'
    };
  }

  detectOperator(mobile11) {
    if (mobile11.startsWith('010')) return 'فودافون مصر';
    if (mobile11.startsWith('011')) return 'اتصالات مصر';
    if (mobile11.startsWith('012')) return 'أورنچ مصر';
    if (mobile11.startsWith('015')) return 'المصرية للاتصالات WE';
    return 'محمول مصري';
  }

  /**
   * Evaluate and score a lead based on all available evidence
   */
  evaluateLead(lead, settings = null) {
    const weights = (settings && settings.score_weights) || this.defaultWeights;
    const thresholds = (settings && settings.thresholds) || { hot: 80, warm: 60, nurture: 35 };

    const positiveSignals = [];
    const negativeSignals = [];
    let score = 0;
    let confidence = 'متوسطة';

    const feedbackText = [
      lead.source_feedback || '',
      lead.fedback || '',
      lead.internal_notes || '',
      lead.source_lead_status || ''
    ].join(' ').toLowerCase();

    // 1. Negative Feedback Override Rule
    const negativeKeywords = [
      'غير مهتم', 'not interested', 'رفض', 'غالي ومش عايز', 'مش عايز',
      'لا يرغب', 'خارج الخدمة', 'أوقف المتابعة', 'الغاء', 'wrong number', 'رقم خاطئ'
    ];

    const hasExplicitNegative = negativeKeywords.some(kw => feedbackText.includes(kw));

    if (hasExplicitNegative) {
      negativeSignals.push('إبداء عدم اهتمام أو رفض صريح في الملاحظات السابقة');
      return {
        score: Math.min(15, Math.max(5, lead.lead_score || 10)),
        priority: 'low',
        priorityLabel: 'أولوية منخفضة / غير مهتم',
        positiveSignals: [],
        negativeSignals: ['العميل أبدى عدم رغبته أو رفض الخدمة بوضوح'],
        recommendedAction: 'العميل قال إنه غير مهتم؛ راجع سبب الرفض، وبعدها أوقف المتابعة لتوفير وقت الفريق ما لم تتغير المعطيات.',
        recommendedTiming: 'أوقف المتابعة أو أرشف',
        recommendedChannel: 'لا يوجد تواصل نشط',
        confidence: 'عالية (إفادة واضحة من العميل)',
        whatsappDraft: this.generateWhatsAppDraft(lead, 'not_interested'),
        isNegativeOverride: true
      };
    }

    // 2. Timeline Evaluation (when_do_you_want_to_start_)
    const timeline = (lead.start_timeline || lead.when_do_you_want_to_start_ || '').toLowerCase();
    let isLongTermFuture = false;

    if (timeline.includes('فوراً') || timeline.includes('حالاً') || timeline.includes('immediately') || timeline.includes('خلال أسبوع')) {
      score += weights.intent;
      positiveSignals.push('نية بدء فورية (خلال أيام قليلة)');
    } else if (timeline.includes('خلال أسبوعين') || timeline.includes('خلال شهر') || timeline.includes('within a month')) {
      score += Math.round(weights.intent * 0.75);
      positiveSignals.push('رغبة في البدء قريباً (خلال شهر)');
    } else if (timeline.includes('1-3') || timeline.includes('شهرين')) {
      score += Math.round(weights.intent * 0.5);
      positiveSignals.push('التخطيط للبدء في المدى المتوسط (خلال شهرين إلى ثلاثة)');
    } else if (timeline.includes('بعد 3 شهور') || timeline.includes('أكثر من 3 أشهر') || timeline.includes('after 3 months')) {
      score += Math.round(weights.intent * 0.35);
      isLongTermFuture = true;
      positiveSignals.push('عميل مخطط للمستقبل (بعد 3 أشهر)');
    } else if (timeline) {
      score += 5;
    } else {
      negativeSignals.push('لم يحدد تاريخ أو توقيت البدء المطلوب');
    }

    // 3. Package Evaluation (choose_your_virtual_address_package_)
    const pkg = (lead.package || lead.choose_your_virtual_address_package_ || '').toLowerCase();
    if (pkg.includes('سنوية') || pkg.includes('شاملة') || pkg.includes('تأسيس') || pkg.includes('سجل') || pkg.includes('بطاقة ضريبية')) {
      score += weights.package;
      positiveSignals.push('اهتمام بباقة المقر الافتراضي السنوية لتأسيس الشركات');
    } else if (pkg.includes('افتراضي') || pkg.includes('عنوان')) {
      score += Math.round(weights.package * 0.8);
      positiveSignals.push('طلب خدمة المقر الافتراضي المعتمد');
    } else if (pkg.includes('قاعات') || pkg.includes('اجتماع') || pkg.includes('ساعة')) {
      score += Math.round(weights.package * 0.6);
      positiveSignals.push('طلب باقات قاعات الاجتماعات');
    } else if (pkg) {
      score += 8;
    } else {
      negativeSignals.push('نوع الباقة غير محدد بدقة');
    }

    // 4. Contact Details Completeness & Validity
    const phoneCheck = this.normalizeEgyptianPhone(lead.phone_number);
    if (phoneCheck.isValid) {
      score += weights.contact_validity;
      positiveSignals.push(`رقم هاتف مصري صحيح ومعتمد (${phoneCheck.operator})`);
    } else {
      negativeSignals.push(`رقم الهاتف به مشكلة: ${phoneCheck.reason || 'غير صالح'}`);
    }

    if (lead.email && lead.email.includes('@') && !lead.email.includes('test')) {
      score += 5;
      positiveSignals.push('بريد إلكتروني نشط متوفر');
    }

    if (lead.work_email && lead.work_email.includes('@') && !lead.work_email.includes('@gmail') && !lead.work_email.includes('@yahoo')) {
      score += 5;
      positiveSignals.push('بريد عمل رسمي لشركة (دومين مستقل)');
    }

    // 5. Decision Maker Status (Job Title)
    const job = (lead.job_title || '').toLowerCase();
    const decisionMakerTitles = ['مؤسس', 'مدير تنفيذي', 'رئيس مجلس', 'صاحب شركة', 'شريك', 'مستشار', 'محامي', 'ceo', 'founder', 'owner', 'partner', 'director'];
    const isDecisionMaker = decisionMakerTitles.some(t => job.includes(t));

    if (isDecisionMaker) {
      score += weights.decision_maker;
      positiveSignals.push(`صاحب قرار مباشر (${lead.job_title})`);
    } else if (job) {
      score += 4;
    }

    // 6. Contact Attempts & History Impact
    const attempts = lead.contact_attempts || 0;
    const maxAttempts = (settings && settings.max_unsuccessful_attempts) || 3;

    if (lead.crm_status === 'مهتم — في مرحلة التفاوض' || feedbackText.includes('تفاوض') || feedbackText.includes('عرض سعر')) {
      score += 15;
      positiveSignals.push('مرحلة تفاوض نشطة وطلب عرض سعر رسمي');
    } else if (lead.crm_status === 'تم التعاقد') {
      score = 100;
      positiveSignals.push('تم إتمام التعاقد وسداد القيمة');
    } else if (attempts >= maxAttempts && !lead.last_contact_date) {
      score = Math.max(20, score - 20);
      negativeSignals.push(`${attempts} محاولات اتصال سابقة دون رد من العميل`);
    }

    // Cap score 0-100
    score = Math.min(100, Math.max(10, Math.round(score)));

    // Confidence Calculation
    let evidenceCount = positiveSignals.length + negativeSignals.length;
    if (evidenceCount >= 5) confidence = 'عالية جداً (بيانات وافية وتفاعل مثبت)';
    else if (evidenceCount >= 3) confidence = 'عالية (بيانات مكتملة)';
    else confidence = 'متوسطة إلى محدودة (تحتاج مزيد من الاستيضاح)';

    // Priority Determination
    let priority = 'low';
    let priorityLabel = 'أولوية منخفضة';

    if (score >= thresholds.hot && !isLongTermFuture) {
      priority = 'hot';
      priorityLabel = 'عميل ساخن (متابعة فورية)';
    } else if (score >= thresholds.warm && !isLongTermFuture) {
      priority = 'warm';
      priorityLabel = 'عميل دافئ (أولوية عالية)';
    } else if (isLongTermFuture || score >= thresholds.nurture) {
      priority = 'nurture';
      priorityLabel = 'عميل للمتابعة والرعاية';
    } else {
      priority = 'low';
      priorityLabel = 'أولوية منخفضة / مراجعة';
    }

    // Generate Tailored Egyptian Action & Timing
    const actionPlan = this.generateEgyptianAction(lead, priority, isLongTermFuture, attempts, phoneCheck.isValid);

    return {
      score,
      priority,
      priorityLabel,
      positiveSignals,
      negativeSignals,
      recommendedAction: actionPlan.action,
      recommendedTiming: actionPlan.timing,
      recommendedChannel: actionPlan.channel,
      confidence,
      whatsappDraft: this.generateWhatsAppDraft(lead, priority),
      isLongTermFuture
    };
  }

  generateEgyptianAction(lead, priority, isLongTermFuture, attempts, phoneValid) {
    if (!phoneValid) {
      return {
        action: 'رقم العميل محتاج مراجعة قبل ما تضيع وقت في الاتصال؛ تحقق من الرقم البديل أو راسله عبر الإيميل/الإنبوكس.',
        timing: 'مراجعة فورية للبيانات',
        channel: 'فيسبوك إنبوكس أو البريد الإلكتروني'
      };
    }

    if (isLongTermFuture) {
      return {
        action: 'العميل محدد إنه يبدأ بعد 3 شهور؛ حطه في قائمة المتابعة المستقبلية وجدول اتصال تذكيري قبل الموعد بـ 3 أسابيع.',
        timing: 'متابعة مجدولة في الربع القادم',
        channel: 'واتساب استباقي ثم مكالمة هاتفية'
      };
    }

    if (attempts >= 3) {
      return {
        action: `تمت محاولة الاتصال ${attempts} مرات بدون رد؛ ابعت رسالة واتساب موجزة بالمميزات وخلي العميل في قائمة المراجعة قبل الأرشفة.`,
        timing: 'رسالة ختامية ومتابعة بعد أسبوع',
        channel: 'رسالة واتساب ختامية'
      };
    }

    if (priority === 'hot') {
      return {
        action: 'اتصل بالعميل النهارده؛ مهتم بالخدمة وجاهز للبدء فوراً، والسرعة هتمنع توجهه لأي بديل آخر.',
        timing: 'اليوم - اتصال هاتفي فوري',
        channel: 'مكالمة هاتفية مباشرة'
      };
    }

    if (priority === 'warm') {
      return {
        action: 'العميل مهتم وعنده استفسار محدد؛ تواصل معاه واعرض تفاصيل الباقة المناسبة مع دعوة لمعاينة المقر.',
        timing: 'خلال اليوم',
        channel: 'مكالمة هاتفية + واتساب'
      };
    }

    return {
      action: 'العميل يحتاج استكشاف لاحتياجه؛ تواصل واستفسر هل الغرض تأسيس شركة جديدة أو نقل مقر قانوني.',
      timing: 'خلال 48 ساعة',
      channel: 'رسالة واتساب تعريفية'
    };
  }

  /**
   * Personalized Egyptian Arabic WhatsApp draft tailored to requested package & client name
   */
  generateWhatsAppDraft(lead, priority) {
    const name = lead.full_name ? `أستاذ ${lead.full_name}` : 'بحضرتك';
    const pkg = lead.package || lead.choose_your_virtual_address_package_ || 'العنوان الافتراضي';

    if (priority === 'not_interested') {
      return `أهلاً ${name}، شكراً لوقت حضرتك وتواصلك معنا في Smart Address Egypt. نتمنى لحضرتك دوام التوفيق والنجاح، ولو احتجت أي خدمات مقرات أو تأسيس شركات مستقبلاً إحنا في خدمتك دائماً.`;
    }

    if (priority === 'hot') {
      return `أهلاً ${name}، معاك فريق المبيعات من Smart Address Egypt. بخصوص استفسارك بخصوص ${pkg} لتأسيس وإشهار شركتك، متاح لدينا عناوين قانونية معتمدة بالسجل التجاري والبطاقة الضريبية في التجمع الخامس والشيخ زايد والمعادي مع قاعات اجتماعات مجهزة بالكامل. حابب أبعت لحضرتك البروفايل وعرض الأسعار الحالي ونتشرف بزيارة حضرتك للمقر؟`;
    }

    if (priority === 'nurture') {
      return `أهلاً ${name}، تحياتنا من Smart Address Egypt. بخصوص خطتك لخدمات ${pkg} في الفترة القادمة، حابين نكون على تواصل ونشارك مع حضرتك أحدث باقاتنا الحصرية عند بدء التنفيذ. يسعدنا الرد على أي استفسار قانوني يخص العنوان المقترح.`;
    }

    return `أهلاً ${name}، تحياتنا من Smart Address Egypt. بخصوص اهتمامك بخدمة ${pkg}، يسعدنا تزويدك بكافة التفاصيل وباقات المقر الافتراضي التي تشمل استلام المراسلات الحكومية والبنكية وقاعات الاجتماعات. هل يناسب حضرتك نتكلم دقيقة نوضح التفاصيل؟`;
  }
}

// Global instance
window.scoringEngine = new ScoringEngine();
