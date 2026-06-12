import { logout } from "./login/actions";

/** Posts to the logout server action, clearing the admin cookie. */
export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white/70 hover:border-white/40 hover:text-white"
      >
        Log out
      </button>
    </form>
  );
}
