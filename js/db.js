/**
 * Smart Address Egypt CRM - Database & Persistence Layer
 * Powered by Dexie.js (IndexedDB) with LocalStorage Fallback & Supabase Cloud Sync
 */

class CrmDatabase {
  constructor() {
    this.isReady = false;
    this.listeners = [];
    this.init();
  }

  async init() {
    try {
      if (window.Dexie) {
        this.db = new Dexie('SmartAddressEgyptCRM');
        this.db.version(1).stores({
          leads: 'id, source_id, full_name, phone_normalized, crm_status, lead_score, lead_priority, next_followup_date, campaign_name, is_archived, created_time, import_batch_id',
          activities: 'id, lead_id, activity_type, outcome, created_at',
          tasks: 'id, lead_id, due_date, status',
          batches: 'id, file_name, created_at',
          settings: 'id'
        });
        await this.db.open();
        this.useIndexedDB = true;
        console.log('CRM Database initialized successfully with IndexedDB');
      } else {
        console.warn('Dexie not found, using LocalStorage fallback');
        this.useIndexedDB = false;
      }
    } catch (err) {
      console.error('IndexedDB initialization failed, falling back to LocalStorage', err);
      this.useIndexedDB = false;
    }

    this.isReady = true;
    this.notifyListeners('init');
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners(event, data) {
    this.listeners.forEach(fn => {
      try { fn(event, data); } catch (e) { console.error('Listener error:', e); }
    });
  }

  // --- Leads CRUD ---
  async getAllLeads(includeArchived = false) {
    if (this.useIndexedDB) {
      let leads = await this.db.leads.toArray();
      if (!includeArchived) {
        leads = leads.filter(l => !l.is_archived);
      }
      return leads.sort((a, b) => new Date(b.created_time || 0) - new Date(a.created_time || 0));
    } else {
      const stored = localStorage.getItem('sae_leads') || '[]';
      let leads = JSON.parse(stored);
      if (!includeArchived) {
        leads = leads.filter(l => !l.is_archived);
      }
      return leads.sort((a, b) => new Date(b.created_time || 0) - new Date(a.created_time || 0));
    }
  }

  async getLeadById(id) {
    if (this.useIndexedDB) {
      return await this.db.leads.get(id);
    } else {
      const leads = await this.getAllLeads(true);
      return leads.find(l => l.id === id);
    }
  }

  async saveLead(lead) {
    if (!lead.id) lead.id = 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
    lead.updated_at = new Date().toISOString();

    if (this.useIndexedDB) {
      await this.db.leads.put(lead);
    } else {
      const leads = await this.getAllLeads(true);
      const idx = leads.findIndex(l => l.id === lead.id);
      if (idx >= 0) leads[idx] = lead;
      else leads.unshift(lead);
      localStorage.setItem('sae_leads', JSON.stringify(leads));
    }

    this.notifyListeners('lead_saved', lead);
    this.triggerSupabaseSync('lead', lead);
    return lead;
  }

  async bulkSaveLeads(leadsArray) {
    const now = new Date().toISOString();
    leadsArray.forEach(l => {
      if (!l.id) l.id = 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
      l.updated_at = now;
    });

    if (this.useIndexedDB) {
      await this.db.leads.bulkPut(leadsArray);
    } else {
      const existing = await this.getAllLeads(true);
      const map = new Map(existing.map(l => [l.id, l]));
      leadsArray.forEach(l => map.set(l.id, l));
      localStorage.setItem('sae_leads', JSON.stringify(Array.from(map.values())));
    }

    this.notifyListeners('leads_bulk_saved', leadsArray);
    return leadsArray;
  }

  async deleteLead(id, permanent = false) {
    if (permanent) {
      if (this.useIndexedDB) {
        await this.db.leads.delete(id);
        await this.db.activities.where('lead_id').equals(id).delete();
      } else {
        let leads = await this.getAllLeads(true);
        leads = leads.filter(l => l.id !== id);
        localStorage.setItem('sae_leads', JSON.stringify(leads));
      }
    } else {
      const lead = await this.getLeadById(id);
      if (lead) {
        lead.is_archived = true;
        lead.archived_at = new Date().toISOString();
        await this.saveLead(lead);
      }
    }
    this.notifyListeners('lead_deleted', id);
  }

  async restoreLead(id) {
    const lead = await this.getLeadById(id);
    if (lead) {
      lead.is_archived = false;
      lead.archived_at = null;
      await this.saveLead(lead);
      this.notifyListeners('lead_restored', lead);
    }
  }

  // --- Activities & Contact Logs ---
  async addActivity(leadId, activity) {
    const act = {
      id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      lead_id: leadId,
      activity_type: activity.activity_type || 'call',
      outcome: activity.outcome || 'other',
      notes: activity.notes || '',
      created_at: activity.created_at || new Date().toISOString(),
      next_followup_set: activity.next_followup_set || null
    };

    if (this.useIndexedDB) {
      await this.db.activities.add(act);
    } else {
      const acts = JSON.parse(localStorage.getItem('sae_activities') || '[]');
      acts.push(act);
      localStorage.setItem('sae_activities', JSON.stringify(acts));
    }

    // Also update lead's contact attempts and last contact date
    const lead = await this.getLeadById(leadId);
    if (lead) {
      lead.contact_attempts = (lead.contact_attempts || 0) + 1;
      lead.last_contact_date = act.created_at;
      if (act.next_followup_set) {
        lead.next_followup_date = act.next_followup_set;
      }
      await this.saveLead(lead);
    }

    this.notifyListeners('activity_added', act);
    return act;
  }

  async getActivitiesForLead(leadId) {
    if (this.useIndexedDB) {
      return await this.db.activities.where('lead_id').equals(leadId).sortBy('created_at');
    } else {
      const acts = JSON.parse(localStorage.getItem('sae_activities') || '[]');
      return acts.filter(a => a.lead_id === leadId).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }
  }

  // --- Batches ---
  async logBatch(batch) {
    const b = {
      id: batch.id || 'batch_' + Date.now(),
      file_name: batch.file_name || 'ملف مجهول',
      total_records: batch.total_records || 0,
      imported_count: batch.imported_count || 0,
      updated_count: batch.updated_count || 0,
      flagged_count: batch.flagged_count || 0,
      created_at: new Date().toISOString(),
      raw_summary: batch.raw_summary || {}
    };

    if (this.useIndexedDB) {
      await this.db.batches.put(b);
    } else {
      const batches = JSON.parse(localStorage.getItem('sae_batches') || '[]');
      batches.unshift(b);
      localStorage.setItem('sae_batches', JSON.stringify(batches));
    }
    return b;
  }

  async getAllBatches() {
    if (this.useIndexedDB) {
      return await this.db.batches.orderBy('created_at').reverse().toArray();
    } else {
      return JSON.parse(localStorage.getItem('sae_batches') || '[]');
    }
  }

  // --- Settings ---
  async getSettings() {
    const defaultSettings = {
      id: 'default',
      score_weights: {
        intent: 25,
        timeline: 20,
        package: 20,
        contact_validity: 15,
        decision_maker: 10,
        quality_feedback: 10
      },
      thresholds: {
        hot: 80,
        warm: 60,
        nurture: 35
      },
      max_unsuccessful_attempts: 3,
      default_followup_days: 2,
      supabase_url: '',
      supabase_key: '',
      cloud_sync_enabled: false
    };

    if (this.useIndexedDB) {
      const s = await this.db.settings.get('default');
      return s ? { ...defaultSettings, ...s } : defaultSettings;
    } else {
      const s = localStorage.getItem('sae_settings');
      return s ? { ...defaultSettings, ...JSON.parse(s) } : defaultSettings;
    }
  }

  async saveSettings(settings) {
    settings.id = 'default';
    if (this.useIndexedDB) {
      await this.db.settings.put(settings);
    } else {
      localStorage.setItem('sae_settings', JSON.stringify(settings));
    }
    this.notifyListeners('settings_updated', settings);
    return settings;
  }

  // --- Reset & Seed ---
  async clearDatabase() {
    if (this.useIndexedDB) {
      await this.db.leads.clear();
      await this.db.activities.clear();
      await this.db.tasks.clear();
      await this.db.batches.clear();
    } else {
      localStorage.removeItem('sae_leads');
      localStorage.removeItem('sae_activities');
      localStorage.removeItem('sae_tasks');
      localStorage.removeItem('sae_batches');
    }
    this.notifyListeners('database_cleared');
  }

  // --- Export & Import CRM Backup ---
  async exportFullBackup() {
    const leads = await this.getAllLeads(true);
    let activities = [];
    if (this.useIndexedDB) {
      activities = await this.db.activities.toArray();
    } else {
      activities = JSON.parse(localStorage.getItem('sae_activities') || '[]');
    }
    const batches = await this.getAllBatches();
    const settings = await this.getSettings();

    return {
      exported_at: new Date().toISOString(),
      app: 'Smart Address Egypt CRM',
      version: '1.0.0',
      data: {
        leads,
        activities,
        batches,
        settings
      }
    };
  }

  async importFullBackup(backupObj) {
    if (!backupObj || !backupObj.data) throw new Error('ملف النسخ الاحتياطي غير صالح');
    const { leads, activities, batches, settings } = backupObj.data;

    if (leads && leads.length > 0) {
      await this.bulkSaveLeads(leads);
    }
    if (activities && activities.length > 0) {
      if (this.useIndexedDB) {
        await this.db.activities.bulkPut(activities);
      } else {
        localStorage.setItem('sae_activities', JSON.stringify(activities));
      }
    }
    if (batches && batches.length > 0) {
      if (this.useIndexedDB) {
        await this.db.batches.bulkPut(batches);
      } else {
        localStorage.setItem('sae_batches', JSON.stringify(batches));
      }
    }
    if (settings) {
      await this.saveSettings(settings);
    }

    this.notifyListeners('backup_imported');
    return true;
  }

  // Optional Supabase Background Sync
  async triggerSupabaseSync(type, record) {
    try {
      const s = await this.getSettings();
      if (!s.cloud_sync_enabled || !s.supabase_url || !s.supabase_key) return;

      const endpoint = `${s.supabase_url.replace(/\/$/, '')}/rest/v1/${type === 'lead' ? 'leads' : 'contact_activities'}`;
      await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': s.supabase_key,
          'Authorization': `Bearer ${s.supabase_key}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(record)
      });
    } catch (e) {
      console.warn('Supabase sync skipped / offline:', e.message);
    }
  }
}

// Global instance
window.crmDb = new CrmDatabase();
