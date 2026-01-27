import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSeverityColor(severity: string): string {
  switch (severity?.toLowerCase()) {
    case 'mild':
      return 'bg-yellow-500';
    case 'moderate':
      return 'bg-orange-500';
    case 'severe':
      return 'bg-red-500';
    case 'normal':
    case 'healthy':
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
}

export function getSeverityBadgeVariant(severity: string): 'success' | 'warning' | 'destructive' | 'secondary' {
  switch (severity?.toLowerCase()) {
    case 'mild':
      return 'warning';
    case 'moderate':
    case 'severe':
      return 'destructive';
    case 'normal':
    case 'healthy':
      return 'success';
    default:
      return 'secondary';
  }
}
