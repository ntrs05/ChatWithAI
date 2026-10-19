import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, UserRound, ShieldCheck } from 'lucide-react';
import { config, demoAccounts } from '@/shared/config';
import { errorMessage } from '@/shared/http';
import { Button, Input } from '@/shared/ui';
import { hasErrors, validateLogin, type FieldErrors, type LoginInput } from '../domain/User';
import { authService } from '../module';
import { AuthLayout } from './AuthLayout';
import { PasswordInput } from './PasswordInput';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState<LoginInput>({ email: '', password: '' });
  const [errors, setErrors] = useState<FieldErrors<LoginInput>>({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/app';

  async function submit(input: LoginInput) {
    const v = validateLogin(input);
    setErrors(v);
    setServerError('');
    if (hasErrors(v)) return;
    setLoading(true);
    try {
      await authService().login(input);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setServerError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(form);
  };

  return (
    <AuthLayout>
      <h2 className="text-center font-display text-2xl font-bold">Chào mừng trở lại!</h2>
      <p className="mt-1 text-center text-sm text-muted">Đăng nhập để tiếp tục trò chuyện cùng mọi người.</p>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@vidu.com"
          value={form.email}
          error={errors.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          autoFocus
        />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="current-password"
          placeholder="••••••"
          value={form.password}
          error={errors.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {serverError && (
          <div role="alert" className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {serverError}
          </div>
        )}
        <Button type="submit" size="lg" className="w-full" loading={loading} icon={<LogIn size={18} />}>
          Đăng nhập
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-brand-300 hover:underline">
          Đăng ký ngay
        </Link>
      </p>

      {config.apiMode === 'mock' && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">Tài khoản demo</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => {
                  const input = { email: acc.email, password: acc.password };
                  setForm(input);
                  void submit(input);
                }}
                className="group flex items-start gap-2 rounded-xl border border-ink-600 bg-ink-900/60 p-3 text-left transition hover:border-brand-400/60 hover:bg-ink-700"
              >
                {acc.label === 'Admin' ? (
                  <ShieldCheck size={18} className="mt-0.5 shrink-0 text-nova-400" />
                ) : (
                  <UserRound size={18} className="mt-0.5 shrink-0 text-brand-300" />
                )}
                <span>
                  <span className="block text-sm font-semibold text-white">{acc.label}</span>
                  <span className="block text-[11px] leading-tight text-muted">{acc.hint}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </AuthLayout>
  );
}
