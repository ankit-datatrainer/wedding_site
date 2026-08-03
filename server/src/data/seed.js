// Content lifted from the Google Stitch design screens (home, browse_profiles,
// success_stories) and expanded into a realistic dataset so filtering,
// sorting and pagination have something to work against.

const P = 'https://lh3.googleusercontent.com/aida-public/';

export const photos = {
  hero: P + 'AB6AXuCq-dtMI-jYAYv3la87kyQeuSvZra6igm-gV_1kegSBkNJcXR6xQoEV7nhTX22Q-Z5bJqgqYBOUH2aVRE4QZhT-RhfTMxq7tv8vgnGVZ2RD_HIOns5rQ7wTN1zdIQYvJUJ_GwNqhWEOCVo3HqrAjBgiFSnQfOklwWktU-Oz7Y0DOULCjvpObNC0jgD9EG8911NJTT9iXfHl6OsmIsRfFTSrTO5VoZeEyHHW0MRWUXzhbS1eW7-75vAzrpu-HK4vy0cYs8g9Nt_pXkAU',
  aboutBack: P + 'AB6AXuBBcQFSodopMCC5VXzHoiTnB9c3TRjHQrnfuyqA_rRHly2_rZgiTU7JtCSPCB0-ePBcbbH67IMasrcEFO3_D9xFjvNPNkChYOJRZ156P69dXRk0fNC6bPG_DhH1XH0GjEJfVZypsUKlUBNfYyoleDz2oY33YeUHSw6malNmL1G79prxri8t8tZkTLCTgp53XuofzTQSIz4mcdDvk65tstZoFZjg1joG70RdFiJ-F_QyOPFdF2Jnv1rBjaRoOnUFe6t7Aeu0TJdbN-3N',
  aboutFront: P + 'AB6AXuCy9_qNTxWn6rsPWto1bm50x2U694_puSsginpHR7pzlrqhTyG7scDBI40SqRewjDvx2ei0fBOhZCBvXXWa-mRDuAN-gznHv5WW5gmHLUcH0F0GnEX1ahbrkOiSgpdEc0grTRHkPEvnhoXfgfPSiffAhmuGRCEsiwZOfHFHlx6MffwfW1k5LCSvkRQz2dQ9_-ZytDwoaBASQkJV0r9JJ0dTSaNkaJ7lymaU1DjRKGXB92AzzAytdnaq_FAJAx9vCTd-34ovAV2Odmlm',
  floral: P + 'AB6AXuDLp3HfXgrkn248YNvhKql7cgiIpxRMSboAG1Suvt4PEwBZ0aPAEXWZ4ulVWLTj2Eu_Osh_w1ST2INGZ2K0DICG8DcrwkFo-OW4qvjZeoWkYOaQPem8VgNj-5obHYR68W2Qhne3MZdeS3xOW__Q0BZQmzdVSRdniEcGoWgi4cv1oFygcaiyupTzKJDBnJOkAOZLhvYal8ahwjXJqjEz-QR4GcqhZNX2uX1QWCH48AncbBk_zQZBYKJw986Ehuf3DKkAk5BaeJwZouPZ',
  jewellery: P + 'AB6AXuAzgaLJs-y3jOZP37ZQ4fXWy-EJ7C0b1e_sqpkmU01tKjWFpL4OWMtiP29aRRY_s3NOhzaNTI2wedCvE620hkG_lPIZ6GKTbQJCD4iLm1LqDM2xCCwmIqLk2Kb6MODNebVbUonNl8d5jBYdFGufen_GR_TLTZb2q4x93gXvP9JCy1LE5zGRuiXvbf0ivUKH0CAjAGuz5I6YHxE6gzHxl2YOOD3NO2To7qJSD5cx8-tz7naWqdymda00c934dATxLOtaxzruL4b35U66',
};

