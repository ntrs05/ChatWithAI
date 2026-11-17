import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Camera, KeyRound, LogOut, Save, Upload, UserRound, X, type LucideIcon } from 'lucide-react';
import { avatars } from '@/shared/assets';
import { toast } from '@/shared/event-bus';
import { errorMessage } from '@/shared/http';
import { cn } from '@/shared/lib';
import { Avatar, Button, Input, Textarea } from '@/shared/ui';
import { useAuthStore } from '../application/authStore';
import {
  hasErrors,
  validatePasswordChange,
  validateProfile,
  type FieldErrors,
  type PasswordChangeInput,
  type ProfileInput,
  type User,
} from '../domain/User';
import { authService } from '../module';
import { IdentityBadge } from './IdentityCard';
import { PasswordInput } from './PasswordInput';

/** Tab do module khác (vd Voice) gắn thêm vào Cài đặt. */
export interface ExtraSettingsTab {
  id: string;
  label: string;
  icon: LucideIcon;
  render: () => ReactNode;
}

interface SettingsPageProps {
  /** Có `onClose` → hiện nút ✕ (dùng khi Cài đặt là popup). */
  onClose?: () => void;
  extraTabs?: ExtraSettingsTab[];
  /** Tab mở sẵn. */
  initialTab?: string | null;
}

