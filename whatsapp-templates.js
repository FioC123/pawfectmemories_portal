export const DEFAULT_WHATSAPP_TEMPLATES = {
  reminder: "哈囉 {name}！聽日 {date} 見，地點：{location}。",
  pick_photos: "哈囉 {name}！{pets} 嘅相可以揀啦：{link}",
  finished: "哈囉 {name}！{pets} 嘅相片已完成：{link}",
  balance: "哈囉 {name}！尾數 HK$ {balance} 未收。"
};

export function resolveWhatsAppTemplates(stored) {
  const source = stored && typeof stored === "object" ? stored : {};
  const resolved = { ...DEFAULT_WHATSAPP_TEMPLATES };
  for (const key of Object.keys(DEFAULT_WHATSAPP_TEMPLATES)) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) resolved[key] = value;
  }
  return resolved;
}