const avatars = [
  P + 'AB6AXuC9LBUlc_MylVGYA9KGB-40IysTebeP8Au9h7HsoO2EoetrZISllIeSsSEYZuJymuGr0dTb250QwWDfIfpgiZyzHOHYd_VRow_Tn8PrBpIeM16kb9nBcdJq3ksPkIiPJ8GuqNzr9L74gxbROPIM1yE3PXUMPswFBNDkzUyrwUZ12gxwe88BKif_Yxr9AXrfP_1jFv9uFflERr3woq_oPLzD02CwLxSzgQTgWKHNn7qYQ6CYYGSv8WJec-kO0J9MwPm_FJhrdtAn-X2Q',
  P + 'AB6AXuAlqPa80r4nvmIlTjV1NIiKNR98RTZJB8f4FX4az3cgtpZChG1_g6Vjg-cW61jBmP1oPMhfoudIqySIChze1umuB4Cjywqn9WtTLMzgymqclpFmcHwcb7HMlk1-OkKt7zRDDhva6OBb5gQNIQrzt1neV5cSwhgJFuVsSwkNDppMBX-093y6XDHPwcg-HJ2bGl7tZRf37g3iBqaG8oNCsyZCKKspC2qNaz7eneW5pq0PMaGfn-sb8o_nfnt_4S8JVUCGkb8xba2naSjb',
  P + 'AB6AXuCxpDrvIDYCBIEmZ_39YL3KJYLkNCrnzQy8Azwf_WxyE_Hwonr1CF2D3NlOZnPW0qr_lM4nqsIl8ZyDfiVzUfPlAgQpXQmd5lr0NbdL2ygf62bcCK5xOTZQ7qPH4-sJNHz6tWELJ_plOHDGM1yG0nyfrx47Szt9Oz2rU3E1QdLYsgWbd6mZ6E0Pygry-FGfCeI1Q_DOQonxo-ddWF2rkJy0Pn8llF3L4eVrwhTqsRedf_NpExROMb-JTLeZ7gPgfAtWyhehL5bm7aBd',
  P + 'AB6AXuDNMrX0Vorale0-udJUNO_ci3YziVELcz3-qpq3X5e-5U3eQKBkdp4Fk5oXjXj7vq5thI_BW9EWYBj7sFc9-Wbsm-q4gmOaXkowQUcwf4PBpKift3srctbmg7fZC6FvvV233Vqir2GhPADuu4kF7iA-QY805mlK4YcPxVX0ChdpMbqkdajA9WLgP4aqmm1mQ1tEnRUP_fdIP1DWo_MnD3f-wKL-qLnoVQ6ztyG0Aor02aPDvehFLrnfnf-u1lREqjNZpX0JN425hFa6',
  P + 'AB6AXuDzT4WeTs482R3QUREWDNSWnKXeUnOOB5QZqg3pDW_k_SE2eC0-8xhME6eyCJiuPy5wieYd7OoCXC3JYoulxZMASzgujzCbbkV0apKjjKnG8l3BlK11aWgRqMZEwFDH7mVldDiuXcAGvF6fRTA37XVJc3lLirwTkIffO8s0lNNLV2oCs5zbZU712J1LFI6VxvWVfTiMBH7AMAZlA-nDItmDnNGi1lmHqZHMF3NdgfAPoCYjlfjT4s76_jpze7egAQPP2IUzLVDV7F-q',
  P + 'AB6AXuBL1mTyDq6JeHIE8I4L_ORHCEqxjPBz2WR_XD_U4i7tiMbNWsks4hR2NMxS6txqEYdImvSSUYQuEHN-Ttv4MhEYEn_wL3jRtSnpgvNizcgPdC8vmEb7vsX7Y8WQKwifJ4b8nTUct4e6JifQsPeyjrghmpSjENh4jQakspI0VoA-ltq5SUobnqBRkdETr05uLAW7NkEbraPvASwCsOP5JC391Dzm-lfXUpOChGuSmAtUTAA8K9ND9tjqTjMQ2V3x6sh19iWq3pZli8NR',
  P + 'AB6AXuCFC4rBxXNkJH0Ya2-zPmo6TJXhjbyRgWtM-sQKuyzyImRTywS7s5U8YQ06kNkAd00He5o0igf-E1VJ_rQP7UuCfMIQghxTqRpL98-1WOgaZPbsJKHVisigFyaNYoL1oF2CJ4Yhn_C04TsScz2lFNqhIztdPF6j7hVZVLCFE55959fLUqiEmhYoyf8ZEfOwJBi-9v8BF08YDNJw6RZWOlwrV_Fmj2Up9XBT2qItkvJlGJSJlj0DW-maEhd-liF3wjhtkT5GFtHXnN61',
  P + 'AB6AXuCUR3N-52m1K37mmIhXH_EuOMvizkc94pjiXVRzLRvyjmdaIea6i3_znPdL_0rdORkJCqKBuwLFvcOKBfan_XHx8ZK0PqpeL6Q10zoENaMTyVAnbiLZ66D_31zIQsgOFaw3rDyxUwSBSSDyxt8mLGiWYIVkIF6VJFUhRvjDqzLL-ayu6AKfwr-z2ZHq1ibKuKgfSViQQhREM5z_Tvih32oF43N25Ajl0005h9IKIkxoMEjGURrBKHbS7jGYUw27lTQoaaTDJ31WoMTu',
  P + 'AB6AXuC797UazzcPJQwjp5ARh6hljZQ4RW7ap-KjFfuvKCY3yI5HccF9Z5KkmVoROETS3IA2CPOHl7yezZzf5w6KCV3CpiaVsP2ADcZ6lyyf_RG7ous-I3gAydqvh7t9Xsy7AYFX0TLb05gqsScdQN5gNipmU7pUv9XHvLYroH0Ay8FcWhNLmPnO8_J8HS7ogARjShktJO2SVIjLxi0rNplFNkbW6Tw1O4vj9u2z8l6asdAzOvsbOiv6dXdluQP5OSGAvOY-o5mWsntSPSdu',
  P + 'AB6AXuC_032uhJrGuGyZVdY-yx5EwphbHFNES3JzVAuKssOR7pBgM2Z2kD-DIi6vyp3hPzEXLZd847BEnxvTakAx9ZMKWoZTNUaHTFFIuTOkXwIeY8x5CcHbh6o19QHp9HLxWlxWO6aVYvnlGce3eghbH7OKX6hmY59jDJimFc8qfBpuKcuhHFTZ9OnL7dyQ8a1810Ud4sdwrYhmo492HJNSn-z1zDc5HIPrgm5-ML9se5t6Tk3hqIo50Os0QXNe9t7zQWUZU6pTJGbU8wcd',
];

