/**
 * PageHeader ─ ページヘッダ（タイトル + 補足）。
 * 装飾を排した作業画面向け。accent/danger は使わない。
 */
type PageHeaderProps = {
  title: string;
  subtitle: string;
};

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header className="border-b border-border pb-6">
      <h1 className="text-page-title leading-tight font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-2 text-meta text-muted">{subtitle}</p>}
    </header>
  );
}
