import { SavedProfilesList } from '@/components/SavedProfilesList';

export default function InterestsPage() {
  return (
    <SavedProfilesList
      endpoint="/api/interests"
      redirectTo="/interests"
      title="Your Interests"
      description="Profiles you have expressed interest in. A premium membership lets you message them directly."
      emptyMessage="You haven't expressed interest in anyone yet."
    />
  );
}