const raw = [
  ['Sritama Sengupta', 28, 'female', 'Neuro Surgeon', 'Mumbai, Maharashtra', 'MSC, IIT Mumbai', 'Masters', 'Hindu', 'Bengali', 'Never Married', true],
  ['Rohan Chatterjee', 30, 'male', 'Software Architect', 'Pune, Maharashtra', 'B.Tech, NIT Surathkal', 'Bachelors', 'Hindu', 'Bengali', 'Never Married', true],
  ['Anjali Verma', 27, 'female', 'Marketing Director', 'Delhi, NCR', 'MBA, IIM Ahmedabad', 'Masters', 'Hindu', 'Agarwal', 'Never Married', true],
  ['Priya Sharma', 29, 'female', 'Financial Analyst', 'Bengaluru, Karnataka', 'CA, ICAI', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true],
  ['Vikram Singh', 31, 'male', 'Corporate Lawyer', 'Hyderabad, Telangana', 'LLB, NALSAR', 'Bachelors', 'Sikh', 'Jat', 'Never Married', true],
  ['Meera Krishnan', 26, 'female', 'Content Strategist', 'Chennai, Tamil Nadu', 'MA, Madras University', 'Masters', 'Hindu', 'Iyer', 'Never Married', false],
  ['Aarav Desai', 30, 'male', 'Software Engineer', 'Pune, Maharashtra', 'B.Tech, NIT', 'Bachelors', 'Hindu', 'Patel', 'Never Married', true],
  ['Meera Patel', 27, 'female', 'Architect', 'Ahmedabad, Gujarat', 'M.Arch, CEPT', 'Masters', 'Hindu', 'Patel', 'Never Married', true],
  ['Ananya Sharma', 26, 'female', 'Marketing Manager', 'Delhi, NCR', 'MBA, IIM', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true],
  ['Imran Sheikh', 32, 'male', 'Cardiologist', 'Lucknow, Uttar Pradesh', 'MD, KGMU', 'Doctorate', 'Muslim', 'Sunni', 'Never Married', true],
  ['Fatima Ansari', 28, 'female', 'Data Scientist', 'Bengaluru, Karnataka', 'MS, IISc', 'Masters', 'Muslim', 'Sunni', 'Never Married', true],
  ['Joseph Fernandes', 34, 'male', 'Civil Engineer', 'Goa', 'B.E, Goa College of Engineering', 'Bachelors', 'Christian', 'Catholic', 'Divorced', false],
  ['Ritika Nair', 25, 'female', 'UX Designer', 'Kochi, Kerala', 'B.Des, NID', 'Bachelors', 'Hindu', 'Nair', 'Never Married', true],
  ['Harpreet Kaur', 29, 'female', 'Pharmacist', 'Chandigarh, Punjab', 'M.Pharm, PU', 'Masters', 'Sikh', 'Arora', 'Never Married', true],
  ['Arjun Reddy', 33, 'male', 'Investment Banker', 'Hyderabad, Telangana', 'MBA, ISB', 'Masters', 'Hindu', 'Reddy', 'Never Married', true],
  ['Sneha Iyer', 27, 'female', 'Clinical Psychologist', 'Chennai, Tamil Nadu', 'M.Phil, NIMHANS', 'Doctorate', 'Hindu', 'Iyer', 'Never Married', true],
  ['Kabir Malhotra', 31, 'male', 'Product Manager', 'Gurugram, Haryana', 'MBA, FMS Delhi', 'Masters', 'Hindu', 'Khatri', 'Never Married', true],
  ['Divya Rao', 30, 'female', 'Professor', 'Mysuru, Karnataka', 'PhD, IISc', 'Doctorate', 'Hindu', 'Madhwa', 'Widowed', false],
  ['Aditya Joshi', 28, 'male', 'Chartered Accountant', 'Nagpur, Maharashtra', 'CA, ICAI', 'Bachelors', 'Hindu', 'Deshastha', 'Never Married', true],
  ['Nikita Bansal', 26, 'female', 'Fashion Entrepreneur', 'Jaipur, Rajasthan', 'B.Des, NIFT', 'Bachelors', 'Hindu', 'Agarwal', 'Never Married', true],
  ['Rahul Mehta', 35, 'male', 'Orthopaedic Surgeon', 'Surat, Gujarat', 'MS, AIIMS', 'Doctorate', 'Hindu', 'Jain', 'Divorced', true],
  ['Zoya Khan', 24, 'female', 'Journalist', 'Mumbai, Maharashtra', 'MA, Jamia Millia', 'Masters', 'Muslim', 'Sunni', 'Never Married', false],
  ['Sameer Dutta', 29, 'male', 'Research Scientist', 'Kolkata, West Bengal', 'PhD, IIT Kharagpur', 'Doctorate', 'Hindu', 'Kayastha', 'Never Married', true],
  ['Aishwarya Menon', 31, 'female', 'Airline Pilot', 'Kochi, Kerala', 'B.Sc Aviation, IGRUA', 'Bachelors', 'Hindu', 'Menon', 'Never Married', true],
];

