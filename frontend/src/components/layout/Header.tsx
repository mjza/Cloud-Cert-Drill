import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="border-b bg-card">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary">
            ☁️ CloudCert
          </div>
        </Link>
        <nav className="flex items-center gap-6">
          <Link to="/users" className="hover:text-primary">
            Users
          </Link>
          <Link to="/admin/questions" className="hover:text-primary">
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
