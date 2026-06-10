import { signInWithDevRole, signInWithPassword } from "@/lib/auth/actions";

const quickLoginButtons = [
  { role: "A", label: "사무직으로 로그인" },
  { role: "P", label: "현장직으로 로그인" },
  { role: "E", label: "임원으로 로그인" },
];

export function LoginForm() {
  return (
    <div className="login-panel">
      <div className="login-panel__header">
        <p>DSS</p>
        <h1>동성실리콘 주문관리</h1>
        <span>로컬 POC 환경</span>
      </div>

      <form action={signInWithPassword} className="login-panel__form">
        <label>
          <span>이메일</span>
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label>
          <span>비밀번호</span>
          <input name="password" type="password" autoComplete="current-password" />
        </label>
        <button type="submit">로그인</button>
      </form>

      <div className="login-panel__quick" aria-label="개발용 빠른 로그인">
        {quickLoginButtons.map((button) => (
          <form action={signInWithDevRole} key={button.role}>
            <input name="role" type="hidden" value={button.role} />
            <button type="submit">{button.label}</button>
          </form>
        ))}
      </div>
    </div>
  );
}