const bios = [
  'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.',
  'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.',
  'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.',
  'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.',
];

const original = raw.map((r, i) => {
  const [name, age, gender, profession, location, education, educationLevel, religion, community, maritalStatus, verified] = r;
  return {
    id: `p${i + 1}`,
    name,
    age,
    gender,
    profession,
    location,
    city: location.split(',')[0].trim(),
    education,
    education_level: educationLevel,
    religion,
    community,
    marital_status: maritalStatus,
    verified,
    height_cm: 152 + ((i * 7) % 30),
    mother_tongue: ['Bengali', 'Hindi', 'Tamil', 'Marathi', 'Malayalam', 'Punjabi'][i % 6],
    diet: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian'][i % 3],
    photo: avatars[i % avatars.length],
    about: bios[i % bios.length],
    last_active_days: (i * 3) % 14,
    created_at: new Date(Date.now() - i * 36e5 * 9).toISOString(),
  };
});

// 20 male + 20 female additions so the matching algorithm (server/src/store.js
// #getMatches) has a real pool of opposite-gender candidates to rank for
// every viewer, not just the original 24 mixed-gender design-screen profiles.
// Photos are randomuser.me's static "dummy user" portrait set — a service
// built specifically for placeholder profile photos in exactly this kind of
// seed data, not real individuals' photos or AI-generated likenesses.
const dummyMalePhoto = (n) => `https://randomuser.me/api/portraits/men/${n}.jpg`;
const dummyFemalePhoto = (n) => `https://randomuser.me/api/portraits/women/${n}.jpg`;

