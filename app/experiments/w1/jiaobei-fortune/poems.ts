// Fortune poems (籤詩). Placeholders written for this prototype, not from a real temple.
// Each line is seven characters, read top to bottom, right to left.

export type Poem = {
  number: string;
  luck: string;
  lines: string[];
  meaning: string;
};

export const POEMS: Poem[] = [
  {
    number: "第一籤",
    luck: "上上",
    lines: ["雲開月出照前川", "一葉輕舟順水還", "莫問前途多少事", "春風先到舊家山"],
    meaning: "所求順遂，貴人在旁。",
  },
  {
    number: "第七籤",
    luck: "中吉",
    lines: ["細雨經旬未肯晴", "耕夫猶自護苗青", "待得秋來禾滿圃", "方知辛苦有前程"],
    meaning: "先勞後得，耐心等待。",
  },
  {
    number: "第十二籤",
    luck: "上吉",
    lines: ["庭前老樹又生枝", "久旱逢霖正及時", "舊事莫愁新事好", "一門喜氣自然知"],
    meaning: "轉機已至，家宅平安。",
  },
  {
    number: "第二十籤",
    luck: "中平",
    lines: ["行到江心風浪多", "船頭且住莫高歌", "三更過後潮初定", "緩緩搖櫓過前坡"],
    meaning: "時機未到，宜守不宜進。",
  },
  {
    number: "第三十三籤",
    luck: "下",
    lines: ["鏡中花影水中月", "看似分明取不得", "勸君收拾心頭事", "明年再向東風說"],
    meaning: "所求虛浮，暫且放下。",
  },
  {
    number: "第四十五籤",
    luck: "上吉",
    lines: ["千里鴻雁一信來", "梅花先向雪中開", "功名不負讀書客", "好把文章上玉臺"],
    meaning: "學業考試大吉，努力必有回報。",
  },
];
