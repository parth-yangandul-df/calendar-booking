import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { UserSearchBar } from '../components/UserSearchBar';
import { useDebounce } from '../hooks/useDebounce';
import { useUserSearch } from '../hooks/useAvailability';

export function UserDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: users, isLoading } = useUserSearch(debouncedSearch);
  const navigate = useNavigate();

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Find People</h1>

      <div className="mb-6">
        <UserSearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {!debouncedSearch ? (
        <p className="text-sm text-muted-foreground">Start typing to search for people.</p>
      ) : isLoading ? (
        <p className="text-sm text-muted-foreground">Searching...</p>
      ) : !users || users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="grid gap-3">
          {users.map((user) => (
            <Card
              key={user.id}
              className="p-4 cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/users/${user.id}`)}
            >
              <p className="text-sm font-medium">{user.email}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default UserDirectoryPage;
