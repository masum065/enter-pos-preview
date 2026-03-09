export interface ShopInfo {
  shopName: string;
  tagline: string;
  address: string;
  phone1: string;
  phone2: string;
  email: string;
  website: string;
  facebook: string;
  logo: string; // base64 or URL
  signature: string; // base64
  termsAndConditions: {
    label: string;
    text: string;
  }[];
  termsFooter: string;
}

export const DEFAULT_SHOP_INFO: ShopInfo = {
  shopName: "Enter Computers",
  tagline: "বেস্ট কোয়ালিটির প্রজেক্ট ইউজড ল্যাপটপ & মোবাইল এর বিশ্বস্ত প্রতিষ্ঠান",
  address: "অলকা নদী বাংলা কমপ্লেক্স ২য় তলা দোকান নং ২৩৮\nরাম বাবু রোড, গাংগিনারপার, সদর, ময়মনসিংহ।",
  phone1: "01789-443043",
  phone2: "01684-134574",
  email: "info@entercomputers.com.bd",
  website: "www.entercomputers.com.bd",
  facebook: "fb.com/entercomputersmym",
  logo: "/enter-logo.png",
  signature: "",
  termsAndConditions: [
    {
      label: "ল্যাপটপ ওয়ারেন্টি",
      text: "১০ দিনের রিপ্লেসমেন্ট গ্যারান্টি (শুধুমাত্র হার্ডওয়্যার সমস্যার জন্য)। ২ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। প্রয়োজনীয় পার্টস বা খুচরা যন্ত্রাংশের মূল্য গ্রাহককে বহন করতে হবে।",
    },
    {
      label: "মোবাইল ওয়ারেন্টি",
      text: "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি। ১ বছরের ফ্রি সার্ভিস ওয়ারেন্টি। মোবাইলের Display এবং Motherboard কোনো ওয়ারেন্টির অন্তর্ভুক্ত নয়।",
    },
    {
      label: "রিপ্লেসমেন্ট নীতি",
      text: "রিপ্লেসমেন্টের ক্ষেত্রে একই মডেলের ডিভাইস প্রদান করা হবে। স্টক না থাকলে আলোচনা সাপেক্ষে অন্য মডেল নির্বাচন করা যাবে।",
    },
    {
      label: "এক্সচেঞ্জ ও রিটার্ন",
      text: "ক্রয়ের ২ মাসের মধ্যে Exchange করলে নূন্যতম ২০% মূল্য কর্তন হবে। ক্রয়ের ২ মাসের মধ্যে Return করলে নূন্যতম ৩০% মূল্য কর্তন হবে। ডিভাইসের কন্ডিশন যাচাই করে চূড়ান্ত মূল্য নির্ধারণ করা হবে।",
    },
    {
      label: "ওয়ারেন্টি বাতিল",
      text: "ডিভাইসে Physical Damage / Scratch থাকে। পানি বা Liquid Damage হয়। শর্ট সার্কিট বা ভোল্টেজের সমস্যায় ক্ষতি হয়। ওয়ারেন্টি সিল বা স্টিকার নষ্ট করা হয়। অন্য কোনো টেকনিশিয়ান দ্বারা ডিভাইস খোলা হয়।",
    },
  ],
  termsFooter: "গুরুত্বপূর্ণ: ওয়ারেন্টি সুবিধা পেতে অরিজিনাল ক্যাশ মেমো/বিল অবশ্যই সংরক্ষণ করতে হবে।",
};
