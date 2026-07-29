import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Copy, ExternalLink, RefreshCw, X } from 'lucide-react';
import { useServersStore } from '@/store/serversStore';
import type { HomebrewStackKey, InstallInstructions } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function SystemRequirementsBanner() {
  const { t } = useTranslation();
  const { system, refreshSystem } = useServersStore();
  const [instructions, setInstructions] = useState<InstallInstructions | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [copiedKey, setCopiedKey] = useState<HomebrewStackKey | null>(null);
  const [readyChecked, setReadyChecked] = useState(false);
  const [readySeen, setReadySeen] = useState(false);

  useEffect(() => {
    window.sshfs.installInstructions().then(setInstructions);
  }, []);

  useEffect(() => {
    window.sshfs.wasSystemReadySeen().then((seen) => {
      setReadySeen(seen);
      setReadyChecked(true);
    });
  }, []);

  const fuseBackendOk = !!system && (system.fuseT.installed || system.macfuse.installed);
  const allOk = !!system && system.sshfs.installed && fuseBackendOk;

  useEffect(() => {
    if (allOk && readyChecked && !readySeen) window.sshfs.markSystemReadySeen();
  }, [allOk, readyChecked, readySeen]);

  if (!system || dismissed) return null;

  if (allOk) {
    if (!readyChecked || readySeen) return null;
    return (
      <div
        onAnimationEnd={() => setDismissed(true)}
        className="flex items-center justify-between gap-3 px-4 py-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md animate-[fadeInOut_5s_ease-in-out_forwards]"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-3.5" />
          <span>{t('system.ready')} · sshfs {system.sshfs.version ?? ''}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => refreshSystem()}>
            <RefreshCw className="size-3" />
            {t('system.recheck')}
          </Button>
          <Button size="icon" variant="ghost" className="size-6" onClick={() => setDismissed(true)}>
            <X className="size-3" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-amber-500/30 bg-amber-500/5 animate-in fade-in-0 duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <AlertTriangle className="size-4" />
          {t('system.missing')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <Badge variant={system.sshfs.installed ? 'success' : 'destructive'}>
            sshfs · {system.sshfs.installed ? t('system.installed') : t('system.notInstalled')}
          </Badge>
          <Badge variant={system.fuseT.installed ? 'success' : 'destructive'}>
            FUSE-T · {system.fuseT.installed ? t('system.installed') : t('system.notInstalled')}
          </Badge>
          <Badge variant={system.macfuse.installed ? 'success' : 'destructive'}>
            macFUSE · {system.macfuse.installed ? t('system.installed') : t('system.notInstalled')}
          </Badge>
        </div>
        {instructions && (
          <>
            <div className="flex flex-wrap gap-2">
              {instructions.links.map((l) => (
                <Button
                  key={l.url}
                  size="sm"
                  variant="outline"
                  onClick={() => window.sshfs.openExternal(l.url)}
                >
                  <ExternalLink className="size-3" />
                  {l.label}
                </Button>
              ))}
              <Button size="sm" variant="secondary" onClick={() => refreshSystem()}>
                <RefreshCw className="size-3" />
                {t('system.recheck')}
              </Button>
            </div>
            <p className="text-muted-foreground">{t('system.homebrewIntro')}</p>
            <div className="space-y-3">
              {(['fuseT', 'macfuse'] as HomebrewStackKey[]).map((key) => {
                const stack = instructions.stacks.find((s) => s.key === key);
                if (!stack) return null;
                const text = stack.commands.join('\n');
                return (
                  <div key={stack.key}>
                    <p className="mb-1 text-xs font-medium text-foreground">
                      {t(`system.stack.${stack.key}`)}
                    </p>
                    <div className="relative rounded-md bg-muted">
                      <pre className="select-text cursor-text whitespace-pre-wrap break-all pr-12 py-2 pl-3 text-xs leading-relaxed">
                        {text}
                      </pre>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1 size-8 shrink-0 text-muted-foreground hover:text-foreground"
                        title={t('system.copyCommands')}
                        aria-label={t('system.copyCommands')}
                        onClick={() => {
                          void navigator.clipboard.writeText(text);
                          setCopiedKey(key);
                          window.setTimeout(() => setCopiedKey(null), 2000);
                        }}
                      >
                        <Copy className="size-3.5" />
                      </Button>
                    </div>
                    {copiedKey === key ? (
                      <p className="mt-1 text-xs text-emerald-500">{t('system.copied')}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
