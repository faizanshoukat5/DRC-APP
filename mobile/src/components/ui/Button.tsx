import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'flex-row items-center justify-center rounded-lg',
  {
    variants: {
      variant: {
        default: 'bg-primary',
        destructive: 'bg-red-500',
        outline: 'border border-input bg-transparent',
        secondary: 'bg-secondary',
        ghost: 'bg-transparent',
        link: 'bg-transparent',
      },
      size: {
        default: 'h-12 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-14 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const textVariants = cva(
  'font-medium text-center',
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-white',
        outline: 'text-foreground',
        secondary: 'text-secondary-foreground',
        ghost: 'text-foreground',
        link: 'text-primary underline',
      },
      size: {
        default: 'text-base',
        sm: 'text-sm',
        lg: 'text-lg',
        icon: 'text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  className,
  variant,
  size,
  isLoading,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <TouchableOpacity
      className={cn(
        buttonVariants({ variant, size }),
        disabled && 'opacity-50',
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#0ea5e9' : '#fff'}
        />
      ) : typeof children === 'string' ? (
        <Text className={cn(textVariants({ variant, size }))}>{children}</Text>
      ) : (
        children
      )}
    </TouchableOpacity>
  );
}
