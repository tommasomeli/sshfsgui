import { useEffect, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Folder, FileSearch } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServersStore } from '@/store/serversStore';
import type { AuthMethod, ServerInput, ServerWithStatus } from '@shared/types';

interface Props {
  open: boolean;
  onOpenChange(open: boolean): void;
  server?: ServerWithStatus | null;
}

interface FormState {
  name: string;
  host: string;
  port: string;
  user: string;
  remotePath: string;
  localPath: string;
  authMethod: AuthMethod;
  identityFile: string;
  password: string;
  extraOptions: string;
  isFavorite: boolean;
  mountOnStartup: boolean;
}

const empty: FormState = {
  name: '',
  host: '',
  port: '22',
  user: '',
  remotePath: '/',
  localPath: '',
  authMethod: 'agent',
  identityFile: '',
  password: '',
  extraOptions: '',
  isFavorite: false,
  mountOnStartup: false,
};

function fromServer(s: ServerWithStatus): FormState {
  return {
    name: s.name,
    host: s.host,
    port: String(s.port),
    user: s.user,
    remotePath: s.remotePath,
    localPath: s.localPath,
    authMethod: s.authMethod,
    identityFile: s.identityFile ?? '',
    password: '',
    extraOptions: s.extraOptions ?? '',
    isFavorite: s.isFavorite,
    mountOnStartup: s.mountOnStartup,
  };
}

export function ServerFormDialog({ open, onOpenChange, server }: Props) {
  const { t } = useTranslation();
  const { save } = useServersStore();
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setForm(server ? fromServer(server) : empty);
  }, [open, server]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.host || !form.user || !form.remotePath || !form.localPath) {
      toast.error(t('form.fillRequired'));
      return;
    }
    const port = parseInt(form.port, 10);
    if (Number.isNaN(port) || port < 1 || port > 65535) {
      toast.error(t('form.invalidPort'));
      return;
    }
    setSubmitting(true);
    try {
      const input: ServerInput = {
        id: server?.id,
        name: form.name.trim(),
        host: form.host.trim(),
        port,
        user: form.user.trim(),
        remotePath: form.remotePath.trim(),
        localPath: form.localPath.trim(),
        authMethod: form.authMethod,
        identityFile: form.identityFile.trim() || undefined,
        extraOptions: form.extraOptions.trim() || undefined,
        isFavorite: form.isFavorite,
        mountOnStartup: form.mountOnStartup,
        password: form.authMethod === 'password' && form.password ? form.password : undefined,
      };
      await save(input);
      toast.success(server ? t('form.serverUpdated') : t('form.serverSaved'));
      onOpenChange(false);
    } catch (err) {
      toast.error(t('form.saveFailed', { error: (err as Error).message }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md max-h-[calc(100vh-3rem)] mt-6 overflow-y-auto p-4">
        <DialogHeader>
          <DialogTitle className="text-base">{server ? t('form.editServer') : t('form.newServer')}</DialogTitle>
          <DialogDescription className="text-xs">
            {t('form.keychainNote')}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-3">
          <div className="grid gap-2">
            <Label>{t('form.name')}</Label>
            <Input value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="Production DB" />
          </div>
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="grid gap-2">
              <Label>{t('form.host')}</Label>
              <Input value={form.host} onChange={(e) => update('host', e.target.value)} placeholder="example.com" />
            </div>
            <div className="grid gap-2">
              <Label>{t('form.port')}</Label>
              <Input value={form.port} onChange={(e) => update('port', e.target.value)} inputMode="numeric" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t('form.user')}</Label>
            <Input value={form.user} onChange={(e) => update('user', e.target.value)} placeholder="root" />
          </div>
          <div className="grid gap-2">
            <Label>{t('form.remotePath')}</Label>
            <Input value={form.remotePath} onChange={(e) => update('remotePath', e.target.value)} placeholder="/var/www" />
          </div>
          <div className="grid gap-2">
            <Label>{t('form.localMountPoint')}</Label>
            <div className="flex gap-2">
              <Input
                value={form.localPath}
                onChange={(e) => update('localPath', e.target.value)}
                placeholder="/Users/me/mnt/example"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                title={t('tooltip.browseFolder')}
                onClick={async () => {
                  const picked = await window.sshfs.selectDirectory(form.localPath || undefined);
                  if (picked) update('localPath', picked);
                }}
              >
                <Folder className="size-4" />
              </Button>
            </div>
          </div>
          <Tabs value={form.authMethod} onValueChange={(v) => update('authMethod', v as AuthMethod)}>
            <Label className="mb-1.5 block">{t('form.authentication')}</Label>
            <TabsList className="w-full">
              <TabsTrigger value="agent" className="flex-1">{t('form.sshAgent')}</TabsTrigger>
              <TabsTrigger value="key" className="flex-1">{t('form.sshKey')}</TabsTrigger>
              <TabsTrigger value="password" className="flex-1">{t('form.password')}</TabsTrigger>
            </TabsList>
            <TabsContent value="agent" className="text-xs text-muted-foreground">
              <Trans i18nKey="form.sshAgentHint" components={{ code: <code className="font-mono" /> }} />
            </TabsContent>
            <TabsContent value="key" className="grid gap-2">
              <Label className="text-xs">{t('form.identityFile')}</Label>
              <div className="flex gap-2">
                <Input
                  value={form.identityFile}
                  onChange={(e) => update('identityFile', e.target.value)}
                  placeholder="~/.ssh/id_ed25519"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={t('tooltip.browseFile')}
                  onClick={async () => {
                    const picked = await window.sshfs.selectFile(form.identityFile || undefined);
                    if (picked) update('identityFile', picked);
                  }}
                >
                  <FileSearch className="size-4" />
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="password" className="grid gap-2">
              <Label className="text-xs">{t('form.password')}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder={server ? t('form.passwordKeepHint') : ''}
              />
            </TabsContent>
          </Tabs>
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="mount-on-startup">{t('form.mountOnStartup')}</Label>
            <Switch
              id="mount-on-startup"
              checked={form.mountOnStartup}
              onCheckedChange={(v) => update('mountOnStartup', v)}
            />
          </div>
          <div className="grid gap-2">
            <Label>{t('form.extraOptions')}</Label>
            <Input
              value={form.extraOptions}
              onChange={(e) => update('extraOptions', e.target.value)}
              placeholder="follow_symlinks defer_permissions"
            />
            <p className="text-xs text-muted-foreground">
              <Trans i18nKey="form.extraOptionsHint" components={{ code: <code className="font-mono" /> }} />
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? t('form.saving') : server ? t('form.saveChanges') : t('form.createServer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
