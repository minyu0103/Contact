"use client";

/** 확인 창을 거쳐 제출하는 버튼. 부모 form의 action을 그대로 쓰거나 formAction으로 다른 액션을 지정한다. */
export function ConfirmSubmit({ message, children, className = "btn btn-danger btn-sm", formAction, name, value }: {
  message: string;
  children: React.ReactNode;
  className?: string;
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      formAction={formAction}
      name={name}
      value={value}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
