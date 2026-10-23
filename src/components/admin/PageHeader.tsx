import Link from "next/link";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } }) {
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {description && <p className="help mt-1">{description}</p>}
      </div>
      {action && <Link href={action.href} className="btn btn-primary btn-sm ml-auto">{action.label}</Link>}
    </div>
  );
}
