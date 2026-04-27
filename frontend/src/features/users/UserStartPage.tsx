import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { GET_USERS } from '@api/queries/users';
import { UPSERT_USER_BY_NAME } from '@api/mutations/users';

interface User {
  userId: string;
  name: string;
  createdAt: string;
}

export default function UserStartPage() {
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [userName, setUserName] = useState('');
  const [error, setError] = useState('');

  const { data: usersData, loading: usersLoading } = useQuery<{ users: User[] }>(GET_USERS);
  const [upsertUser, { loading: upsertLoading }] = useMutation(UPSERT_USER_BY_NAME);

  const handleUserClick = (userId: string) => {
    navigate(`/users/${userId}/dashboard`);
  };

  const handleAddUserClick = () => {
    setShowForm(true);
    setError('');
    setUserName('');
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = userName.trim();

    if (!trimmedName) {
      setError('Please enter a name');
      return;
    }

    try {
      const { data } = await upsertUser({
        variables: { name: trimmedName },
        refetchQueries: [{ query: GET_USERS }],
      });

      if (data?.upsertUserByName) {
        navigate(`/users/${data.upsertUserByName.userId}/dashboard`);
      }
    } catch (err) {
      setError('Failed to create or find user');
      console.error(err);
    }
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  const users = usersData?.users || [];

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">CloudCert Drill</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Certification exam practice made simple
        </p>
      </div>

      {showForm && (
        <div className="mx-auto max-w-sm rounded-lg border bg-card p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Enter Your Name</h2>
          <form onSubmit={handleSubmitUser} className="space-y-4">
            <div>
              <input
                type="text"
                placeholder="First name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={upsertLoading}
              />
            </div>
            {error && <div className="text-sm text-destructive">{error}</div>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={upsertLoading}
                className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {upsertLoading ? 'Loading...' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {users.map((user) => (
          <button
            key={user.userId}
            onClick={() => handleUserClick(user.userId)}
            className="flex h-32 flex-col items-center justify-center rounded-lg border border-input bg-card p-4 shadow transition hover:shadow-md hover:border-primary"
          >
            <div className="text-2xl">👤</div>
            <div className="mt-2 text-sm font-medium text-center">{user.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Click to continue
            </div>
          </button>
        ))}

        {!showForm && (
          <button
            onClick={handleAddUserClick}
            className="flex h-32 flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-accent/10 transition hover:border-primary hover:bg-accent/20"
          >
            <div className="text-4xl">+</div>
            <div className="mt-2 text-sm font-medium">New User</div>
          </button>
        )}
      </div>
    </div>
  );
}
