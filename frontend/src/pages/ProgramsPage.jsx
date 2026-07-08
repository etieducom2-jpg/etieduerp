import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { adminAPI } from '@/api/api';
import { toast } from 'sonner';
import { BookOpen, Search, Sparkles, RefreshCw, Loader2, Clock, IndianRupee } from 'lucide-react';

const formatFee = (n) => {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return '₹' + Number(n).toLocaleString('en-IN');
};

// Very small, dependency-free markdown → HTML renderer for the AI curriculum.
// The prompt asks the LLM for a well-scoped subset of markdown (# / ## / ### /
// bullet lists / _emphasis_), so we only handle those to keep the surface area
// minimal.
const renderMarkdown = (md) => {
  if (!md) return '';
  const lines = md.split('\n');
  const out = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      out.push('</ul>');
      inList = false;
    }
  };
  const inline = (s) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.+?)_/g, '<em>$1</em>');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith('### ')) {
      closeList();
      out.push(`<h3 class="text-base font-semibold text-slate-800 mt-4 mb-1">${inline(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      closeList();
      out.push(`<h2 class="text-lg font-bold text-slate-900 mt-5 mb-2">${inline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      closeList();
      out.push(`<h1 class="text-xl font-bold text-slate-900 mt-3 mb-2">${inline(line.slice(2))}</h1>`);
    } else if (/^[-*] /.test(line.trim())) {
      if (!inList) {
        out.push('<ul class="list-disc pl-6 space-y-1 text-slate-700">');
        inList = true;
      }
      out.push(`<li>${inline(line.trim().slice(2))}</li>`);
    } else {
      closeList();
      out.push(`<p class="text-slate-700 leading-relaxed my-2">${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
};

const ProgramsPage = () => {
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeProgram, setActiveProgram] = useState(null);
  const [curriculum, setCurriculum] = useState('');
  const [curriculumMeta, setCurriculumMeta] = useState(null); // {generated_at, model, cached}
  const [curriculumLoading, setCurriculumLoading] = useState(false);
  const [curriculumBusyId, setCurriculumBusyId] = useState(null);

  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getPrograms();
      setPrograms(res.data || []);
    } catch (e) {
      console.error('Failed to load programs:', e);
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [programs, query]);

  const openCurriculum = async (program) => {
    setActiveProgram(program);
    setCurriculum('');
    setCurriculumMeta(null);
    setCurriculumLoading(true);
    try {
      // Fetch cached copy first; if none, kick off generation automatically.
      const cached = await adminAPI.getCurriculum(program.id);
      if (cached?.data?.curriculum) {
        setCurriculum(cached.data.curriculum);
        setCurriculumMeta({
          generated_at: cached.data.generated_at,
          model: cached.data.model,
          cached: true,
        });
      } else {
        toast.info(`Generating curriculum for ${program.name}…`);
        const gen = await adminAPI.generateCurriculum(program.id, false);
        setCurriculum(gen.data.curriculum);
        setCurriculumMeta({
          generated_at: gen.data.generated_at,
          model: gen.data.model,
          cached: !!gen.data.cached,
        });
      }
    } catch (e) {
      console.error('Curriculum load failed:', e);
      toast.error(e?.response?.data?.detail || 'Failed to load curriculum');
    } finally {
      setCurriculumLoading(false);
    }
  };

  const regenerateCurriculum = async (program) => {
    setCurriculumBusyId(program.id);
    try {
      toast.info(`Refreshing curriculum for ${program.name}…`);
      const gen = await adminAPI.generateCurriculum(program.id, true);
      setCurriculum(gen.data.curriculum);
      setCurriculumMeta({
        generated_at: gen.data.generated_at,
        model: gen.data.model,
        cached: false,
      });
      toast.success('Curriculum updated');
      // Also refresh the list so subsequent opens use the new copy.
      fetchPrograms();
    } catch (e) {
      console.error('Curriculum regenerate failed:', e);
      toast.error(e?.response?.data?.detail || 'Failed to regenerate curriculum');
    } finally {
      setCurriculumBusyId(null);
    }
  };

  return (
    <div className="p-6 space-y-6" data-testid="programs-page">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" /> Programs
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Browse every program on offer with its duration, fee and an AI-generated,
            up-to-date curriculum you can share with prospective students.
          </p>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search programs…"
            className="pl-9"
            data-testid="programs-search"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-500 py-12 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading programs…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="py-14 text-center text-slate-500">
            {query ? 'No programs match your search.' : 'No programs have been added yet.'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((program) => (
            <Card
              key={program.id}
              className="border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
              data-testid={`program-card-${program.id}`}
            >
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900 leading-snug">
                  {program.name}
                </CardTitle>
                {program.curriculum && (
                  <Badge className="w-fit bg-indigo-50 text-indigo-700 border border-indigo-200 mt-1">
                    <Sparkles className="w-3 h-3 mr-1" /> AI curriculum ready
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Clock className="w-4 h-4 text-slate-400" /> Duration
                  </div>
                  <span className="font-medium text-slate-800">{program.duration || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <IndianRupee className="w-4 h-4 text-slate-400" /> Program Fee
                  </div>
                  <span className="font-semibold text-slate-900">{formatFee(program.fee)}</span>
                </div>

                <Button
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => openCurriculum(program)}
                  disabled={curriculumBusyId === program.id}
                  data-testid={`view-curriculum-${program.id}`}
                >
                  {curriculumBusyId === program.id ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      {program.curriculum ? 'View AI Curriculum' : 'Generate Curriculum'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={!!activeProgram}
        onOpenChange={(open) => {
          if (!open) {
            setActiveProgram(null);
            setCurriculum('');
            setCurriculumMeta(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="w-5 h-5 text-indigo-600" />
              {activeProgram?.name} — Curriculum
            </DialogTitle>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {activeProgram?.duration || '—'}
              </span>
              <span className="inline-flex items-center gap-1">
                <IndianRupee className="w-3 h-3" /> {formatFee(activeProgram?.fee)}
              </span>
              {curriculumMeta?.model && (
                <span className="text-slate-400">
                  · Generated by <span className="font-medium">{curriculumMeta.model}</span>
                </span>
              )}
              {activeProgram && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto text-indigo-600 hover:text-indigo-700"
                  onClick={() => regenerateCurriculum(activeProgram)}
                  disabled={curriculumBusyId === activeProgram.id || curriculumLoading}
                  data-testid="curriculum-refresh"
                >
                  {curriculumBusyId === activeProgram.id ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-1" />
                  )}
                  Refresh
                </Button>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto py-3 pr-2">
            {curriculumLoading ? (
              <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
                <Loader2 className="w-5 h-5 animate-spin" /> Generating your curriculum with AI…
              </div>
            ) : curriculum ? (
              <article
                className="prose prose-slate max-w-none text-sm"
                data-testid="curriculum-content"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(curriculum) }}
              />
            ) : (
              <p className="text-sm text-slate-500 py-10 text-center">
                No curriculum yet.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramsPage;
