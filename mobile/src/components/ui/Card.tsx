import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native';
import { cn } from '../../lib/utils';

interface CardProps {
  className?: string;
  children: ReactNode;
}

export function Card({ className, children }: CardProps) {
  return (
    <View className={cn('rounded-xl border border-border bg-card p-4', className)}>
      {children}
    </View>
  );
}

interface CardHeaderProps {
  className?: string;
  children: ReactNode;
}

export function CardHeader({ className, children }: CardHeaderProps) {
  return (
    <View className={cn('mb-3', className)}>
      {children}
    </View>
  );
}

interface CardTitleProps {
  className?: string;
  children: ReactNode;
}

export function CardTitle({ className, children }: CardTitleProps) {
  return (
    <Text className={cn('text-lg font-semibold text-card-foreground', className)}>
      {children}
    </Text>
  );
}

interface CardDescriptionProps {
  className?: string;
  children: ReactNode;
}

export function CardDescription({ className, children }: CardDescriptionProps) {
  return (
    <Text className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </Text>
  );
}

interface CardContentProps {
  className?: string;
  children: ReactNode;
}

export function CardContent({ className, children }: CardContentProps) {
  return (
    <View className={cn('', className)}>
      {children}
    </View>
  );
}

interface CardFooterProps {
  className?: string;
  children: ReactNode;
}

export function CardFooter({ className, children }: CardFooterProps) {
  return (
    <View className={cn('mt-4 flex-row items-center', className)}>
      {children}
    </View>
  );
}

interface PressableCardProps extends TouchableOpacityProps {
  className?: string;
  children: ReactNode;
}

export function PressableCard({ className, children, ...props }: PressableCardProps) {
  return (
    <TouchableOpacity
      className={cn('rounded-xl border border-border bg-card p-4 active:opacity-80', className)}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
}
