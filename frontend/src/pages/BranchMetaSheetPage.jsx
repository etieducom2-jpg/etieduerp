import React, { useEffect, useState } from 'react';
import { metaSheetAPI } from '@/api/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ExternalLink, RefreshCw, Plus, Facebook, Info, Trash2, Settings, AlertCircle } from 'lucide-react';

const FIELD_OPTIONS = [
  { value: 'skip', label: 'Ignore this column' },
  { value: 'name', label: 'Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'program', label: 'Program / Course' },
];

const REQUIRED_AT_LEAST_ONE = ['phone', 'email'];

function MappingEditor({ headers, sampleRows, mapping, setMapping }) {
  const setField = (idx, val) => {
    setMapping((prev) => {
      const next = { ...prev };
      if (val === 'skip') {
        delete next[String(idx)];
      } else {
        // Ensure uniqueness — clear any other column that was mapped to this canonical field
        for (const k of Object.keys(next)) {
          if (next[k] === val) delete next[k];
        }
        next[String(idx)] = val;
      }
      return next;
    });
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="grid grid-cols-[1fr_220px] bg-slate-50 px-4 py-2 text-xs font-medium text-slate-600 uppercase tracking-wide">
        <div>Sheet column</div>
        <div>Map to CRM field</div>
      </div>
      <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
        {headers.map((h, i) => (
          <div key={i} className="grid grid-cols-[1fr_220px] items-center px-4 py-3 gap-3" data-testid={`mapping-row-${i}`}>
            <div className="min-w-0">
              <div className="font-medium text-slate-800 truncate" data-testid={`mapping-header-${i}`}>{h || <span className="text-slate-400 italic">(empty)</span>}</div>
              {sampleRows.length > 0 && (
                <div className="text-xs text-slate-500 truncate mt-0.5">
                  e.g. {sampleRows.slice(0, 2).map((r) => (r[i] || '').trim()).filter(Boolean).join(' · ') || <span className="italic">no sample</span>}
                </div>
              )}
            </div>
            <Select value={mapping[String(i)] || 'skip'} onValueChange={(v) => setField(i, v)}>
              <SelectTrigger data-testid={`mapping-select-${i}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} data-testid={`mapping-option-${i}-${opt.value}`}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BranchMetaSheetPage() {
  const [branch, setBranch] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [previewData, setPreviewData] = useState(null); // {headers, sample_rows, auto_mapping, row_count}
  const [mapping, setMapping] = useState({});
  const [adding, setAdding] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingSheet, setEditingSheet] = useState(null); // sheet object being re-mapped
  const [editMapping, setEditMapping] = useState({});
  const [editPreview, setEditPreview] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const reload = async () => {
    setLoading(true);
    try {
      const { data: branchData } = await metaSheetAPI.listBranches();
      const branches = Array.isArray(branchData) ? branchData : (branchData.branches || []);
      const mine = branches.find((b) => b.id === user.branch_id) || branches[0];
      setBranch(mine);
      if (mine) {
        const { data } = await metaSheetAPI.list(mine.id);
        setSheets(data.sheets || []);
      }
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, []);

  const fetchPreview = async () => {
    if (!branch || !newUrl.trim()) {
      toast.error('Paste a Google Sheet URL');
      return;
    }
    setPreviewing(true);
    setPreviewData(null);
    try {
      const { data } = await metaSheetAPI.preview(branch.id, newUrl.trim());
      setPreviewData(data);
      setMapping(data.auto_mapping || {});
      toast.success(`Loaded ${data.headers.length} columns · ${data.row_count} data rows`);
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to read sheet');
    } finally { setPreviewing(false); }
  };

  const validateMapping = (m) => {
    const mappedFields = new Set(Object.values(m));
    const hasOne = REQUIRED_AT_LEAST_ONE.some((f) => mappedFields.has(f));
    if (!hasOne) return 'Map at least one column to Phone or Email.';
    return null;
  };

  const saveSheet = async () => {
    if (!branch || !previewData) return;
    const err = validateMapping(mapping);
    if (err) { toast.error(err); return; }
    setAdding(true);
    try {
      await metaSheetAPI.add(branch.id, {
        url: newUrl.trim(),
        label: newLabel.trim() || 'Sheet',
        column_mapping: mapping,
      });
      toast.success('Sheet added — it will sync within 1 minute');
      setNewUrl(''); setNewLabel(''); setPreviewData(null); setMapping({});
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to add sheet');
    } finally { setAdding(false); }
  };

  const cancelPreview = () => {
    setPreviewData(null);
    setMapping({});
  };

  const syncOne = async (sheetId) => {
    if (!branch) return;
    setSyncingId(sheetId);
    try {
      const { data } = await metaSheetAPI.syncOne(branch.id, sheetId);
      const r = data?.result || {};
      if (r.ok) toast.success(`Imported ${r.imported || 0} new lead(s)`);
      else toast.error('Sync failed: ' + (r.reason || 'unknown'));
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Sync failed');
    } finally { setSyncingId(null); }
  };

  const deleteSheet = async (sheetId, label) => {
    if (!window.confirm(`Remove sheet "${label}"? Existing imported leads stay; new rows will stop syncing.`)) return;
    try {
      await metaSheetAPI.remove(branch.id, sheetId);
      toast.success('Sheet removed');
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to remove sheet');
    }
  };

  const openEditMapping = async (sheet) => {
    setEditingSheet(sheet);
    setEditPreview(null);
    setEditMapping(sheet.column_mapping || {});
    try {
      const { data } = await metaSheetAPI.preview(branch.id, sheet.url);
      setEditPreview(data);
      if (!sheet.column_mapping || Object.keys(sheet.column_mapping).length === 0) {
        setEditMapping(data.auto_mapping || {});
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to load sheet columns');
    }
  };

  const saveEditMapping = async () => {
    if (!editingSheet) return;
    const err = validateMapping(editMapping);
    if (err) { toast.error(err); return; }
    setSavingEdit(true);
    try {
      await metaSheetAPI.update(branch.id, editingSheet.id, { column_mapping: editMapping });
      toast.success('Mapping updated');
      setEditingSheet(null);
      reload();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update mapping');
    } finally { setSavingEdit(false); }
  };

  if (loading) return <div className="p-8">Loading…</div>;
  if (!branch) return <div className="p-8 text-slate-500">No branch found for your account.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto" data-testid="meta-sheet-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Facebook className="w-8 h-8 text-blue-600" /> Ads Lead Sheets
        </h1>
        <p className="text-slate-500 mt-1">
          Branch: <span className="font-medium text-slate-700">{branch.name}</span> ({branch.code})
        </p>
      </div>

      {/* Connected sheets list */}
      <Card className="border-0 shadow-sm mb-6" data-testid="connected-sheets-card">
        <CardHeader>
          <CardTitle className="text-lg">Connected Google Sheets ({sheets.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sheets.length === 0 && (
            <p className="text-sm text-slate-500">No sheets connected yet. Add one below — new rows will be imported within 1 minute as leads with source <b>Ads</b>, and a WhatsApp enquiry confirmation will fire automatically.</p>
          )}
          {sheets.map((s) => {
            const cm = s.column_mapping || {};
            const mappedFields = Object.values(cm);
            return (
              <div key={s.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg" data-testid={`sheet-row-${s.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{s.label}</div>
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline truncate flex items-center gap-1">
                    {s.url} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                  <div className="text-xs text-slate-500 mt-1">
                    Last sync: {s.last_sync ? new Date(s.last_sync).toLocaleString() : 'never'} · Last row processed: {s.last_row || 0}
                    {s.last_result && (
                      <span className="ml-2">· Last run: imported {s.last_result.imported || 0}, skipped {s.last_result.skipped || 0}{s.last_result.reason ? `, ${s.last_result.reason}` : ''}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Mapping: {mappedFields.length === 0 ? <span className="italic">auto-detect</span> : mappedFields.join(', ')}
                  </div>
                </div>
                <Button onClick={() => openEditMapping(s)} variant="outline" size="sm" data-testid={`btn-edit-mapping-${s.id}`}>
                  <Settings className="w-4 h-4 mr-1" /> Mapping
                </Button>
                <Button onClick={() => syncOne(s.id)} variant="outline" size="sm" disabled={syncingId === s.id} data-testid={`btn-sync-${s.id}`}>
                  <RefreshCw className={`w-4 h-4 mr-1 ${syncingId === s.id ? 'animate-spin' : ''}`} />
                  {syncingId === s.id ? 'Syncing…' : 'Sync now'}
                </Button>
                <Button onClick={() => deleteSheet(s.id, s.label)} variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`btn-delete-${s.id}`}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Add new sheet */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Plus className="w-5 h-5" /> Connect a new Google Sheet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-slate-700">
              Share your Google Sheet as <b>&ldquo;Anyone with the link – Viewer&rdquo;</b>. After pasting the URL, click <b>Preview columns</b> to map your sheet&rsquo;s columns to CRM fields. <b>Synced every minute.</b>
            </div>
          </div>

          {!previewData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-3">
                <Input
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  data-testid="new-sheet-url-input"
                />
                <Input
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Label (e.g. Campaign A)"
                  data-testid="new-sheet-label-input"
                />
              </div>

              <Button onClick={fetchPreview} disabled={previewing || !newUrl.trim()} className="bg-slate-900 hover:bg-slate-800" data-testid="btn-preview-sheet">
                <RefreshCw className={`w-4 h-4 mr-2 ${previewing ? 'animate-spin' : ''}`} />
                {previewing ? 'Reading sheet…' : 'Preview columns'}
              </Button>
            </>
          ) : (
            <div className="space-y-4" data-testid="preview-section">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-slate-700">
                  Found <b>{previewData.headers.length}</b> columns and <b>{previewData.row_count}</b> data rows. Choose which CRM field each column maps to. Columns set to <i>Ignore</i> will be skipped. You must map at least <b>Phone</b> or <b>Email</b>.
                </div>
              </div>

              <MappingEditor
                headers={previewData.headers}
                sampleRows={previewData.sample_rows || []}
                mapping={mapping}
                setMapping={setMapping}
              />

              <div className="flex gap-2 justify-end">
                <Button onClick={cancelPreview} variant="outline" data-testid="btn-cancel-preview">Cancel</Button>
                <Button onClick={saveSheet} disabled={adding} className="bg-slate-900 hover:bg-slate-800" data-testid="btn-save-sheet">
                  <Plus className="w-4 h-4 mr-2" /> {adding ? 'Saving…' : 'Save & Start Syncing'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit mapping dialog */}
      <Dialog open={!!editingSheet} onOpenChange={(o) => { if (!o) setEditingSheet(null); }}>
        <DialogContent className="max-w-2xl" data-testid="edit-mapping-dialog">
          <DialogHeader>
            <DialogTitle>Edit Column Mapping — {editingSheet?.label}</DialogTitle>
            <DialogDescription>Map each sheet column to the corresponding CRM field. Columns set to Ignore are skipped during sync.</DialogDescription>
          </DialogHeader>
          {editPreview ? (
            <MappingEditor
              headers={editPreview.headers}
              sampleRows={editPreview.sample_rows || []}
              mapping={editMapping}
              setMapping={setEditMapping}
            />
          ) : (
            <div className="py-8 text-center text-sm text-slate-500">Loading columns…</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSheet(null)} data-testid="btn-cancel-edit-mapping">Cancel</Button>
            <Button onClick={saveEditMapping} disabled={savingEdit || !editPreview} className="bg-slate-900 hover:bg-slate-800" data-testid="btn-save-edit-mapping">
              {savingEdit ? 'Saving…' : 'Save mapping'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
