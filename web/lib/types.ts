export type Profile = {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  profession: string;
  location: string;
  city: string;
  education: string;
  education_level: string;
  religion: string;
  community: string;
  marital_status: string;
  verified: boolean;
  height_cm: number;
  mother_tongue: string;
  diet: string;
  photo: string;
  about: string;
  last_active_days: number;
  created_at: string;
  /** Present when the request was authenticated — reflects the viewer's own saved state. */
  is_shortlisted?: boolean;
  is_interested?: boolean;
  /** Present only on /api/matches results — see server/src/store.js#scoreMatch. */
  match_score?: number;
};

export type Paged<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Story = {
  id: string;
  couple: string;
  rating: number;
  quote: string;
  photo: string;
};

export type StoryMedia = { video: string; app: string };

export type Plan = {
  id: string;
  name: string;
  duration: string;
  amount: number;
  currency: string;
  highlight: boolean;
  features: string[];
};

/** The matrimonial profile captured by the onboarding wizard. Every field is optional. */
export type MemberDetails = {
  heightCm?: string;
  weightKg?: string;
  maritalStatus?: string;
  diet?: string;
  smoking?: string;
  drinking?: string;
  disability?: string;
  motherTongue?: string;
  religion?: string;
  community?: string;
  gothram?: string;
  manglik?: string;
  rashi?: string;
  nakshatra?: string;

  country?: string;
  state?: string;
  city?: string;
  address?: string;
  pincode?: string;

  highestEducation?: string;
  college?: string;
  occupation?: string;
  employer?: string;
  annualIncome?: string;

  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  siblings?: string;
  familyType?: string;
  familyStatus?: string;
  familyValues?: string;

  aboutMe?: string;
  partnerExpectations?: string;
};

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  dob: string;
  profile_for: string;
  plan_id: string | null;
  role: 'member' | 'admin';
  phone: string | null;
  photo_url: string | null;
  photos: string[];
  details: MemberDetails;
  created_at: string;
};

export type Media = {
  photos: {
    hero: string;
    aboutBack: string;
    aboutFront: string;
    floral: string;
    jewellery: string;
  };
  storyMedia: StoryMedia;
};
