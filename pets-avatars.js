// Shared pet-avatar markup for the static CRM pages.
// Import this from each page module; it does not touch Firebase.

export const DEFAULT_PET_PHOTO = "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=150&h=150&fit=crop";

// Kanban, table, and list rows stay narrow: show this many faces, then a +K badge.
export const DENSE_AVATAR_LIMIT = 3;

export function escAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function petPhotoSrc(pet) {
  const url = pet && typeof pet.photoUrl === "string" ? pet.photoUrl.trim() : "";
  return url || DEFAULT_PET_PHOTO;
}

export function petPreviewSrc(url) {
  const clean = typeof url === "string" ? url.trim() : "";
  return clean || DEFAULT_PET_PHOTO;
}

// maxVisible omitted or 0 shows every pet. A positive cap adds a +K badge after the first faces.
export function renderPetAvatars(pets, {
  sizeClass = "w-8 h-8",
  singleClass = "",
  overlapClass = "-ml-3",
  ringClass = "ring-2 ring-white dark:ring-pm-dark-surface",
  maxVisible = 0
} = {}) {
  const list = pets && pets.length ? pets : [{ name: "", photoUrl: "" }];
  if (list.length === 1) {
    return `<img src="${escAttr(petPhotoSrc(list[0]))}" alt="${escAttr(list[0].name || "")}" class="${sizeClass} rounded-full object-cover shrink-0 ${singleClass}">`;
  }

  const limit = maxVisible > 0 ? Math.min(maxVisible, list.length) : list.length;
  const visible = list.slice(0, limit);
  const extra = list.length - visible.length;
  const hiddenNames = list.slice(limit).map((p) => p.name).filter(Boolean).join(", ");

  const imgs = visible.map((p, i) => {
    const overlap = i > 0 ? overlapClass : "";
    const z = visible.length - i + (extra > 0 ? 1 : 0);
    return `<img src="${escAttr(petPhotoSrc(p))}" alt="${escAttr(p.name || "")}" title="${escAttr(p.name || "")}" class="${sizeClass} rounded-full object-cover relative shrink-0 ${ringClass} ${overlap}" style="z-index:${z};">`;
  }).join("");

  const badge = extra > 0
    ? `<span class="${sizeClass} rounded-full bg-gray-100 dark:bg-[#1A211D] text-gray-500 dark:text-gray-400 text-[9px] font-bold leading-none flex items-center justify-center relative shrink-0 ${ringClass} ${overlapClass}" style="z-index:${visible.length + 2};" title="${escAttr(hiddenNames)}">+${extra}</span>`
    : "";

  return `<div class="flex items-center shrink-0">${imgs}${badge}</div>`;
}
