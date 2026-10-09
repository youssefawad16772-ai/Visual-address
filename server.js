// server.js - Smart Address Egypt CRM Backend Server
// Powered by Node 24 with native node:sqlite
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3456;
const DB_FILE = path.join(__dirname, 'smart_address_crm.db');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Setup Schema
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_lead_id TEXT,
      created_time TEXT,
      full_name TEXT NOT NULL,
      phone_number TEXT,
      normalized_phone TEXT,
      email TEXT,
      work_email TEXT,
      job_title TEXT,
      package_requested TEXT,
      start_timeline TEXT,
      raw_lead_status TEXT,
      raw_lead_quality TEXT,
      raw_next_action TEXT,
      raw_feedback TEXT,
      platform TEXT DEFAULT 'Facebook',
      campaign_name TEXT,
      campaign_id TEXT,
      adset_name TEXT,
      adset_id TEXT,
      ad_name TEXT,
      ad_id TEXT,
      form_name TEXT,
      form_id TEXT,
      is_organic INTEGER DEFAULT 0,
      inbox_url TEXT,
      import_batch_id INTEGER,
      last_contact_date TEXT,
      contact_attempts_count INTEGER DEFAULT 0,
      crm_status TEXT DEFAULT 'contact_today',
      lead_score INTEGER DEFAULT 50,
      lead_priority TEXT DEFAULT 'nurture',
      scoring_explanation TEXT,
      positive_signals TEXT,
      negative_signals TEXT,
      recommended_action TEXT,
      recommended_timing TEXT,
      recommended_channel TEXT DEFAULT 'call',
      confidence_level TEXT DEFAULT 'متوسط',
      next_followup_date TEXT,
      disqualified_reason TEXT,
      is_archived INTEGER DEFAULT 0,
      sales_notes TEXT DEFAULT '',
      whatsapp_draft TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      outcome TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS followup_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      due_date TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      reason TEXT,
      status TEXT DEFAULT 'pending',
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT,
      total_rows INTEGER DEFAULT 0,
      imported_count INTEGER DEFAULT 0,
      updated_count INTEGER DEFAULT 0,
      skipped_count INTEGER DEFAULT 0,
      flagged_count INTEGER DEFAULT 0,
      raw_headers TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Initialize default settings if not exists
  const getSetting = db.prepare('SELECT value FROM settings WHERE key = ?');
  const setSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

  const defaultSettings = {
    scoring_weights: {
      timeline: 30,
      package: 20,
      lead_quality: 20,
      contact_completeness: 15,
      feedback: 15
    },
    thresholds: {
      hot: 80,
      warm: 60,
      nurture: 35
    },
    max_unanswered_attempts: 4,
    default_followup_days: {
      hot: 1,
      warm: 2,
      nurture: 7,
      future: 90
    },
    packages: [
      'باقة العنوان الافتراضي السنوية (البطاقة الضريبية والسجل التجاري)',
      'باقة العنوان الافتراضي نصف السنوية',
      'باقة مقر الشركات المتكاملة (عنوان + قاعات + هاتف وسكرتارية)',
      'باقة قاعات الاجتماعات (20 ساعة شهرياً)',
      'باقة قاعات الاجتماعات (10 ساعات مرنة)',
      'مكتب خاص مفروش (Private Office)',
      'مساحة عمل مشتركة (Hot Desk)'
    ],
    statuses: [
      { id: 'contact_today', label: 'اتصال اليوم', color: '#ef4444' },
      { id: 'followup_today', label: 'متابعة اليوم', color: '#f59e0b' },
      { id: 'contacted_awaiting', label: 'تم التواصل - بانتظار الرد', color: '#3b82f6' },
      { id: 'in_negotiation', label: 'مهتم - تفاوض وعرض سعر', color: '#8b5cf6' },
      { id: 'future_opportunity', label: 'فرصة مستقبلية (> 3 شهور)', color: '#06b6d4' },
      { id: 'not_interested', label: 'غير مهتم', color: '#64748b' },
      { id: 'invalid_data', label: 'بيانات غير مكتملة', color: '#eab308' },
      { id: 'cold_low', label: 'أولوية منخفضة / بارد', color: '#94a3b8' },
      { id: 'won', label: 'تم التعاقد / فوز 🏆', color: '#10b981' },
      { id: 'lost', label: 'فرصة ضائعة', color: '#dc2626' }
    ]
  };

  const current = getSetting.get('crm_config');
  if (!current) {
    setSetting.run('crm_config', JSON.stringify(defaultSettings));
  }
}

initDatabase();

// Phone normalization helper for Egyptian and international numbers
function normalizePhoneNumber(raw) {
  if (!raw) return '';
  let str = String(raw).trim();
  // Remove non-numeric characters except +
  str = str.replace(/[^\d+]/g, '');

  if (!str) return '';

  // Remove leading plus
  if (str.startsWith('+')) str = str.substring(1);
  if (str.startsWith('00')) str = str.substring(2);

  // If starts with 20 and is 12 digits (201xxxxxxxxx)
  if (str.startsWith('20') && str.length === 12) {
    return str;
  }

  // If local Egyptian mobile starting with 01 (e.g. 010, 011, 012, 015) - 11 digits
  if (str.startsWith('01') && str.length === 11) {
    return '20' + str.substring(1);
  }

  // If 10 digits starting with 1 (e.g. 10xxxxxxxx)
  if (str.startsWith('1') && str.length === 10) {
    return '20' + str;
  }

  // Return cleaned number as is
  return str;
}