const rawMale = [
  ['Ravi Kumar', 29, 'Software Developer', 'Bengaluru, Karnataka', 'B.Tech, IIIT Bangalore', 'Bachelors', 'Hindu', 'Reddy', 'Never Married', true, 1],
  ['Amitabh Chauhan', 32, 'Bank Manager', 'Lucknow, Uttar Pradesh', 'MBA, IIM Lucknow', 'Masters', 'Hindu', 'Rajput', 'Never Married', true, 2],
  ['Suresh Pillai', 34, 'Marine Engineer', 'Kochi, Kerala', 'B.Tech, CUSAT', 'Bachelors', 'Hindu', 'Nair', 'Divorced', false, 3],
  ['Farhan Ahmed', 28, 'Graphic Designer', 'Hyderabad, Telangana', 'B.Des, NID', 'Bachelors', 'Muslim', 'Sunni', 'Never Married', true, 4],
  ['Gurpreet Singh', 31, 'Restaurateur', 'Amritsar, Punjab', 'B.Com, GNDU', 'Bachelors', 'Sikh', 'Jat', 'Never Married', true, 5],
  ['Anand Krishnan', 27, 'Data Analyst', 'Chennai, Tamil Nadu', 'M.Sc Statistics, Loyola', 'Masters', 'Hindu', 'Iyengar', 'Never Married', false, 6],
  ['Vivek Oberoi', 33, 'Hotel General Manager', 'Goa', 'BHM, IHM Goa', 'Bachelors', 'Hindu', 'Khatri', 'Never Married', true, 7],
  ['Manoj Tiwari', 36, 'Government Officer', 'Patna, Bihar', 'MA Public Admin, Patna University', 'Masters', 'Hindu', 'Brahmin', 'Widowed', false, 8],
  ['Rohit Bhatia', 30, 'Mechanical Engineer', 'Ludhiana, Punjab', 'B.Tech, PEC', 'Bachelors', 'Hindu', 'Khatri', 'Never Married', true, 9],
  ['Shantanu Ghosh', 29, 'Film Editor', 'Kolkata, West Bengal', 'B.Sc, Satyajit Ray Institute', 'Bachelors', 'Hindu', 'Kayastha', 'Never Married', true, 10],
  ['Irfan Sheikh', 35, 'Import-Export Trader', 'Surat, Gujarat', 'B.Com, VNSGU', 'Bachelors', 'Muslim', 'Sunni', 'Divorced', true, 11],
  ['Nikhil Wadhwa', 26, 'UI/UX Designer', 'Gurugram, Haryana', 'B.Des, MIT Institute of Design', 'Bachelors', 'Hindu', 'Arora', 'Never Married', false, 12],
  ['Thomas Kutty', 32, 'Physiotherapist', 'Thiruvananthapuram, Kerala', 'BPT, Kerala University', 'Bachelors', 'Christian', 'Syro-Malabar', 'Never Married', true, 13],
  ['Yash Agnihotri', 28, 'Startup Founder', 'Indore, Madhya Pradesh', 'B.Tech, IIT Indore', 'Bachelors', 'Hindu', 'Brahmin', 'Never Married', true, 14],
  ['Devendra Solanki', 33, 'Civil Services Officer', 'Jaipur, Rajasthan', 'MA Economics, DU', 'Masters', 'Hindu', 'Rajput', 'Never Married', true, 15],
  ['Aakash Chopra', 30, 'Sports Physiotherapist', 'Mohali, Punjab', 'BPT, PGIMER', 'Bachelors', 'Hindu', 'Khatri', 'Never Married', false, 16],
  ['Basil George', 31, 'Merchant Navy Officer', 'Kochi, Kerala', 'B.Tech Marine, AMET', 'Bachelors', 'Christian', 'Catholic', 'Never Married', true, 17],
  ['Pranav Kulkarni', 27, 'Environmental Consultant', 'Pune, Maharashtra', 'M.Tech, COEP', 'Masters', 'Hindu', 'Deshastha', 'Never Married', true, 18],
  ['Ehsaan Qureshi', 34, 'Architect', 'Bhopal, Madhya Pradesh', 'B.Arch, SPA Bhopal', 'Bachelors', 'Muslim', 'Sunni', 'Divorced', false, 19],
  ['Balvinder Sandhu', 29, 'Agri-Business Manager', 'Chandigarh, Punjab', 'MBA Agribusiness, PAU', 'Masters', 'Sikh', 'Jat', 'Never Married', true, 20],
];

