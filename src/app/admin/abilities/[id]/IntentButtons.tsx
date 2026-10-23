"use client";

/** 승인 / 반려 버튼. 같은 폼을 intent 값만 달리해 제출한다. */
export function IntentButtons() {
  return (
    <>
      <button type="submit" name="intent" value="approve" className="btn btn-primary">승인 (활성)</button>
      <button type="submit" name="intent" value="return" className="btn btn-danger" onClick={(e) => { if (!confirm("반려할까요? 유저에게 코멘트가 표시되고 상태가 '반려'로 바뀝니다.")) e.preventDefault(); }}>반려</button>
    </>
  );
}
