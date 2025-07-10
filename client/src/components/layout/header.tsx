import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Bell, Settings } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <header className={cn(
      "bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-xl border-b border-teal-500/30",
      isMobile ? "px-3 py-3" : "px-8 py-6"
    )}>
      <div className="flex items-center justify-between">
        <div className={cn(
          "flex-1",
          isMobile ? "ml-12" : "space-y-2"
        )}>
          <h1 className={cn(
            "font-bold text-white leading-tight",
            isMobile ? "text-lg" : "text-3xl"
          )}>
            {title}
          </h1>
          {subtitle && !isMobile && (
            <p className="text-teal-100 font-medium text-lg">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!isMobile && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-100 hover:text-white hover:bg-teal-600/50 border-0"
              >
                <Bell className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="text-teal-100 hover:text-white hover:bg-teal-600/50 border-0"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </>
          )}

          <div className="flex items-center space-x-2">
            <Avatar className={cn(
              "border-2 border-teal-300/50",
              isMobile ? "h-7 w-7" : "h-10 w-10"
            )}>
              <AvatarFallback className="bg-teal-500 text-white font-semibold text-sm">
                {user?.firstName?.[0] || user?.username?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>

            {!isMobile && (
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-teal-200">
                  {user?.role === 'admin' ? 'Administrador' : 'Usuário'}
                </p>
              </div>
            )}

            <Button
              onClick={logout}
              variant="ghost"
              size="sm"
              className={cn(
                "text-teal-100 hover:text-white hover:bg-red-600/20 border-0",
                isMobile ? "p-1.5" : "px-3 py-2"
              )}
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
              {!isMobile && <span className="ml-2">Sair</span>}
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}