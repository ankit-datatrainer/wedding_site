import { SavedProfilesList } from '@/components/SavedProfilesList';

export default function ShortlistPage() {
  return (
    <SavedProfilesList
      endpoint="/api/shortlist"
      redirectTo="/shortlist"
      title="Your Shortlist"
      description="Profiles you have saved. Express interest when you are ready to start a conversation."
      emptyMessage="You have not shortlisted anyone yet."
    />
  );
}