const rawFemale = [
  ['Kavya Subramaniam', 26, 'Biotechnologist', 'Chennai, Tamil Nadu', 'M.Sc Biotech, VIT', 'Masters', 'Hindu', 'Iyengar', 'Never Married', true, 1],
  ['Simran Kaur Gill', 28, 'HR Manager', 'Chandigarh, Punjab', 'MBA HR, PU', 'Masters', 'Sikh', 'Jat', 'Never Married', true, 2],
  ['Ayesha Siddiqui', 30, 'Pediatrician', 'Lucknow, Uttar Pradesh', 'MD Pediatrics, KGMU', 'Doctorate', 'Muslim', 'Sunni', 'Never Married', true, 3],
  ['Lakshmi Venkataraman', 27, 'Chartered Accountant', 'Chennai, Tamil Nadu', 'CA, ICAI', 'Bachelors', 'Hindu', 'Iyer', 'Never Married', false, 4],
  ["Riya D'Souza", 25, 'Air Hostess', 'Mumbai, Maharashtra', "BA, St. Xavier's College", 'Bachelors', 'Christian', 'Catholic', 'Never Married', true, 5],
  ['Pooja Rathore', 29, 'Bank Officer', 'Jodhpur, Rajasthan', 'MBA Finance, MDS University', 'Masters', 'Hindu', 'Rajput', 'Never Married', true, 6],
  ['Neha Kapoor', 31, 'Interior Designer', 'Delhi, NCR', 'B.Des, Pearl Academy', 'Bachelors', 'Hindu', 'Khatri', 'Divorced', false, 7],
  ['Swati Deshmukh', 26, 'Veterinarian', 'Nagpur, Maharashtra', 'BVSc, Nagpur Veterinary College', 'Bachelors', 'Hindu', 'Deshastha', 'Never Married', true, 8],
  ['Ipsita Mohanty', 28, 'Civil Services Officer', 'Bhubaneswar, Odisha', 'MA Public Admin, Utkal University', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true, 9],
  ['Tanvi Bhargava', 24, 'Dentist', 'Jaipur, Rajasthan', 'BDS, RUHS', 'Bachelors', 'Hindu', 'Brahmin', 'Never Married', true, 10],
  ['Farah Khan Lodhi', 32, 'School Principal', 'Bhopal, Madhya Pradesh', 'M.Ed, Barkatullah University', 'Masters', 'Muslim', 'Sunni', 'Widowed', false, 11],
  ['Aparna Warrier', 27, 'Ayurvedic Physician', 'Kochi, Kerala', 'BAMS, Kerala University', 'Bachelors', 'Hindu', 'Nair', 'Never Married', true, 12],
  ['Grace Thomas', 29, 'Speech Therapist', 'Bengaluru, Karnataka', 'MSc Speech-Language Pathology, AIISH', 'Masters', 'Christian', 'Protestant', 'Never Married', true, 13],
  ['Manpreet Kaur Bedi', 30, 'Fashion Designer', 'Ludhiana, Punjab', 'B.Des, NIFT', 'Bachelors', 'Sikh', 'Arora', 'Divorced', true, 14],
  ['Diya Choudhary', 25, 'Journalist', 'Ahmedabad, Gujarat', 'MA Journalism, MICA', 'Masters', 'Hindu', 'Brahmin', 'Never Married', false, 15],
  ['Ruchika Malviya', 28, 'Investment Analyst', 'Indore, Madhya Pradesh', 'MBA Finance, IIM Indore', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true, 16],
  ['Sana Merchant', 31, 'Radiologist', 'Surat, Gujarat', 'MD Radiology, GMERS', 'Doctorate', 'Muslim', 'Sunni', 'Never Married', true, 17],
  ['Christina Fernandes', 26, 'Marine Biologist', 'Panaji, Goa', 'M.Sc Marine Biology, Goa University', 'Masters', 'Christian', 'Catholic', 'Never Married', true, 18],
  ['Bhavna Rawal', 33, 'Corporate Lawyer', 'Dehradun, Uttarakhand', 'LLB, National Law University', 'Bachelors', 'Hindu', 'Rajput', 'Divorced', false, 19],
  ['Amandeep Kaur Sethi', 27, 'Textile Designer', 'Amritsar, Punjab', 'B.Des Textiles, NIFT', 'Bachelors', 'Sikh', 'Jat', 'Never Married', true, 20],
];

