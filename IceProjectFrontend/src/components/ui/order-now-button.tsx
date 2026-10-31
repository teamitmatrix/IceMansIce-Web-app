"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OrderNowButtonProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  onClick?: () => void;
}

export function OrderNowButton({ 
  children, 
  className, 
  variant = "default", 
  size = "default",
  onClick,
  ...props 
}: OrderNowButtonProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if user has a token in cookies
    const checkAuth = () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('token='))
        ?.split('=')[1];
      
      setIsAuthenticated(!!token);
    };

    checkAuth();
  }, []);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    if (isAuthenticated === null) {
      // Still checking authentication, wait a moment
      setTimeout(() => {
        if (isAuthenticated === false) {
          router.push('/login');
        } else if (isAuthenticated === true) {
          // Redirect to appropriate dashboard based on role
          // The middleware will handle the role-based routing
          router.push('/dashboard');
        }
      }, 100);
      return;
    }

    if (isAuthenticated) {
      // User is authenticated, redirect to dashboard
      // The middleware will handle role-based routing
      router.push('/dashboard');
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      {children}
    </Button>
  );
}

