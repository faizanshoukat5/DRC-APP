import React, { forwardRef } from 'react';
import { TextInput, TextInputProps, View, Text } from 'react-native';
import { cn } from '../../lib/utils';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ className, label, error, containerClassName, ...props }, ref) => {
    return (
      <View className={cn('w-full', containerClassName)}>
        {label && (
          <Text className="mb-1.5 text-sm font-medium text-foreground">{label}</Text>
        )}
        <TextInput
          ref={ref}
          className={cn(
            'h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground',
            error && 'border-red-500',
            className
          )}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {error && (
          <Text className="mt-1 text-sm text-red-500">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