function buildDummyProfile(row, gender, photo, idPrefix, index) {
  const [name, age, profession, location, education, educationLevel, religion, community, maritalStatus, verified] = row;
  return {
    id: `${idPrefix}${index + 1}`,
    name,
    age,
    gender,
    profession,
    location,
    city: location.split(',')[0].trim(),
    education,
    education_level: educationLevel,
    religion,
    community,
    marital_status: maritalStatus,
    verified,
    height_cm: gender === 'male' ? 165 + ((index * 3) % 21) : 150 + ((index * 3) % 21),
    mother_tongue: ['Hindi', 'Punjabi', 'Tamil', 'Malayalam', 'Marathi', 'Gujarati', 'Bengali', 'Urdu'][index % 8],
    diet: ['Vegetarian', 'Non-Vegetarian', 'Eggetarian'][index % 3],
    photo,
    about: bios[index % bios.length],
    last_active_days: (index * 2) % 21,
    created_at: new Date(Date.now() - (index + 24) * 36e5 * 6).toISOString(),
  };
}

const dummyMales = rawMale.map((row, i) =>
  buildDummyProfile(row.slice(0, -1), 'male', dummyMalePhoto(row[row.length - 1]), 'dm', i)
);
const dummyFemales = rawFemale.map((row, i) =>
  buildDummyProfile(row.slice(0, -1), 'female', dummyFemalePhoto(row[row.length - 1]), 'df', i)
);

export const profiles = [...original, ...dummyMales, ...dummyFemales];

