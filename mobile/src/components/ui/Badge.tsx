import React from 'react';
import { View, Text } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'rounded-full px-2.5 py-0.5',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        secondary: 'bg-secondary',
        destructive: 'bg-red-500',
        outline: 'border border-border bg-transparent',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const textVariants = cva(
  'text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        secondary: 'text-secondary-foreground',
        destructive: 'text-white',
        outline: 'text-foreground',
        success: 'text-white',
        warning: 'text-white',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  className?: string;
  children: React.ReactNode;
}

export function Badge({ className, variant, children }: BadgeProps) {
  return (
    <View className={cn(badgeVariants({ variant }), className)}>
      <Text className={textVariants({ variant })}>{children}</Text>
    </View>
  );
}
