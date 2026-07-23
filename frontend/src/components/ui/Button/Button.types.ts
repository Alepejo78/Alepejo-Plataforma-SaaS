import {
    ButtonHTMLAttributes,
    ReactNode,
  } from "react";
  
  export type ButtonVariant =
    | "primary"
    | "secondary"
    | "outline"
    | "ghost"
    | "danger"
    | "success";
  
  export type ButtonSize =
    | "sm"
    | "md"
    | "lg";
  
  export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement> {
  
    variant?: ButtonVariant;
  
    size?: ButtonSize;
  
    loading?: boolean;
  
    fullWidth?: boolean;
  
    leftIcon?: ReactNode;
  
    rightIcon?: ReactNode;
  
    children: ReactNode;
  }