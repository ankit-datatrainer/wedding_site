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
  /** Approval workflow — only 'approved' profiles appear on the public site. */
  status?: ProfileStatus;
  /** Full biodata beyond the columns above (family, horoscope, reference…). */
  details?: ProfileDetails;
  source?: 'manual' | 'biodata' | null;
  created_by?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  review_note?: string | null;
};

export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export type ProfileDetails = Partial<
  Record<
    | 'dob' | 'timeOfBirth' | 'placeOfBirth' | 'weightKg' | 'complexion' | 'bloodGroup'
    | 'smoking' | 'drinking' | 'disability' | 'gothram' | 'manglik' | 'rashi' | 'nakshatra'
    | 'state' | 'country' | 'address' | 'pincode' | 'college' | 'employer' | 'annualIncome'
    | 'fatherName' | 'fatherOccupation' | 'motherName' | 'motherOccupation' | 'siblings'
    | 'familyType' | 'familyStatus' | 'familyValues' | 'phone' | 'email'
    | 'referenceName' | 'referencePhone' | 'referredBy' | 'partnerExpectations',
    string
  >
>;

/** One ranked candidate from the admin biodata matcher (server/src/matching.js). */
export type MatchCandidate = {
  rank: number;
  kind: 'profile' | 'member';
  id: string;
  name: string;
  gender: string;
  age: number | null;
  religion?: string;
  community?: string;
  location?: string;
  profession?: string;
  education?: string;
  photo?: string;
  verified?: boolean;
  email?: string;
  score: number;
  reasons: { points: number; label: string }[];
};

export type ParentNotification = {
  relation: string;
  email: string;
  status: 'sent' | 'logged' | 'failed';
  sentAt: string;
};

export type RegisterResult = {
  notifications: ParentNotification[];
  reference?: { name?: string; phone?: string; relation?: string };
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
  fatherEmail?: string;
  motherName?: string;
  motherOccupation?: string;
  motherEmail?: string;
  siblings?: string;
  familyType?: string;
  familyStatus?: string;
  familyValues?: string;

  referenceName?: string;
  referencePhone?: string;
  referredBy?: string;

  aboutMe?: string;
  partnerExpectations?: string;
  partnerPreferences?: PartnerPreferences;
  parentNotifications?: ParentNotification[];
};

export type PartnerPreferences = {
  professionType?: 'businessman' | 'job' | 'any';
  diet?: 'vegetarian' | 'non_vegetarian' | 'any';
  sameCaste?: boolean;
  ageMin?: number | string;
  ageMax?: number | string;
  location?: string;
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
  role: 'member' | 'admin' | 'staff';
  admin_role_id?: string | null;
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
