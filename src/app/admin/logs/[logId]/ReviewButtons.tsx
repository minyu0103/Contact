"use client";

export function ReviewButtons() {
  return <button type="submit" name="intent" value="reject" className="btn btn-danger" onClick={(e) => { if (!confirm("반려할까요? 지급한 보수가 있으면 회수됩니다.")) e.preventDefault(); }}>반려</button>;
}
