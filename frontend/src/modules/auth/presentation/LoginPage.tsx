import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { errorMessage } from '@/shared/http';
import { Button, Input } from '@/shared/ui';
import { hasErrors, validateLogin, type FieldErrors, type LoginInput } from '../domain/User';
import { authService } from '../module';
import { AuthLayout } from './AuthLayout';
import { GoogleSignIn } from './GoogleSignIn';
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

      <GoogleSignIn text="signin_with" onSuccess={() => navigate(redirectTo, { replace: true })} onError={setServerError} />

      <p className="mt-5 text-center text-sm text-muted">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-brand-300 hover:underline">
          Đăng ký ngay
        </Link>
      </p>

    </AuthLayout>
  );
}
