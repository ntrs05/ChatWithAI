import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, UserPlus } from 'lucide-react';
import { avatars } from '@/shared/assets';
import { errorMessage } from '@/shared/http';
import { cn, randomPick } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';
import { hasErrors, validateRegister, type FieldErrors, type RegisterInput } from '../domain/User';
import { authService } from '../module';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<RegisterInput>(() => ({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    avatarUrl: randomPick(avatars),
  }));
  const [errors, setErrors] = useState<FieldErrors<RegisterInput>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof RegisterInput>(key: K, value: RegisterInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = validateRegister(form);
    setErrors(v);
    setServerError('');
    if (hasErrors(v)) return;
    setLoading(true);
    try {
      await authService().register(form);
      navigate('/app', { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <h2 className="text-center font-display text-2xl font-bold">Tạo tài khoản</h2>
      <p className="mt-1 text-center text-sm text-muted">Chỉ mất chưa đến một phút.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-300">Ảnh đại diện</span>
          <div className="grid grid-cols-8 gap-1.5">
            {avatars.map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => set('avatarUrl', src)}
                aria-label="Chọn ảnh đại diện"
                aria-pressed={form.avatarUrl === src}
                className={cn(
                  'relative aspect-square overflow-hidden rounded-full ring-2 transition',
                  form.avatarUrl === src ? 'ring-brand-400' : 'ring-transparent opacity-70 hover:opacity-100',
                )}
              >
                <img src={src} alt="" className="h-full w-full" />
                {form.avatarUrl === src && (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink-950/40">
                    <Check size={16} className="text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@vidu.com"
          value={form.email}
          error={errors.email}
          onChange={(e) => set('email', e.target.value)}
        />
        <Input
          label="Tên hiển thị"
          placeholder="Ví dụ: Hoàng Nam"
          value={form.displayName}
          error={errors.displayName}
          onChange={(e) => set('displayName', e.target.value)}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput
            label="Mật khẩu"
            autoComplete="new-password"
            value={form.password}
            error={errors.password}
            onChange={(e) => set('password', e.target.value)}
          />
          <PasswordInput
            label="Nhập lại"
            autoComplete="new-password"
            value={form.confirmPassword}
            error={errors.confirmPassword}
            onChange={(e) => set('confirmPassword', e.target.value)}
          />
        </div>
        {serverError && (
          <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {serverError}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<UserPlus size={18} />}>
          Đăng ký
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-semibold text-brand-300 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}