// Scoring & recommendation engine
function calculateLeadScore(lead, config) {
  let score = 25; // baseline
  const posSignals = [];
  const negSignals = [];
  let isExplicitlyNegative = false;
  let negativeReason = '';

  const weights = config?.scoring_weights || {
    timeline: 30,
    package: 20,
    lead_quality: 20,
    contact_completeness: 15,
    feedback: 15
  };

  // 1. Check Explicit Negative Feedback
  const feedback = (lead.raw_feedback || lead.fedback || '').toLowerCase();
  const rawStatus = (lead.raw_lead_status || '').toLowerCase();
  const rawAction = (lead.raw_next_action || '').toLowerCase();

  const negWords = ['غير مهتم', 'not interested', 'رفض', 'مش عايز', 'مش محتاج', 'غالي جدا', 'غالي', 'ألغى', 'رقم غلط', 'wrong number', 'uninterested', 'disqualified', 'stop'];
  for (const word of negWords) {
    if (feedback.includes(word) || rawStatus.includes(word) || rawAction.includes(word)) {
      isExplicitlyNegative = true;
      negativeReason = lead.raw_feedback || lead.fedback || 'ملاحظات العميل تشير إلى عدم الاهتمام صراحة';
      break;
    }
  }

  if (isExplicitlyNegative) {
    negSignals.push(`رفض أو عدم اهتمام صريح: ${negativeReason}`);
    return {
      score: 15,
      priority: 'low',
      crm_status: 'not_interested',
      explanation: `تم تخفيض تقييم العميل إلى 15 نقطة بناءً على الملاحظات الصريحة: "${negativeReason}". المتابعة غير مجدية وتعتبر إهداراً للوقت إلا بقرار إداري.`,
      posSignals: [],
      negSignals,
      recommended_action: 'إيقاف المتابعة وأرشفة العميل لتوفير وقت فريق المبيعات للعملاء الجادين.',
      recommended_timing: 'لا يوجد متابعة مجدولة',
      recommended_channel: 'none',
      confidence_level: 'عالي',
      whatsapp_draft: ''
    };
  }

  // 2. Timeline Evaluation (up to weights.timeline)
  const timeline = (lead.start_timeline || lead.when_do_you_want_to_start_ || '').trim();
  if (timeline.includes('فوراً') || timeline.includes('immediately') || timeline.includes('خلال أسبوع') || timeline.includes('اليوم') || timeline.includes('الآن')) {
    score += weights.timeline;
    posSignals.push('جاهز لبدء الخدمة فوراً دون تأجيل');
  } else if (timeline.includes('خلال شهر') || timeline.includes('month') || timeline.includes('أسبوعين')) {
    score += Math.round(weights.timeline * 0.75);
    posSignals.push('توقيت البدء قريب (خلال شهر)');
  } else if (timeline.includes('بعد 3 شهور') || timeline.includes('3 months') || timeline.includes('أكثر من 3 شهور') || timeline.includes('ربع سنوي')) {
    score += Math.round(weights.timeline * 0.35);
    posSignals.push('خطة بدء مستقبلية (بعد 3 شهور)');
  } else if (timeline) {
    score += Math.round(weights.timeline * 0.5);
    posSignals.push(`توقيت البدء المذكور: ${timeline}`);
  } else {
    negSignals.push('لم يحدد توقيت البدء في الاستمارة');
  }

  // 3. Package Evaluation (up to weights.package)
  const pkg = (lead.package_requested || lead.choose_your_virtual_address_package_ || '').toLowerCase();
  if (pkg.includes('سنوي') || pkg.includes('annual') || pkg.includes('ضريبي') || pkg.includes('سجل تجاري') || pkg.includes('متكامل') || pkg.includes('شركات')) {
    score += weights.package;
    posSignals.push('مهتم بباقة مقر سنوي ذات قيمة تعاقدية عالية (سجل وبطاقة ضريبية)');
  } else if (pkg.includes('نصف') || pkg.includes('semi') || pkg.includes('6 شهور')) {
    score += Math.round(weights.package * 0.8);
    posSignals.push('مهتم بباقة نصف سنوية');
  } else if (pkg.includes('قاعات') || pkg.includes('اجتماع') || pkg.includes('meeting') || pkg.includes('20 ساعة')) {
    score += Math.round(weights.package * 0.7);
    posSignals.push('طلب باقة قاعات اجتماعات');
  } else if (pkg) {
    score += Math.round(weights.package * 0.5);
    posSignals.push(`طلب باقة: ${lead.package_requested || lead.choose_your_virtual_address_package_}`);
  } else {
    negSignals.push('لم يختر باقة محددة');
  }

  // 4. Contact Info Completeness
  const phone = normalizePhoneNumber(lead.phone_number);
  const email = (lead.email || lead.work_email || '').trim();
  const job = (lead.job_title || '').trim();

  if (phone && phone.startsWith('201') && phone.length === 12) {
    score += Math.round(weights.contact_completeness * 0.5);
    posSignals.push('رقم هاتف محمول مصري صحيح ومفعل');
  } else if (!phone) {
    negSignals.push('رقم الهاتف مفقود');
  } else {
    negSignals.push('رقم الهاتف بحاجة لتدقيق وتأكيد الصيغة');
  }

  if (email && email.includes('@')) {
    score += Math.round(weights.contact_completeness * 0.3);
    posSignals.push('البريد الإلكتروني متوفر');
  }

  if (job) {
    score += Math.round(weights.contact_completeness * 0.2);
    posSignals.push(`المسمى الوظيفي مسجل: ${job}`);
  }

  // 5. Lead Quality & Raw Status
  const quality = (lead.raw_lead_quality || lead['Lead Quality'] || '').toLowerCase();
  if (quality.includes('high') || quality.includes('عالي') || quality.includes('ممتاز') || quality.includes('hot')) {
    score += weights.lead_quality;
    posSignals.push('جودة العميل مصنفة كـ عالية في بيانات الحملة');
  } else if (quality.includes('med') || quality.includes('متوسط')) {
    score += Math.round(weights.lead_quality * 0.6);
  } else if (quality.includes('low') || quality.includes('ضعيف')) {
    negSignals.push('تقييم جودة العميل المبدئي منخفض');
  }

  // 6. Positive Feedback cues
  const posWords = ['مهتم', 'طلب اتصال', 'تأسيس شركة', 'محامي', 'محاسب', 'استشاري', 'سجل', 'ضرائب', 'urgent', 'مقر', 'عرض سعر'];
  for (const w of posWords) {
    if (feedback.includes(w)) {
      score += weights.feedback;
      posSignals.push(`ملاحظات إيجابية مسجلة: "${lead.raw_feedback || lead.fedback}"`);
      break;
    }
  }

  // Normalize score between 0 and 100
  score = Math.min(100, Math.max(10, score));

  // Determine Priority Band
  const thresholds = config?.thresholds || { hot: 80, warm: 60, nurture: 35 };
  let priority = 'low';
  let defaultStatus = 'contact_today';

  if (score >= thresholds.hot) {
    priority = 'hot';
    defaultStatus = 'contact_today';
  } else if (score >= thresholds.warm) {
    priority = 'warm';
    defaultStatus = 'contact_today';
  } else if (score >= thresholds.nurture) {
    priority = 'nurture';
    if (timeline.includes('بعد 3 شهور') || timeline.includes('3 months')) {
      defaultStatus = 'future_opportunity';
    } else {
      defaultStatus = 'contact_today';
    }
  } else {
    priority = 'low';
    defaultStatus = 'cold_low';
  }

  // Generate Personalized Recommendations in Egyptian Arabic
  let recAction = '';
  let recTiming = 'اليوم خلال ساعات العمل الرسمية';
  let recChannel = 'call';
  let confidence = score >= 70 ? 'عالي' : (score >= 45 ? 'متوسط' : 'منخفض');

  const customerName = lead.full_name || 'العميل';
  const requestedPkg = lead.package_requested || lead.choose_your_virtual_address_package_ || 'خدمات المقر الافتراضي';

  if (timeline.includes('بعد 3 شهور') || timeline.includes('3 months')) {
    priority = 'nurture';
    defaultStatus = 'future_opportunity';
    recAction = `العميل يخطط للبدء بعد 3 شهور؛ اضبط موعد تذكير قبل شهر من موعده، وتواصل واتساب لإرسال البروشور التعريفي دون ضغط بيعي.`;
    recTiming = 'متابعة دورية كل 3 أسابيع، ومكالمة رئيسية قبل موعد البدء بشهر';
    recChannel = 'whatsapp';
  } else if (priority === 'hot') {
    recAction = `اتصل فوراً بـ ${customerName}؛ عميل ساخن ولديه نية تعاقد وشراء واضحة على ${requestedPkg}. اعرض عليه تفاصيل المقر والمستندات القانونية.`;
    recTiming = 'اتصال فوري الآن';
    recChannel = 'call';
  } else if (priority === 'warm') {
    recAction = `تواصل اليوم مع العميل هاتفياً أو عبر واتساب، وضح مميزات استخراج البطاقة الضريبية وتسهيلات الدفع لباقة ${requestedPkg}.`;
    recTiming = 'اليوم قبل نهاية دوام العمل';
    recChannel = 'call';
  } else if (!phone || phone.length < 10) {
    defaultStatus = 'invalid_data';
    recAction = `رقم الهاتف غير مكتمل أو غير صحيح (${lead.phone_number || 'فارغ'}). راجع صندوق رسائل الإعلان ${lead.inbox_url ? 'من الرابط المباشر' : ''} أو ابحث بالبريد.`;
    recTiming = 'عند مراجعة وتحديث البيانات';
    recChannel = 'none';
  } else {
    recAction = `عميل بحاجة لاستكشاف احتياجه بدقة؛ ابدأ برسالة واتساب تعريفية بباقات سمارت أدرس إيجيبت ثم قيّم الرد.`;
    recTiming = 'خلال 48 ساعة';
    recChannel = 'whatsapp';
  }

  // Detailed explanation
  const explanation = `حصل العميل على ${score}/100 بناءً على: ${posSignals.slice(0, 3).join('، ') || 'المعطيات المتوفرة'}${negSignals.length ? ' | مع ملاحظة: ' + negSignals.join('، ') : ''}.`;

  // WhatsApp Draft copy in authentic professional Egyptian business dialect
  let waDraft = '';
  if (pkg.includes('قاعات') || pkg.includes('meeting')) {
    waDraft = `أهلاً بحضرتك يا فندم أ/ ${customerName}، معاك فريق Smart Address Egypt. بخصوص استفسارك الكريم عن باقات قاعات الاجتماعات وغرف ورش العمل، متاح عندنا قاعات مجهزة بشاشات عرض ذكية وإنترنت فائق السرعة وضيافة للمشاركين. هل تحب نرسل لحضرتك باقات الساعات وأسعار الفروع بالتجمع والمعادي، أو حابب نحدد موعد لمعاينة المكان؟`;
  } else if (timeline.includes('بعد 3 شهور')) {
    waDraft = `أهلاً بحضرتك يا فندم أ/ ${customerName}، معاك سمارت أدرس إيجيبت (Smart Address Egypt) لمقرات الشركات والعناوين الافتراضية. سجلنا اهتمام حضرتك بالبدء خلال الفترة القادمة، وحابين نبعت لحضرتك ملف تعريفي بالخدمات وتجهيز أوراق التأسيس والبطاقة الضريبية للاطلاع عليها في أي وقت. لو احتجت أي استشارة إحنا تحت أمرك دائماً!`;
  } else {
    waDraft = `أهلاً بحضرتك يا فندم أ/ ${customerName}، معاك فريق Smart Address Egypt لمقرات الأعمال والعناوين الافتراضية. بخصوص اهتمام حضرتك بباقة ${requestedPkg}، حابين نوضح لحضرتك التفاصيل الخاصة باستخراج السجل التجاري والبطاقة الضريبية واستلام المراسلات بفروعنا. هل الوقت مناسب لمكالمة سريعة أم تفضل نبعت التفاصيل والأسعار هنا على واتساب؟`;
  }

  return {
    score,
    priority,
    crm_status: defaultStatus,
    explanation,
    posSignals,
    negSignals,
    recommended_action: recAction,
    recommended_timing: recTiming,
    recommended_channel: recChannel,
    confidence_level: confidence,
    whatsapp_draft: waDraft
  };
}

