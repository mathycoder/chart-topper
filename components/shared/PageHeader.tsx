import { Card } from './Card';

interface PageHeaderProps {
  title: string;
  description: string;
}

/**
 * Shared page header component with title and description.
 */
export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <Card>
      <h1 className="text-xl font-bold text-cream">{title}</h1>
      <p className="text-cream-muted text-sm mt-1">{description}</p>
    </Card>
  );
}
