"use client";

import { useActionState } from "react";
import { createCharacterAction } from "./actions";
import { SubmitButton } from "@/components/SubmitButton";

const CATEGORIES = [
  { value: "COMBAT", label: "전투형", desc: "이계 생물과 주인을 토벌합니다. 전투 판정에 보정." },
  { value: "SEARCH", label: "탐색형", desc: "이계 구조를 파악하고 숨겨진 구역과 단서를 찾습니다. 탐색 판정에 보정." },
  { value: "PRODUCTION", label: "생산형", desc: "인자 추출, 조합, 장비 제작에 특권. (제작 기능은 추후 개방)" },
  { value: "SPECIAL", label: "특수형", desc: "위 셋에 속하지 않는 독창적인 능력. 보정 종류는 운영자가 정합니다." },
];

export function CreateCharacterForm() {
  const [state, action] = useActionState(createCharacterAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="name">이름</label>
        <input id="name" name="name" className="input" placeholder="프로그램에 표시될 이름" maxLength={20} required />
      </div>
      <div className="field">
        <label htmlFor="image">프로필 이미지 (선택)</label>
        <input id="image" name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="input text-sm file:mr-3 file:border-0 file:bg-bg-3 file:px-2 file:py-1 file:text-xs file:text-fg" />
        <p className="help">PNG, JPG, WEBP, GIF. 3MB 이하.</p>
      </div>
      <fieldset className="field">
        <legend className="field-label mb-2">능력 카테고리</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {CATEGORIES.map((c) => (
            <label key={c.value} className="flex cursor-pointer gap-2 border border-line bg-bg p-3 has-[:checked]:border-accent-2 has-[:checked]:bg-accent-dim">
              <input type="radio" name="category" value={c.value} className="mt-1 accent-[var(--accent)]" required />
              <span>
                <span className="block text-sm font-semibold">{c.label}</span>
                <span className="help">{c.desc}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="field">
        <label htmlFor="abilityName">능력 이름</label>
        <input id="abilityName" name="abilityName" className="input" placeholder="예: 역류" maxLength={40} required />
      </div>
      <div className="field">
        <label htmlFor="abilityDesc">능력 서술</label>
        <textarea id="abilityDesc" name="abilityDesc" className="textarea" placeholder="능력이 무엇을 할 수 있고, 어떤 한계가 있는지 자유롭게 적어 주세요. 롤플레이에 그대로 쓰이며, 운영자가 심사 후 시스템 효과를 정합니다." maxLength={3000} required />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      <SubmitButton pendingText="등록 중...">등록하고 심사 요청</SubmitButton>
    </form>
  );
}