// REST API Request Handlers
const requestListener = async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Enable CORS & JSON headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const jsonResponse = (data, statusCode = 200) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  };

  const getBody = () => new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });

  try {
    // 0. Health Check Endpoint
    if (pathname === '/api/health' && method === 'GET') {
      return jsonResponse({
        status: 'ok',
        appName: 'Smart Address Egypt CRM',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: '2.4.0'
      });
    }

    // 1. Dashboard Stats API
    if (pathname === '/api/dashboard/stats' && method === 'GET') {
      const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads WHERE is_archived = 0').get().c;
      const hotLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_priority = 'hot' AND is_archived = 0").get().c;
      const warmLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_priority = 'warm' AND is_archived = 0").get().c;
      const contactToday = db.prepare("SELECT COUNT(*) as c FROM leads WHERE crm_status = 'contact_today' AND is_archived = 0").get().c;
      const followupToday = db.prepare("SELECT COUNT(*) as c FROM leads WHERE (crm_status = 'followup_today' OR (next_followup_date IS NOT NULL AND date(next_followup_date) <= date('now'))) AND is_archived = 0").get().c;
      const overdueFollowups = db.prepare("SELECT COUNT(*) as c FROM leads WHERE next_followup_date IS NOT NULL AND date(next_followup_date) < date('now') AND crm_status NOT IN ('won', 'lost', 'not_interested') AND is_archived = 0").get().c;
      const inNegotiation = db.prepare("SELECT COUNT(*) as c FROM leads WHERE crm_status = 'in_negotiation' AND is_archived = 0").get().c;
      const wonDeals = db.prepare("SELECT COUNT(*) as c FROM leads WHERE crm_status = 'won' AND is_archived = 0").get().c;
      const notInterested = db.prepare("SELECT COUNT(*) as c FROM leads WHERE crm_status = 'not_interested' AND is_archived = 0").get().c;
      const futureOpps = db.prepare("SELECT COUNT(*) as c FROM leads WHERE crm_status = 'future_opportunity' AND is_archived = 0").get().c;
      const archivedLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE is_archived = 1").get().c;
      const newLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE contact_attempts_count = 0 AND is_archived = 0").get().c;

      // Status breakdown
      const byStatus = db.prepare(`
        SELECT crm_status, COUNT(*) as count 
        FROM leads 
        WHERE is_archived = 0 
        GROUP BY crm_status
      `).all();

      // Quality breakdown
      const byQuality = db.prepare(`
        SELECT lead_priority, COUNT(*) as count 
        FROM leads 
        WHERE is_archived = 0 
        GROUP BY lead_priority
      `).all();

      // Campaign stats
      const byCampaign = db.prepare(`
        SELECT COALESCE(campaign_name, 'حملة غير محددة') as name, 
               COUNT(*) as total,
               SUM(CASE WHEN crm_status = 'won' THEN 1 ELSE 0 END) as won_count,
               SUM(CASE WHEN lead_priority = 'hot' THEN 1 ELSE 0 END) as hot_count
        FROM leads
        WHERE is_archived = 0
        GROUP BY campaign_name
        ORDER BY total DESC
        LIMIT 8
      `).all();

      // Platform stats
      const byPlatform = db.prepare(`
        SELECT COALESCE(platform, 'غير محدد') as platform, COUNT(*) as count
        FROM leads
        WHERE is_archived = 0
        GROUP BY platform
      `).all();

      // Lost reasons
      const lostReasons = db.prepare(`
        SELECT COALESCE(disqualified_reason, 'سبب غير محدد') as reason, COUNT(*) as count
        FROM leads
        WHERE crm_status IN ('lost', 'not_interested') AND is_archived = 0
        GROUP BY disqualified_reason
        LIMIT 6
      `).all();

      const convRate = totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : '0';

      return jsonResponse({
        kpis: {
          totalLeads,
          newLeads,
          hotLeads,
          warmLeads,
          contactToday,
          followupToday,
          overdueFollowups,
          inNegotiation,
          wonDeals,
          notInterested,
          futureOpps,
          archivedLeads,
          conversionRate: convRate + '%'
        },
        charts: {
          byStatus,
          byQuality,
          byCampaign,
          byPlatform,
          lostReasons
        }
      });
    }

    // 2. Leads List API with Filters, Search, and Pagination
    if (pathname === '/api/leads' && method === 'GET') {
      const q = parsedUrl.searchParams.get('q') || '';
      const status = parsedUrl.searchParams.get('status') || '';
      const priority = parsedUrl.searchParams.get('priority') || '';
      const campaign = parsedUrl.searchParams.get('campaign') || '';
      const service = parsedUrl.searchParams.get('service') || '';
      const archived = parsedUrl.searchParams.get('archived') === '1' ? 1 : 0;
      const workspace = parsedUrl.searchParams.get('workspace') || ''; // e.g. overdue, today, untouched_hot, awaiting, upcoming, review_archive
      const sortBy = parsedUrl.searchParams.get('sort_by') || 'score_desc';

      let sql = 'SELECT * FROM leads WHERE is_archived = ?';
      const params = [archived];

      if (q) {
        sql += ` AND (full_name LIKE ? OR phone_number LIKE ? OR normalized_phone LIKE ? OR email LIKE ? OR job_title LIKE ? OR campaign_name LIKE ?)`;
        const wild = `%${q}%`;
        params.push(wild, wild, wild, wild, wild, wild);
      }

      if (status) {
        sql += ' AND crm_status = ?';
        params.push(status);
      }

      if (priority) {
        sql += ' AND lead_priority = ?';
        params.push(priority);
      }

      if (campaign) {
        sql += ' AND campaign_name = ?';
        params.push(campaign);
      }

      if (service) {
        sql += ' AND package_requested LIKE ?';
        params.push(`%${service}%`);
      }

      // Workspace dedicated views for Today's Follow-up
      if (workspace === 'overdue') {
        sql += " AND next_followup_date IS NOT NULL AND date(next_followup_date) < date('now') AND crm_status NOT IN ('won', 'lost', 'not_interested')";
      } else if (workspace === 'today') {
        sql += " AND (crm_status = 'followup_today' OR (next_followup_date IS NOT NULL AND date(next_followup_date) = date('now')))";
      } else if (workspace === 'untouched_hot') {
        sql += " AND lead_priority = 'hot' AND contact_attempts_count = 0";
      } else if (workspace === 'awaiting') {
        sql += " AND crm_status = 'contacted_awaiting'";
      } else if (workspace === 'upcoming') {
        sql += " AND next_followup_date IS NOT NULL AND date(next_followup_date) > date('now') AND date(next_followup_date) <= date('now', '+7 days')";
      } else if (workspace === 'review_archive') {
        sql += " AND (contact_attempts_count >= 3 OR crm_status = 'cold_low') AND crm_status NOT IN ('won', 'archived')";
      }

      // Sorting
      if (sortBy === 'score_desc') {
        sql += ' ORDER BY lead_score DESC, id DESC';
      } else if (sortBy === 'score_asc') {
        sql += ' ORDER BY lead_score ASC, id DESC';
      } else if (sortBy === 'newest') {
        sql += ' ORDER BY id DESC';
      } else if (sortBy === 'oldest') {
        sql += ' ORDER BY id ASC';
      } else if (sortBy === 'followup_urgency') {
        sql += ' ORDER BY next_followup_date ASC NULLS LAST, lead_score DESC';
      } else {
        sql += ' ORDER BY lead_score DESC, id DESC';
      }

      const rows = db.prepare(sql).all(...params);
      return jsonResponse({ leads: rows, count: rows.length });
    }

    // 3. Single Lead Detail API
    if (pathname.startsWith('/api/leads/') && method === 'GET') {
      const id = parseInt(pathname.replace('/api/leads/', ''), 10);
      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
      if (!lead) return jsonResponse({ error: 'Lead not found' }, 404);

      const activities = db.prepare('SELECT * FROM activities WHERE lead_id = ? ORDER BY id DESC').all(id);
      const followups = db.prepare('SELECT * FROM followup_tasks WHERE lead_id = ? ORDER BY due_date ASC').all(id);

      return jsonResponse({ lead, activities, followups });
    }

    // 4. Update Lead / Log Activity API
    if (pathname.startsWith('/api/leads/') && method === 'PUT') {
      const id = parseInt(pathname.replace('/api/leads/', ''), 10);
      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
      if (!lead) return jsonResponse({ error: 'Lead not found' }, 404);

      const body = await getBody();

      const newStatus = body.crm_status !== undefined ? body.crm_status : lead.crm_status;
      const newNotes = body.sales_notes !== undefined ? body.sales_notes : lead.sales_notes;
      const nextFollowup = body.next_followup_date !== undefined ? body.next_followup_date : lead.next_followup_date;
      const disqualifiedReason = body.disqualified_reason !== undefined ? body.disqualified_reason : lead.disqualified_reason;
      const isArchived = body.is_archived !== undefined ? (body.is_archived ? 1 : 0) : lead.is_archived;

      let contactAttempts = lead.contact_attempts_count;
      let lastContactDate = lead.last_contact_date;

      // If logging an activity outcome
      if (body.activity_type && body.activity_outcome) {
        contactAttempts += 1;
        lastContactDate = new Date().toISOString();

        db.prepare(`
          INSERT INTO activities (lead_id, type, outcome, notes)
          VALUES (?, ?, ?, ?)
        `).run(id, body.activity_type, body.activity_outcome, body.activity_notes || '');
      }

      // If scheduling a follow-up task
      if (body.new_followup_task && body.new_followup_task.due_date) {
        db.prepare(`
          INSERT INTO followup_tasks (lead_id, due_date, priority, reason)
          VALUES (?, ?, ?, ?)
        `).run(id, body.new_followup_task.due_date, body.new_followup_task.priority || 'normal', body.new_followup_task.reason || '');
      }

      // Re-evaluate score if status changed or requested
      let updatedScore = lead.lead_score;
      let updatedPriority = lead.lead_priority;
      let updatedRecommendation = lead.recommended_action;

      if (body.recalculate_score || newStatus === 'not_interested' || newStatus === 'won') {
        const tempLead = { ...lead, crm_status: newStatus, raw_feedback: (body.activity_notes ? lead.raw_feedback + ' | ' + body.activity_notes : lead.raw_feedback) };
        const conf = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'crm_config'").get().value);
        const evalRes = calculateLeadScore(tempLead, conf);
        updatedScore = newStatus === 'won' ? 100 : (newStatus === 'not_interested' ? 15 : evalRes.score);
        updatedPriority = newStatus === 'won' ? 'hot' : evalRes.priority;
        updatedRecommendation = evalRes.recommended_action;
      }

      db.prepare(`
        UPDATE leads SET
          crm_status = ?,
          sales_notes = ?,
          next_followup_date = ?,
          disqualified_reason = ?,
          is_archived = ?,
          contact_attempts_count = ?,
          last_contact_date = ?,
          lead_score = ?,
          lead_priority = ?,
          recommended_action = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newStatus, newNotes, nextFollowup, disqualifiedReason, isArchived, contactAttempts, lastContactDate, updatedScore, updatedPriority, updatedRecommendation, id);

      const updatedLead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
      return jsonResponse({ success: true, lead: updatedLead });
    }

    // 5. Bulk Update Leads API
    if (pathname === '/api/leads/bulk' && method === 'POST') {
      const body = await getBody();
      const { ids, action, value } = body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return jsonResponse({ error: 'No lead IDs provided' }, 400);
      }

      if (action === 'update_status') {
        const stmt = db.prepare('UPDATE leads SET crm_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        for (const id of ids) {
          stmt.run(value, id);
        }
      } else if (action === 'schedule_followup') {
        const stmt = db.prepare('UPDATE leads SET next_followup_date = ?, crm_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        for (const id of ids) {
          stmt.run(value, 'followup_today', id);
        }
      } else if (action === 'archive') {
        const stmt = db.prepare('UPDATE leads SET is_archived = 1, disqualified_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        for (const id of ids) {
          stmt.run(value || 'أرشفة جماعية', id);
        }
      } else if (action === 'restore') {
        const stmt = db.prepare('UPDATE leads SET is_archived = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        for (const id of ids) {
          stmt.run(id);
        }
      }

      return jsonResponse({ success: true, affectedCount: ids.length });
    }

    // 6. Import Preview API
    if (pathname === '/api/import/preview' && method === 'POST') {
      const body = await getBody();
      const { rows, rawHeaders } = body;

      if (!Array.isArray(rows) || rows.length === 0) {
        return jsonResponse({ error: 'No rows provided' }, 400);
      }

      const conf = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'crm_config'").get().value);

      // Check for duplicates in database and in incoming batch
      const existingPhones = new Set();
      const existingEmails = new Set();
      const existingSourceIds = new Set();

      const allExisting = db.prepare('SELECT id, normalized_phone, email, source_lead_id FROM leads').all();
      for (const item of allExisting) {
        if (item.normalized_phone) existingPhones.add(item.normalized_phone);
        if (item.email) existingEmails.add(item.email.toLowerCase().trim());
        if (item.source_lead_id) existingSourceIds.add(String(item.source_lead_id).trim());
      }

      let newCount = 0;
      let duplicateCount = 0;
      let flaggedCount = 0;
      const previewRows = [];

      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const normPhone = normalizePhoneNumber(r.phone_number);
        const emailLower = (r.email || r.work_email || '').toLowerCase().trim();
        const sourceId = String(r.id || r.source_lead_id || '').trim();

        let isDuplicate = false;
        let dupReason = '';

        if (sourceId && existingSourceIds.has(sourceId)) {
          isDuplicate = true;
          dupReason = `معرف العميل مطابق (${sourceId})`;
        } else if (normPhone && existingPhones.has(normPhone)) {
          isDuplicate = true;
          dupReason = `رقم الهاتف مكرر (${normPhone})`;
        } else if (emailLower && existingEmails.has(emailLower)) {
          isDuplicate = true;
          dupReason = `البريد الإلكتروني مكرر (${emailLower})`;
        }

        const scoringResult = calculateLeadScore(r, conf);

        const warnings = [];
        if (!normPhone) warnings.push('رقم الهاتف مفقود');
        else if (normPhone.length < 10) warnings.push('رقم هاتف غير قياسي');
        if (!r.full_name) warnings.push('اسم العميل غير محدد');

        if (isDuplicate) duplicateCount++;
        else newCount++;

        if (warnings.length > 0) flaggedCount++;

        if (previewRows.length < 50) {
          previewRows.push({
            original_index: i + 1,
            data: r,
            normalized_phone: normPhone,
            is_duplicate: isDuplicate,
            duplicate_reason: dupReason,
            warnings,
            scoring: scoringResult
          });
        }
      }

      return jsonResponse({
        total_rows: rows.length,
        new_count: newCount,
        duplicate_count: duplicateCount,
        flagged_count: flaggedCount,
        preview_sample: previewRows
      });
    }

    // 7. Import Commit API (Persists leads, preserves old sales notes, records batch)
    if (pathname === '/api/import/commit' && method === 'POST') {
      const body = await getBody();
      const { rows, fileName, duplicateStrategy, rawHeaders } = body;

      if (!Array.isArray(rows) || rows.length === 0) {
        return jsonResponse({ error: 'No rows provided' }, 400);
      }

      const conf = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'crm_config'").get().value);

      // Record batch
      const batchRes = db.prepare(`
        INSERT INTO import_batches (file_name, total_rows, raw_headers)
        VALUES (?, ?, ?)
      `).run(fileName || 'Manual_Import.xlsx', rows.length, JSON.stringify(rawHeaders || []));
      const batchId = batchRes.lastInsertRowid;

      let importedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let flaggedCount = 0;

      const checkDupPhone = db.prepare("SELECT * FROM leads WHERE normalized_phone = ? AND normalized_phone != '' LIMIT 1");
      const checkDupEmail = db.prepare("SELECT * FROM leads WHERE email = ? AND email != '' LIMIT 1");
      const checkDupSourceId = db.prepare("SELECT * FROM leads WHERE source_lead_id = ? AND source_lead_id != '' LIMIT 1");

      const insertLeadStmt = db.prepare(`
        INSERT INTO leads (
          source_lead_id, created_time, full_name, phone_number, normalized_phone,
          email, work_email, job_title, package_requested, start_timeline,
          raw_lead_status, raw_lead_quality, raw_next_action, raw_feedback,
          platform, campaign_name, campaign_id, adset_name, adset_id,
          ad_name, ad_id, form_name, form_id, is_organic, inbox_url,
          import_batch_id, crm_status, lead_score, lead_priority,
          scoring_explanation, positive_signals, negative_signals,
          recommended_action, recommended_timing, recommended_channel,
          confidence_level, whatsapp_draft
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?,
          ?, ?
        )
      `);

      const updateLeadStmt = db.prepare(`
        UPDATE leads SET
          package_requested = COALESCE(?, package_requested),
          start_timeline = COALESCE(?, start_timeline),
          job_title = COALESCE(?, job_title),
          raw_feedback = CASE WHEN raw_feedback IS NULL OR raw_feedback = '' THEN ? ELSE raw_feedback || ' | ' || ? END,
          inbox_url = COALESCE(?, inbox_url),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      for (const row of rows) {
        const normPhone = normalizePhoneNumber(row.phone_number);
        const emailLower = (row.email || row.work_email || '').toLowerCase().trim();
        const sourceId = String(row.id || row.source_lead_id || '').trim();

        let existing = null;
        if (sourceId) existing = checkDupSourceId.get(sourceId);
        if (!existing && normPhone) existing = checkDupPhone.get(normPhone);
        if (!existing && emailLower) existing = checkDupEmail.get(emailLower);

        if (existing) {
          if (duplicateStrategy === 'skip') {
            skippedCount++;
            continue;
          } else {
            // Update without wiping historical notes/activities
            updateLeadStmt.run(
              row.choose_your_virtual_address_package_ || row.package_requested || null,
              row.when_do_you_want_to_start_ || row.start_timeline || null,
              row.job_title || null,
              row.fedback || row.raw_feedback || '',
              row.fedback || row.raw_feedback || '',
              row.inbox_url || null,
              existing.id
            );
            updatedCount++;
            continue;
          }
        }

        // New Lead
        const scoring = calculateLeadScore(row, conf);
        if (!normPhone || normPhone.length < 10) flaggedCount++;

        insertLeadStmt.run(
          sourceId || null,
          row.created_time || new Date().toISOString(),
          row.full_name || 'بدون اسم',
          row.phone_number || '',
          normPhone,
          row.email || '',
          row.work_email || '',
          row.job_title || '',
          row.choose_your_virtual_address_package_ || row.package_requested || 'باقة العنوان الافتراضي',
          row.when_do_you_want_to_start_ || row.start_timeline || 'غير محدد',
          row.lead_status || row.raw_lead_status || '',
          row['Lead Quality'] || row.raw_lead_quality || '',
          row['Next Action'] || row.raw_next_action || '',
          row.fedback || row.raw_feedback || '',
          row.platform || 'Facebook',
          row.campaign_name || 'حملة إعلانات العنوان الافتراضي',
          row.campaign_id || '',
          row.adset_name || '',
          row.adset_id || '',
          row.ad_name || '',
          row.ad_id || '',
          row.form_name || '',
          row.form_id || '',
          row.is_organic ? 1 : 0,
          row.inbox_url || '',
          batchId,
          scoring.crm_status,
          scoring.score,
          scoring.priority,
          scoring.explanation,
          JSON.stringify(scoring.posSignals),
          JSON.stringify(scoring.negSignals),
          scoring.recommended_action,
          scoring.recommended_timing,
          scoring.recommended_channel,
          scoring.confidence_level,
          scoring.whatsapp_draft
        );
        importedCount++;
      }

      // Update batch counts
      db.prepare(`
        UPDATE import_batches SET
          imported_count = ?,
          updated_count = ?,
          skipped_count = ?,
          flagged_count = ?
        WHERE id = ?
      `).run(importedCount, updatedCount, skippedCount, flaggedCount, batchId);

      return jsonResponse({
        success: true,
        batchId,
        importedCount,
        updatedCount,
        skippedCount,
        flaggedCount
      });
    }

    // 8. Import History API
    if (pathname === '/api/import/history' && method === 'GET') {
      const history = db.prepare('SELECT * FROM import_batches ORDER BY id DESC LIMIT 20').all();
      return jsonResponse({ history });
    }

    // 9. Settings API (Get & Save)
    if (pathname === '/api/settings' && method === 'GET') {
      const row = db.prepare("SELECT value FROM settings WHERE key = 'crm_config'").get();
      return jsonResponse(row ? JSON.parse(row.value) : {});
    }

    if (pathname === '/api/settings' && method === 'PUT') {
      const body = await getBody();
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('crm_config', ?)").run(JSON.stringify(body));

      // Optional: re-score all active leads according to new weights
      if (body.recalculate_all_leads) {
        const leads = db.prepare('SELECT * FROM leads WHERE is_archived = 0').all();
        const updateStmt = db.prepare(`
          UPDATE leads SET
            lead_score = ?,
            lead_priority = ?,
            crm_status = CASE WHEN crm_status IN ('won', 'lost', 'in_negotiation', 'contacted_awaiting') THEN crm_status ELSE ? END,
            scoring_explanation = ?,
            recommended_action = ?
          WHERE id = ?
        `);

        for (const l of leads) {
          const evalRes = calculateLeadScore(l, body);
          updateStmt.run(evalRes.score, evalRes.priority, evalRes.crm_status, evalRes.explanation, evalRes.recommended_action, l.id);
        }
      }

      return jsonResponse({ success: true });
    }

    // 10. Sample Egyptian Leads Seed API
    if (pathname === '/api/sample-data/seed' && method === 'POST') {
      const sampleLeads = [
        {
          id: 'fb_lead_1001',
          created_time: '2026-10-08T10:15:00Z',
          ad_id: 'ad_9011',
          ad_name: 'إعلان المقر الإداري للبطاقة الضريبية - فيديو',
          adset_id: 'adset_801',
          adset_name: 'أصحاب الشركات الناشئة والمحامين - التجمع والمعادي',
          campaign_id: 'cmp_701',
          campaign_name: 'FB_Virtual_Office_Tax_Card_Q4',
          form_id: 'frm_501',
          form_name: 'استمارة باقات المقر الافتراضي',
          is_organic: 0,
          platform: 'fb',
          choose_your_virtual_address_package_: 'باقة العنوان الافتراضي السنوية (البطاقة الضريبية والسجل التجاري)',
          when_do_you_want_to_start_: 'فوراً',
          email: 'eng.ahmed.soliman@techcorp-eg.com',
          full_name: 'م. أحمد سليمان النجار',
          phone_number: '01012345678',
          job_title: 'مؤسس شركة برمجة وتطبيقات ذكية',
          work_email: 'ahmed@techcorp-eg.com',
          inbox_url: 'https://business.facebook.com/latest/inbox/messenger',
          lead_status: 'New',
          'Lead Quality': 'High',
          'Next Action': 'Call Today',
          fedback: 'محتاج مقر رسمي لتسجيل الشركة في الضرائب وهيئة الاستثمار الأسبوع ده'
        },
        {
          id: 'fb_lead_1002',
          created_time: '2026-10-07T14:30:00Z',
          ad_id: 'ad_9012',
          ad_name: 'إعلان قاعات الاجتماعات لرواد الأعمال',
          adset_id: 'adset_802',
          adset_name: 'المستشارين والمدربين - القاهرة الجديدة',
          campaign_id: 'cmp_702',
          campaign_name: 'IG_Meeting_Rooms_Training_Q4',
          form_id: 'frm_502',
          form_name: 'حجز باقات قاعات الاجتماعات',
          is_organic: 0,
          platform: 'ig',
          choose_your_virtual_address_package_: 'باقة قاعات الاجتماعات (20 ساعة شهرياً)',
          when_do_you_want_to_start_: 'خلال أسبوعين',
          email: 'drtarek.management@gmail.com',
          full_name: 'د. طارق الشناوي',
          phone_number: '01198765432',
          job_title: 'استشاري إدارة أعمال وتدريب شركات',
          work_email: 'tarek@consultancy-hub.com',
          inbox_url: 'https://business.facebook.com/latest/inbox/messenger',
          lead_status: 'Contacted',
          'Lead Quality': 'High',
          'Next Action': 'Follow Up with Brochure',
          fedback: 'طلب تفاصيل القاعة الكبيرة وشاشات العرض لعقد ورش عمل أسبوعية'
        },
        {
          id: 'fb_lead_1003',
          created_time: '2026-10-06T09:00:00Z',
          ad_id: 'ad_9011',
          ad_name: 'إعلان المقر الإداري للبطاقة الضريبية',
          adset_id: 'adset_801',
          adset_name: 'رواد الأعمال ومؤسسو الشركات',
          campaign_id: 'cmp_701',
          campaign_name: 'FB_Virtual_Office_Tax_Card_Q4',
          form_id: 'frm_501',
          form_name: 'استمارة باقات المقر الافتراضي',
          is_organic: 0,
          platform: 'fb',
          choose_your_virtual_address_package_: 'باقة العنوان الافتراضي السنوية',
          when_do_you_want_to_start_: 'بعد 3 شهور',
          email: 'kareem.elalfy@logistics-plus.net',
          full_name: 'أ/ كريم الألفي',
          phone_number: '01234567890',
          job_title: 'مدير تطوير أعمال - شركة شحن دولي',
          work_email: '',
          inbox_url: '',
          lead_status: 'Nurture',
          'Lead Quality': 'Medium',
          'Next Action': 'Follow up next quarter',
          fedback: 'هنفتح فرع القاهرة بداية السنة الجديدة بعد انتهاء التراخيص الخارجية'
        },
        {
          id: 'fb_lead_1004',
          created_time: '2026-10-05T16:45:00Z',
          ad_id: 'ad_9013',
          ad_name: 'إعلان خصومات باقات المقر نصف السنوية',
          adset_id: 'adset_803',
          adset_name: 'التجارة الإلكترونية والـ Dropshipping',
          campaign_id: 'cmp_703',
          campaign_name: 'FB_ECommerce_Founders_Oct',
          form_id: 'frm_503',
          form_name: 'استمارة المتاجر الإلكترونية',
          is_organic: 0,
          platform: 'fb',
          choose_your_virtual_address_package_: 'باقة العنوان الافتراضي نصف السنوية',
          when_do_you_want_to_start_: 'فوراً',
          email: 'sara.designer@outlook.com',
          full_name: 'أ/ سارة عبد الرحمن',
          phone_number: '01511223344',
          job_title: 'مؤسسة متجر إلكتروني للملابس والبراندات',
          work_email: '',
          inbox_url: 'https://business.facebook.com/latest/inbox/messenger',
          lead_status: 'In Negotiation',
          'Lead Quality': 'High',
          'Next Action': 'Send Contract Draft',
          fedback: 'محتاجة العنوان لتوثيق المتجر في منصات الدفع وبوابة الضرائب'
        },
        {
          id: 'fb_lead_1005',
          created_time: '2026-10-04T11:20:00Z',
          ad_id: 'ad_9011',
          ad_name: 'إعلان المقر الإداري للبطاقة الضريبية',
          adset_id: 'adset_801',
          adset_name: 'رواد الأعمال ومؤسسو الشركات',
          campaign_id: 'cmp_701',
          campaign_name: 'FB_Virtual_Office_Tax_Card_Q4',
          form_id: 'frm_501',
          form_name: 'استمارة باقات المقر الافتراضي',
          is_organic: 0,
          platform: 'fb',
          choose_your_virtual_address_package_: 'باقة مقر الشركات المتكاملة (عنوان + قاعات)',
          when_do_you_want_to_start_: 'غير مهتم',
          email: 'hassan.ali99@yahoo.com',
          full_name: 'أ/ حسن علي رضوان',
          phone_number: '01055667788',
          job_title: 'مستورد',
          work_email: '',
          inbox_url: '',
          lead_status: 'Disqualified',
          'Lead Quality': 'Low',
          'Next Action': 'Stop Contact',
          fedback: 'غير مهتم - استأجر مقر فعلي في العبور ورفض الخدمة'
        },
        {
          id: 'fb_lead_1006',
          created_time: '2026-10-03T13:10:00Z',
          ad_id: 'ad_9012',
          ad_name: 'إعلان قاعات الاجتماعات لرواد الأعمال',
          adset_id: 'adset_802',
          adset_name: 'المستشارين والمدربين',
          campaign_id: 'cmp_702',
          campaign_name: 'IG_Meeting_Rooms_Training_Q4',
          form_id: 'frm_502',
          form_name: 'حجز باقات قاعات الاجتماعات',
          is_organic: 0,
          platform: 'ig',
          choose_your_virtual_address_package_: 'باقة قاعات الاجتماعات (10 ساعات مرنة)',
          when_do_you_want_to_start_: 'خلال أسبوع',
          email: 'info@nour-advocates.com',
          full_name: 'أ/ نور الدين المحامي',
          phone_number: '01122334455',
          job_title: 'محامٍ بالنقض واستشارات شركات',
          work_email: '',
          inbox_url: '',
          lead_status: 'Won',
          'Lead Quality': 'High',
          'Next Action': 'Deal Closed',
          fedback: 'تم توقيع العقد وسداد الباقة السنوية لفرع التجمع الخامس'
        },
        {
          id: 'fb_lead_1007',
          created_time: '2026-10-02T15:00:00Z',
          ad_id: 'ad_9011',
          ad_name: 'إعلان المقر الإداري للبطاقة الضريبية',
          adset_id: 'adset_801',
          adset_name: 'رواد الأعمال ومؤسسو الشركات',
          campaign_id: 'cmp_701',
          campaign_name: 'FB_Virtual_Office_Tax_Card_Q4',
          form_id: 'frm_501',
          form_name: 'استمارة باقات المقر الافتراضي',
          is_organic: 0,
          platform: 'fb',
          choose_your_virtual_address_package_: 'باقة العنوان الافتراضي السنوية',
          when_do_you_want_to_start_: 'فوراً',
          email: 'mahmoud.fathy@eg-export.com',
          full_name: 'م/ محمود فتحي',
          phone_number: '01099887766',
          job_title: 'مدير شركة تصدير حاصرات زراعية',
          work_email: '',
          inbox_url: '',
          lead_status: 'Contacted',
          'Lead Quality': 'High',
          'Next Action': 'Follow up today',
          fedback: 'مهتم جداً ومحتاج معاينة فرع المعادي'
        }
      ];

      // Insert or ignore sample leads
      const conf = JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'crm_config'").get().value);

      let count = 0;
      for (const row of sampleLeads) {
        const normPhone = normalizePhoneNumber(row.phone_number);
        const exists = db.prepare('SELECT id FROM leads WHERE normalized_phone = ?').get(normPhone);
        if (!exists) {
          const scoring = calculateLeadScore(row, conf);
          const finalStatus = row.lead_status === 'Won' ? 'won' : (row.fedback.includes('غير مهتم') ? 'not_interested' : scoring.crm_status);

          const insertRes = db.prepare(`
            INSERT INTO leads (
              source_lead_id, created_time, full_name, phone_number, normalized_phone,
              email, work_email, job_title, package_requested, start_timeline,
              raw_lead_status, raw_lead_quality, raw_next_action, raw_feedback,
              platform, campaign_name, campaign_id, adset_name, adset_id,
              ad_name, ad_id, form_name, form_id, is_organic, inbox_url,
              crm_status, lead_score, lead_priority,
              scoring_explanation, positive_signals, negative_signals,
              recommended_action, recommended_timing, recommended_channel,
              confidence_level, whatsapp_draft, next_followup_date
            ) VALUES (
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?
            )
          `).run(
            row.id,
            row.created_time,
            row.full_name,
            row.phone_number,
            normPhone,
            row.email,
            row.work_email,
            row.job_title,
            row.choose_your_virtual_address_package_,
            row.when_do_you_want_to_start_,
            row.lead_status,
            row['Lead Quality'],
            row['Next Action'],
            row.fedback,
            row.platform,
            row.campaign_name,
            row.campaign_id,
            row.adset_name,
            row.adset_id,
            row.ad_name,
            row.ad_id,
            row.form_name,
            row.form_id,
            0,
            row.inbox_url,
            finalStatus,
            row.lead_status === 'Won' ? 100 : scoring.score,
            row.lead_status === 'Won' ? 'hot' : scoring.priority,
            scoring.explanation,
            JSON.stringify(scoring.posSignals),
            JSON.stringify(scoring.negSignals),
            scoring.recommended_action,
            scoring.recommended_timing,
            scoring.recommended_channel,
            scoring.confidence_level,
            scoring.whatsapp_draft,
            finalStatus === 'followup_today' || row.full_name.includes('محمود') ? new Date().toISOString() : null
          );

          // Add a sample call activity
          if (row.lead_status === 'Won' || row.lead_status === 'Contacted') {
            db.prepare(`
              INSERT INTO activities (lead_id, type, outcome, notes)
              VALUES (?, 'call', ?, ?)
            `).run(
              insertRes.lastInsertRowid,
              row.lead_status === 'Won' ? 'won' : 'interested',
              row.fedback
            );
          }

          count++;
        }
      }

      return jsonResponse({ success: true, seededCount: count });
    }

    // Static File Serving
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    
    // Security check to avoid path traversal
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403);
      res.end('Access Denied');
      return;
    }

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
        '.csv': 'text/csv; charset=utf-8'
      };
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    // Default SPA fallback to index.html
    const indexHtml = path.join(PUBLIC_DIR, 'index.html');
    if (fs.existsSync(indexHtml)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexHtml).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('الصفحة غير موجودة - 404');
  } catch (err) {
    console.error('Server API Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
  }
};

const server = http.createServer(requestListener);

server.listen(PORT, () => {
  console.log(`[Smart Address Egypt CRM Server] running at http://localhost:${PORT}`);
});
