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

export type User = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  gender: string;
  dob: string;
  profile_for: string;
  plan_id: string | null;
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
