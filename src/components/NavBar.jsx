import "./NavBar.css";

function NavBar({ user, signOut }) {
  return (
    <nav className="nav-bar">
      <span className="nav-bar-brand">My Backend Dropbox</span>
      {user && (
        <div className="nav-bar-account">
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