export const stories = [
  {
    id: 's1',
    couple: 'Gopal & Kanika',
    rating: 5,
    quote:
      'We met on EverAfter and instantly clicked over our shared love for classical music and travel. The journey from our first conversation to our wedding day felt incredibly natural and meant to be. We are so grateful for this platform.',
    photo: P + 'AB6AXuBvMsvTv7Y-CJGR0W6FxcXuL9Rvdc6lfpbrZsw2_YsC2Vzc5Hx09H_tWfQ0Alf5RU_uoM6irr0oBJVVij7lCWnhJiJd15zR1rLaPf9oJ14fgop5o8ye7-yy49NiGp6OFJ5Pg1og8mIxdYjb1nVST37BR4yC1yEzV6YfVT_nn55mgk49rjWju5FM-2iA_I7rF6hXqyLVj1qgGSw9ezOLH-7r0ZtKBF0eMN_Xnc648C32Z-XccKCzKgO9tqJUMxFdHsc7eYxoci1Uzaao',
  },
  {
    id: 's2',
    couple: 'Priya & Vikram',
    rating: 5,
    quote:
      'I was skeptical about online matchmaking until I found EverAfter. The detailed profiles helped me find someone who truly aligned with my values. Meeting Vikram changed my life forever.',
    photo: P + 'AB6AXuBmdxb9SZF3fJPRNF4Z7w9HLmseiZcvVRpAM2R0FsgzkVxEOs7LcCUig-QEAFAbEo3repteQ_dwY_-xNIpyi7IHX9nX5baB188KzfQZqDM28t1lWeASelnXxFKaNxTo8yMxM71dmuA4K4wl2LNLuWKs3Zt33GN8zYkUq3aqsDJb0JIUUmI6J2YGkskZYbUWCBFNCHbqx5x6ITCwDWmJ_N-1VIZDO14jqfVb2_ZeTeNDJ6B8qWyYgD26lki1UEweO9MPgC7N_tN5OLY3',
  },
  {
    id: 's3',
    couple: 'Aditya & Sneha',
    rating: 5,
    quote:
      'Both our families were involved from the very first conversation, which is exactly what we wanted. Three months later we were engaged, surrounded by everyone we love.',
    photo: P + 'AB6AXuDnp6Ddkwkj_UrTvVlynbOJ1nOUFJ4HprjUGIAkAtzrGGRpwDogp5k34Q8eADyfTbWS81-lZfjwXQ4Gq6hYn9G7mFyjc54FHo0z_HOZ4o5N273S7IS_ZX9xUZ3zWBtoRgd8-z1baJCE9VVGJXnTmz5ovP2ucGuIQ8_KtzB6QqmkkyevWAxuxP58VFHH2PCZanfa6sFGRIjMFosF3G0agMvrcYfYakdGdL_Lf8exzLt3VRxmgR2JFijhAjATJa3Ar2NW4tk_UAyJRTN-',
  },
];

export const storyMedia = {
  video: P + 'AB6AXuBVE0W9oSFf5fkQSWiY3DS9yRRPuev3kDqxxoj1u1k2eo1j4m73MAU9crttcWUp3JVMZk-Lg8i_EJ05f702a0TJ0t2BPTzmN3w9l1X3qxCsreP5X-kY2Lnk52j5u8HK74InvHbZtKAQ4GTuLHHTH95pyZ5Ch2Qpf3itiOoQd46ZYXArblfhl0JYCGhjcwlEJ6_ufvFVGDC52H3LfaQolHxyKNjhOKa30_VHFRJzcptUXNk3R6JFJ6HDSYRKuafXYVrmCdwEAk34wnfT',
  app: P + 'AB6AXuBvuuMQwlncC1FnOYwaAyGnPHsjyb2lPPfDPA3LWk1pBNGUIMH69lsJYSvf2KjRsdsvPMTVTTIxsngsGPxamCbCqfO097iZu21uYtMxXiko158_qtibjBB5m-haWhr6J8ttD1uHtF5xsRloZK10GmXB5eN6giinMR1UYmsxJHnW2iYiggXmCjbz5_RvXEngZNiAwpcmiwhL22P9fJjoPl3Dfz8LWOlRHFT34jXyX19p7aAccMrq_6wGRGvb81Tmo1mu2Noair91gK4B',
};

// Amounts are in paise, the unit Razorpay expects.
export const plans = [
  {
    id: 'silver',
    name: 'Silver',
    duration: '3 Months',
    amount: 249900,
    currency: 'INR',
    highlight: false,
    features: [
      'Send up to 50 interests',
      'View verified contact details',
      'Standard profile placement',
      'Email support',
    ],
  },
  {
    id: 'gold',
    name: 'Gold',
    duration: '6 Months',
    amount: 449900,
    currency: 'INR',
    highlight: true,
    features: [
      'Unlimited interests',
      'View verified contact details',
      'Priority profile placement',
      'Chat with premium members',
      'Dedicated relationship advisor',
    ],
  },
  {
    id: 'platinum',
    name: 'Platinum',
    duration: '12 Months',
    amount: 749900,
    currency: 'INR',
    highlight: false,
    features: [
      'Everything in Gold',
      'Featured profile badge',
      'Handpicked matches every week',
      'Personalised matchmaking calls',
      '24x7 priority support',
    ],
  },
];
