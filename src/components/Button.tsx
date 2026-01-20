import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { Theme } from '@constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  icon,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? Theme.colors.primary : Theme.colors.white} />
      ) : (
        <>
          {icon}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
    ...Theme.shadow.sm,
  },

  // Variants
  primary: {
    backgroundColor: Theme.colors.primary,
  },
  secondary: {
    backgroundColor: Theme.colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: Theme.borderWidth.base,
    borderColor: Theme.colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Sizes
  size_sm: {
    height: Theme.buttonHeight.sm,
    paddingHorizontal: Theme.spacing.md,
  },
  size_md: {
    height: Theme.buttonHeight.md,
    paddingHorizontal: Theme.spacing.lg,
  },
  size_lg: {
    height: Theme.buttonHeight.lg,
    paddingHorizontal: Theme.spacing.xl,
  },

  // Text
  text: {
    fontWeight: Theme.fontWeight.semibold,
    textAlign: 'center',
  },
  text_primary: {
    color: Theme.colors.white,
  },
  text_secondary: {
    color: Theme.colors.white,
  },
  text_outline: {
    color: Theme.colors.primary,
  },
  text_ghost: {
    color: Theme.colors.text,
  },
  text_sm: {
    fontSize: Theme.fontSize.sm,
  },
  text_md: {
    fontSize: Theme.fontSize.base,
  },
  text_lg: {
    fontSize: Theme.fontSize.lg,
  },

  // States
  disabled: {
    opacity: 0.5,
  },
  textDisabled: {
    color: Theme.colors.textDisabled,
  },
});
