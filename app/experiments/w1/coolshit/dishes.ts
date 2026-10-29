// The menu. Each dish has a photo, where to get it, and tags.
// Tags are what the mood box matches: meal time, country, kind of food.
// Places are KAIST main campus cafeterias and nearby Daejeon spots — edit freely.

export type Dish = {
  name: string;
  ko: string;
  photo: string; // file in public/experiments/w1/coolshit/
  where: string;
  tags: string[];
};

export const DISHES: Dish[] = [
  // Korean
  { name: "Bibimbap", ko: "비빔밥", photo: "bibimbap.jpg", where: "West Cafeteria (W2)", tags: ["korean", "lunch", "rice", "vegetarian"] },
  { name: "Kimchi Jjigae", ko: "김치찌개", photo: "kimchi-jjigae.jpg", where: "KAIMARU (N11)", tags: ["korean", "lunch", "dinner", "soup", "spicy"] },
  { name: "Jeyuk Bokkeum", ko: "제육볶음", photo: "jeyuk-bokkeum.jpg", where: "East Cafeteria (E5)", tags: ["korean", "lunch", "dinner", "rice", "spicy"] },
  { name: "Tteokbokki", ko: "떡볶이", photo: "tteokbokki.jpg", where: "KAIMARU (N11)", tags: ["korean", "snack", "late-night", "spicy"] },
  { name: "Kimbap", ko: "김밥", photo: "kimbap.jpg", where: "KAIMARU (N11)", tags: ["korean", "breakfast", "lunch", "snack"] },
  { name: "Sundubu Jjigae", ko: "순두부찌개", photo: "sundubu-jjigae.jpg", where: "West Cafeteria (W2)", tags: ["korean", "dinner", "soup", "spicy"] },
  { name: "Bulgogi Rice", ko: "불고기덮밥", photo: "bulgogi-rice.jpg", where: "East Cafeteria (E5)", tags: ["korean", "lunch", "rice"] },
  { name: "Dakgalbi", ko: "닭갈비", photo: "dakgalbi.jpg", where: "Eoeun-dong", tags: ["korean", "dinner", "spicy"] },
  { name: "Dubu Duruchigi", ko: "두부두루치기", photo: "dubu-duruchigi.jpg", where: "Daejeon local spot", tags: ["korean", "daejeon", "dinner", "spicy", "vegetarian"] },
  { name: "Kalguksu", ko: "칼국수", photo: "kalguksu.jpg", where: "Daejeon local spot", tags: ["korean", "daejeon", "lunch", "noodle", "soup"] },
  { name: "Naengmyeon", ko: "냉면", photo: "naengmyeon.jpg", where: "Gung-dong", tags: ["korean", "lunch", "noodle", "summer"] },
  { name: "Ramyeon", ko: "라면", photo: "ramyeon.jpg", where: "Campus convenience store", tags: ["korean", "late-night", "noodle", "spicy"] },
  { name: "Korean Fried Chicken", ko: "치킨", photo: "korean-fried-chicken.jpg", where: "Gung-dong", tags: ["korean", "dinner", "late-night"] },
  { name: "Juk (Rice Porridge)", ko: "죽", photo: "juk.jpg", where: "Eoeun-dong", tags: ["korean", "breakfast", "light", "soup"] },

  // Chinese
  { name: "Jjajangmyeon", ko: "짜장면", photo: "jjajangmyeon.jpg", where: "KAIMARU (N11)", tags: ["chinese", "lunch", "noodle"] },
  { name: "Jjamppong", ko: "짬뽕", photo: "jjamppong.jpg", where: "KAIMARU (N11)", tags: ["chinese", "lunch", "dinner", "noodle", "soup", "spicy"] },
  { name: "Tangsuyuk", ko: "탕수육", photo: "tangsuyuk.jpg", where: "Eoeun-dong", tags: ["chinese", "dinner"] },
  { name: "Mapo Tofu Rice", ko: "마파두부밥", photo: "mapo-tofu-rice.jpg", where: "West Cafeteria (W2)", tags: ["chinese", "lunch", "rice", "spicy"] },
  { name: "Malatang", ko: "마라탕", photo: "malatang.jpg", where: "Gung-dong", tags: ["chinese", "dinner", "soup", "spicy"] },
  { name: "Fried Rice", ko: "볶음밥", photo: "fried-rice.jpg", where: "KAIMARU (N11)", tags: ["chinese", "lunch", "rice"] },
  { name: "Dumplings", ko: "만두", photo: "dumplings.jpg", where: "Eoeun-dong", tags: ["chinese", "snack", "late-night"] },

  // Japanese
  { name: "Ramen", ko: "라멘", photo: "ramen.jpg", where: "Eoeun-dong", tags: ["japanese", "dinner", "noodle", "soup"] },
  { name: "Udon", ko: "우동", photo: "udon.jpg", where: "KAIMARU (N11)", tags: ["japanese", "lunch", "noodle", "soup", "light"] },
  { name: "Gyudon", ko: "규동", photo: "gyudon.jpg", where: "KAIMARU (N11)", tags: ["japanese", "lunch", "rice"] },
  { name: "Katsu Curry", ko: "카츠카레", photo: "katsu-curry.jpg", where: "East Cafeteria (E5)", tags: ["japanese", "lunch", "dinner", "rice"] },
  { name: "Sushi", ko: "초밥", photo: "sushi.jpg", where: "Gung-dong", tags: ["japanese", "dinner", "light"] },
  { name: "Donkatsu", ko: "돈까스", photo: "donkatsu.jpg", where: "KAIMARU (N11)", tags: ["japanese", "korean", "lunch"] },

  // Southeast Asian / Indian
  { name: "Pho", ko: "쌀국수", photo: "pho.jpg", where: "Eoeun-dong", tags: ["vietnamese", "lunch", "noodle", "soup", "light"] },
  { name: "Banh Mi", ko: "반미", photo: "banh-mi.jpg", where: "Gung-dong", tags: ["vietnamese", "breakfast", "lunch"] },
  { name: "Pad Thai", ko: "팟타이", photo: "pad-thai.jpg", where: "Eoeun-dong", tags: ["thai", "lunch", "dinner", "noodle"] },
  { name: "Curry & Naan", ko: "커리와 난", photo: "curry-and-naan.jpg", where: "Eoeun-dong", tags: ["indian", "dinner", "spicy", "vegetarian"] },

  // Western
  { name: "Burger", ko: "버거", photo: "burger.jpg", where: "KAIMARU (N11)", tags: ["western", "american", "lunch", "late-night"] },
  { name: "Pizza", ko: "피자", photo: "pizza.jpg", where: "Gung-dong", tags: ["western", "italian", "dinner", "late-night"] },
  { name: "Pasta", ko: "파스타", photo: "pasta.jpg", where: "Eoeun-dong", tags: ["western", "italian", "dinner", "noodle"] },
  { name: "Sandwich", ko: "샌드위치", photo: "sandwich.jpg", where: "Campus café", tags: ["western", "breakfast", "lunch", "light"] },
  { name: "Egg Toast", ko: "토스트", photo: "egg-toast.jpg", where: "KAIMARU (N11)", tags: ["korean", "breakfast", "snack"] },
  { name: "Salad Bowl", ko: "샐러드", photo: "salad-bowl.jpg", where: "Campus café", tags: ["western", "lunch", "light", "vegetarian"] },

  // Mexican
  { name: "Tacos", ko: "타코", photo: "tacos.jpg", where: "Gung-dong", tags: ["mexican", "dinner", "spicy"] },
  { name: "Burrito", ko: "부리또", photo: "burrito.jpg", where: "Eoeun-dong", tags: ["mexican", "lunch"] },
  { name: "Quesadilla", ko: "퀘사디아", photo: "quesadilla.jpg", where: "Gung-dong", tags: ["mexican", "snack", "late-night"] },
  { name: "Nachos", ko: "나쵸", photo: "nachos.jpg", where: "Gung-dong", tags: ["mexican", "snack"] },

  // Dessert
  { name: "Twigim Soboro", ko: "튀김소보로", photo: "twigim-soboro.jpg", where: "Sungsimdang (Daejeon)", tags: ["dessert", "daejeon", "bakery", "breakfast"] },
  { name: "Bingsu", ko: "빙수", photo: "bingsu.jpg", where: "Eoeun-dong", tags: ["dessert", "summer"] },
  { name: "Croffle", ko: "크로플", photo: "croffle.jpg", where: "Campus café", tags: ["dessert", "cafe"] },
  { name: "Hotteok", ko: "호떡", photo: "hotteok.jpg", where: "Street stall", tags: ["dessert", "korean", "snack", "winter"] },
  { name: "Bungeoppang", ko: "붕어빵", photo: "bungeoppang.jpg", where: "Street stall", tags: ["dessert", "korean", "snack", "winter"] },
  { name: "Cheesecake", ko: "치즈케이크", photo: "cheesecake.jpg", where: "Campus café", tags: ["dessert", "cafe"] },
  { name: "Ice Cream", ko: "아이스크림", photo: "ice-cream.jpg", where: "Campus convenience store", tags: ["dessert", "summer"] },

  // Café
  { name: "Iced Americano", ko: "아이스 아메리카노", photo: "iced-americano.jpg", where: "Campus café", tags: ["cafe", "coffee", "breakfast"] },
  { name: "Café Latte", ko: "카페라떼", photo: "cafe-latte.jpg", where: "Campus café", tags: ["cafe", "coffee", "breakfast"] },
  { name: "Yuja Tea", ko: "유자차", photo: "yuja-tea.jpg", where: "Campus café", tags: ["cafe", "korean", "winter", "light"] },
  { name: "Strawberry Latte", ko: "딸기라떼", photo: "strawberry-latte.jpg", where: "Campus café", tags: ["cafe", "dessert"] },
];

// Words people type → the tag they mean.
export const ALIASES: Record<string, string> = {
  korea: "korean", 한식: "korean",
  china: "chinese", 중식: "chinese",
  japan: "japanese", 일식: "japanese",
  mexico: "mexican",
  america: "american", italy: "italian",
  vietnam: "vietnamese", thailand: "thai", india: "indian",
  coffee: "cafe", café: "cafe", 카페: "cafe",
  sweet: "dessert", 디저트: "dessert",
  night: "late-night", midnight: "late-night", 야식: "late-night",
  morning: "breakfast", 아침: "breakfast",
  noon: "lunch", 점심: "lunch",
  evening: "dinner", 저녁: "dinner",
  hot: "spicy", 매운: "spicy",
  noodles: "noodle", soupy: "soup", veggie: "vegetarian", vegan: "vegetarian",
};

// Quick-pick chips under the input.
export const MOODS = ["breakfast", "lunch", "dinner", "korean", "chinese", "japanese", "mexican", "spicy", "dessert", "cafe", "late-night"];
