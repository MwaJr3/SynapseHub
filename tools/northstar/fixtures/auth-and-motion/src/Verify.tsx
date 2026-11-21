export function Verify() {
  return (
    <form onSubmit={submit}>
      <label htmlFor="pw">Password</label>
      <input id="pw" type="password" />
      <label htmlFor="pw2">New password</label>
      <input id="pw2" type="password" autoComplete="new-password" />
      <label htmlFor="otp">Verification code</label>
      <input id="otp" name="otp" inputMode="numeric" />
      <label htmlFor="otp2">Backup code</label>
      <input id="otp2" name="otp2" autoComplete="one-time-code" />
      <button type="submit">Verify</button>
    </form>
  );
}
