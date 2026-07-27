import "./NavBar.css";

function NavBar({ user, view, onNavigate, signOut }) {
  return (
    <nav className="nav-bar">
      <span className="nav-bar-brand">My Backend Dropbox</span>
      {user && (
        <div className="nav-bar-account">
          <button
            type="button"
            className="nav-bar-link"
            onClick={() => onNavigate("files")}
            disabled={view === "files"}
          >
            Files
          </button>
          <button
            type="button"
            className="nav-bar-link"
            onClick={() => onNavigate("profile")}
            disabled={view === "profile"}
          >
            Profile
          </button>
          <span className="nav-bar-user">{user.signInDetails?.loginId}</span>
          <button type="button" className="nav-bar-signout" onClick={signOut}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
