-- ==============================================================================
-- Smart Address Egypt CRM - Database Schema for Supabase / PostgreSQL
-- ==============================================================================

-- 1. Import Batches Table
CREATE TABLE IF NOT EXISTS public.import_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    total_records INTEGER NOT NULL DEFAULT 0,
    imported_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    raw_summary JSONB DEFAULT '{}'::jsonb
);

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id TEXT,
    created_time TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    imported_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    
    -- Contact Information
    full_name TEXT NOT NULL,
    phone_number TEXT,
    phone_normalized TEXT,
    phone_valid BOOLEAN DEFAULT true,
    email TEXT,
    work_email TEXT,
    job_title TEXT,
    
    -- Request & Service Information
    package TEXT,
    start_timeline TEXT,
    
    -- Source / Ad Metadata
    ad_id TEXT,
    ad_name TEXT,
    adset_id TEXT,
    adset_name TEXT,
    campaign_id TEXT,
    campaign_name TEXT,
    form_id TEXT,
    form_name TEXT,
    is_organic BOOLEAN DEFAULT false,
    platform TEXT DEFAULT 'Meta Ads',
    inbox_url TEXT,
    import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE SET NULL,
    
    -- Source Feedback & Status (Preserved, Never Overwritten)
    source_lead_status TEXT,
    source_lead_quality TEXT,
    source_next_action TEXT,
    source_feedback TEXT,
    
    -- CRM Sales Lifecycle & Management
    crm_status TEXT NOT NULL DEFAULT 'جديد',
    -- Stages: 'جديد', 'تواصل اليوم', 'متابعة اليوم', 'تم التواصل — بانتظار الرد', 'مهتم — في مرحلة التفاوض', 'فرص مستقبلية', 'غير مهتم', 'بيانات غير مكتملة', 'بارد', 'تم التعاقد', 'خسر'
    
    -- Scoring & AI / Recommendation Engine
    lead_score INTEGER NOT NULL DEFAULT 50,
    lead_priority TEXT NOT NULL DEFAULT 'warm', -- 'hot', 'warm', 'nurture', 'low'
    scoring_breakdown JSONB DEFAULT '{}'::jsonb,
    recommended_action TEXT,
    recommended_timing TEXT,
    recommended_channel TEXT,
    whatsapp_draft TEXT,
    confidence_level TEXT,
    
    -- Contact & Follow-up Tracking
    contact_attempts INTEGER NOT NULL DEFAULT 0,
    last_contact_date TIMESTAMPTZ,
    next_followup_date TIMESTAMPTZ,
    
    -- Loss / Archive Handling
    lost_reason TEXT,
    is_archived BOOLEAN DEFAULT false,
    archive_reason TEXT,
    archived_at TIMESTAMPTZ,
    
    -- Original Verbatim Spreadsheet Row Data
    raw_source JSONB DEFAULT '{}'::jsonb,
    
    -- Audit & Ownership
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Contact Activities Table
CREATE TABLE IF NOT EXISTS public.contact_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL, -- 'call', 'whatsapp', 'email', 'meeting', 'note'
    outcome TEXT NOT NULL, -- 'no_answer', 'interested', 'not_interested', 'requested_quote', 'call_later', 'invalid_number', 'meeting_scheduled', 'converted', 'other'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    next_followup_set TIMESTAMPTZ
);

-- 4. Follow-up Tasks Table
CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    due_date TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    priority TEXT NOT NULL DEFAULT 'normal', -- 'high', 'normal', 'low'
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. Sales Notes Table
CREATE TABLE IF NOT EXISTS public.sales_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 6. User Settings & Scoring Rules Table
CREATE TABLE IF NOT EXISTS public.crm_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{
        "score_weights": {
            "intent": 25,
            "timeline": 20,
            "package": 20,
            "contact_validity": 15,
            "decision_maker": 10,
            "quality_feedback": 10
        },
        "thresholds": {
            "hot": 80,
            "warm": 60,
            "nurture": 35
        },
        "max_unsuccessful_attempts": 3,
        "default_followup_days": 2
    }'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_leads_phone_normalized ON public.leads(phone_normalized);
CREATE INDEX IF NOT EXISTS idx_leads_crm_status ON public.leads(crm_status);
CREATE INDEX IF NOT EXISTS idx_leads_lead_priority ON public.leads(lead_priority);
CREATE INDEX IF NOT EXISTS idx_leads_next_followup ON public.leads(next_followup_date);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON public.leads(campaign_name);
CREATE INDEX IF NOT EXISTS idx_leads_is_archived ON public.leads(is_archived);
CREATE INDEX IF NOT EXISTS idx_contact_activities_lead ON public.contact_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_lead ON public.follow_up_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_sales_notes_lead ON public.sales_notes(lead_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_settings ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage data
CREATE POLICY "Authenticated users full access to leads" ON public.leads
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to contact_activities" ON public.contact_activities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to follow_up_tasks" ON public.follow_up_tasks
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to import_batches" ON public.import_batches
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users full access to sales_notes" ON public.sales_notes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Users manage own settings" ON public.crm_settings
    FOR ALL USING (auth.uid() = user_id);