const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const AVATAR_MAX = 20 * 1024 * 1024;

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/5 bg-ink-750 p-5">
      <h2 className="font-display text-lg font-bold text-white">{title}</h2>
      {hint && <p className="mb-4 mt-0.5 text-sm text-muted">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Alert({ kind, children }: { kind: 'error' | 'info'; children: React.ReactNode }) {
  return (
    <div
      role={kind === 'error' ? 'alert' : undefined}
      className={cn(
        'rounded-xl border px-3 py-2 text-sm',
        kind === 'error' ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-brand-400/25 bg-brand-400/5 text-slate-200',
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- Tab: Tài khoản của tôi ---------------- */

function AccountTab({ user }: { user: User }) {
  const [form, setForm] = useState<PasswordChangeInput>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors<PasswordChangeInput>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = validatePasswordChange(form, user.hasPassword);
    setErrors(v);
    setServerError('');
    if (hasErrors(v)) return;
    setLoading(true);
    try {
      await authService().changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success(user.hasPassword ? 'Đã đổi mật khẩu' : 'Đã đặt mật khẩu. Từ giờ bạn đăng nhập được bằng cả email và mật khẩu');
    } catch (err) {
      setServerError(errorMessage(err, 'Không đổi được mật khẩu'));
    } finally {
      setLoading(false);
    }
  }

  const set = (key: keyof PasswordChangeInput, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-5">
      <IdentityBadge user={user} />

      <Card title="Thông tin tài khoản">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-ink-800/70 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Tên hiển thị</dt>
            <dd className="mt-1 truncate font-semibold text-white">{user.displayName}</dd>
          </div>
          <div className="rounded-xl bg-ink-800/70 p-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Tên người dùng</dt>
            <dd className="mt-1 truncate font-semibold text-white">@{user.username}</dd>
          </div>
          <div className="rounded-xl bg-ink-800/70 p-3 sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Email</dt>
            <dd className="mt-1 truncate font-semibold text-white">{user.email}</dd>
          </div>
        </dl>
      </Card>

      <Card
        title={user.hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
        hint={user.hasPassword ? 'Nhập mật khẩu hiện tại rồi chọn mật khẩu mới.' : undefined}
      >
        {!user.hasPassword && (
          <div className="mb-4">
            <Alert kind="info">Bạn đang đăng nhập bằng Google và chưa có mật khẩu. Đặt mật khẩu để cũng đăng nhập được bằng email.</Alert>
          </div>
        )}
        <form onSubmit={submit} className="max-w-md space-y-4" noValidate>
          {user.hasPassword && (
            <PasswordInput
              label="Mật khẩu hiện tại"
              autoComplete="current-password"
              value={form.currentPassword}
              error={errors.currentPassword}
              onChange={(e) => set('currentPassword', e.target.value)}
            />
          )}
          <PasswordInput
            label="Mật khẩu mới"
            autoComplete="new-password"
            value={form.newPassword}
            error={errors.newPassword}
            onChange={(e) => set('newPassword', e.target.value)}
          />
          <PasswordInput
            label="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
          />
          {serverError && <Alert kind="error">{serverError}</Alert>}
          <Button type="submit" loading={loading} icon={<KeyRound size={17} />}>
            {user.hasPassword ? 'Đổi mật khẩu' : 'Đặt mật khẩu'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

/* ---------------- Tab: Hồ sơ ---------------- */

function ProfileTab({ user }: { user: User }) {
  const initial: ProfileInput = { displayName: user.displayName, avatarUrl: user.avatarUrl, bio: user.bio };
  const [draft, setDraft] = useState<ProfileInput>(initial);
  const [errors, setErrors] = useState<FieldErrors<ProfileInput>>({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const dirty = draft.displayName !== initial.displayName || draft.avatarUrl !== initial.avatarUrl || draft.bio !== initial.bio;

  async function pickFile(file: File | undefined) {
    if (!file) return;
    if (!AVATAR_TYPES.includes(file.type)) return setServerError('Ảnh đại diện phải là PNG, JPEG, WebP hoặc GIF');
    if (file.size > AVATAR_MAX) return setServerError(`Ảnh quá lớn (tối đa ${AVATAR_MAX >= 1024 * 1024 ? `${AVATAR_MAX / 1024 / 1024} MB` : `${AVATAR_MAX / 1024} KB`})`);
    setServerError('');
    setUploading(true);
    try {
      const url = await authService().uploadAvatar(file);
      setDraft((d) => ({ ...d, avatarUrl: url }));
    } catch (err) {
      setServerError(errorMessage(err, 'Không tải được ảnh lên'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    const v = validateProfile(draft);
    setErrors(v);
    setServerError('');
    if (hasErrors(v)) return;
    setSaving(true);
    try {
      await authService().updateProfile(draft);
      toast.success('Đã lưu hồ sơ');
    } catch (err) {
      setServerError(errorMessage(err, 'Không lưu được hồ sơ'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-5" noValidate>
      <Card title="Ảnh đại diện" hint="Chọn một ảnh có sẵn hoặc tải ảnh của bạn lên (PNG, JPEG, WebP, GIF).">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Avatar src={draft.avatarUrl} name={draft.displayName || user.displayName} size={84} />
            {uploading && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink-950/70 text-xs text-white">Đang tải…</span>}
          </div>
          <div className="space-y-2">
            <input ref={fileRef} type="file" accept={AVATAR_TYPES.join(',')} className="hidden" onChange={(e) => void pickFile(e.target.files?.[0])} />
            <Button type="button" variant="secondary" icon={<Upload size={16} />} loading={uploading} onClick={() => fileRef.current?.click()}>
              Tải ảnh lên
            </Button>
            <p className="text-xs text-muted">Tối đa {AVATAR_MAX >= 1024 * 1024 ? `${AVATAR_MAX / 1024 / 1024} MB` : `${AVATAR_MAX / 1024} KB`}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-8 gap-1.5">
          {avatars.map((src) => (
            <button
              key={src}
              type="button"
              aria-label="Chọn ảnh có sẵn"
              aria-pressed={draft.avatarUrl === src}
              onClick={() => setDraft((d) => ({ ...d, avatarUrl: src }))}
              className={cn(
                'aspect-square overflow-hidden rounded-full ring-2 transition',
                draft.avatarUrl === src ? 'ring-brand-400' : 'opacity-70 ring-transparent hover:opacity-100',
              )}
            >
              <img src={src} alt="" className="h-full w-full" />
            </button>
          ))}
        </div>
      </Card>

      <Card title="Thông tin hiển thị">
        <div className="max-w-md space-y-4">
          <Input
            label="Tên hiển thị"
            value={draft.displayName}
            error={errors.displayName}
            hint="Bạn bè cần nhập đúng tên này (cùng với ID) để kết bạn. Đổi tên thì báo lại cho bạn bè."
            onChange={(e) => setDraft((d) => ({ ...d, displayName: e.target.value }))}
          />
          <Textarea
            label="Giới thiệu"
            rows={3}
            maxLength={300}
            placeholder="Vài dòng về bạn…"
            value={draft.bio}
            error={errors.bio}
            onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
          />
        </div>
      </Card>

      {serverError && <Alert kind="error">{serverError}</Alert>}
      <div className="flex items-center gap-2">
        <Button type="submit" loading={saving} disabled={!dirty || uploading} icon={<Save size={17} />}>
          Lưu thay đổi
        </Button>
        {dirty && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setDraft(initial);
              setErrors({});
              setServerError('');
            }}
          >
            Hoàn tác
          </Button>
        )}
      </div>
    </form>
  );
}

/* ---------------- Trang ---------------- */

/** Cài đặt người dùng (giống Discord): thanh tab bên trái + nội dung; có thể gắn thêm tab từ module khác. */
export function SettingsPage({ onClose, extraTabs = [], initialTab }: SettingsPageProps = {}) {
  const user = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<string>(initialTab ?? 'account');
  if (!user) return null;

  const tabs: Array<{ id: string; label: string; icon: LucideIcon }> = [
    { id: 'account', label: 'Tài khoản của tôi', icon: UserRound },
    { id: 'profile', label: 'Hồ sơ', icon: Camera },
    ...extraTabs.map(({ id, label, icon }) => ({ id, label, icon })),
  ];
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]!;
  const extra = extraTabs.find((t) => t.id === current.id);

  return (
    <div className="relative flex h-full w-full flex-col bg-ink-800 md:flex-row">
      <nav aria-label="Cài đặt" className={cn('flex shrink-0 gap-1 overflow-x-auto border-b border-black/20 bg-ink-850 p-2 md:w-60 md:flex-col md:border-b-0 md:border-r md:p-3', !onClose && 'pl-14')}>
        <h1 className="hidden px-3 pb-2 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted md:block">Cài đặt người dùng</h1>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={current.id === t.id ? 'page' : undefined}
            className={cn(
              'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] font-medium transition',
              current.id === t.id ? 'bg-brand-400/15 text-white' : 'text-muted hover:bg-white/5 hover:text-slate-200',
            )}
          >
            <t.icon size={18} className={current.id === t.id ? 'text-brand-300' : ''} /> {t.label}
          </button>
        ))}
        <div className="my-2 hidden h-px bg-white/5 md:block" />
        <button
          onClick={() => void authService().logout()}
          className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[15px] font-medium text-rose-400 hover:bg-rose-500/10 md:mt-auto"
        >
          <LogOut size={18} /> Đăng xuất
        </button>
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-5 font-display text-2xl font-extrabold text-white">{current.label}</h2>
          {current.id === 'account' ? <AccountTab user={user} /> : current.id === 'profile' ? <ProfileTab user={user} /> : extra?.render()}
        </div>
      </div>

      {onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng cài đặt"
          title="Đóng (Esc)"
          className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-ink-900/70 p-2 text-muted transition hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}
