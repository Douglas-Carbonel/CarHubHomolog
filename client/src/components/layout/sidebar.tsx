import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  Home,
  Users,
  Car,
  Wrench,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  ScanLine,
} from "lucide-react";

const getNavigation = (userRole: string | null) => {
  const baseNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      name: "Clientes",
      href: "/customers",
      icon: Users,
    },
    {
      name: "Veículos",
      href: "/vehicles",
      icon: Car,
    },
    {
      name: "Ordens de Serviço",
      href: "/services",
      icon: Wrench,
    },
    {
      name: "Agenda",
      href: "/schedule",
      icon: Calendar,
    },
    {
      name: "Notificações",
      href: "/notifications",
      icon: Bell,
    },
    {
      name: "Leitor de Placas",
      href: "/ocr-plate-reader",
      icon: ScanLine,
    },
  ];

  // Only administrators can access reports and admin panel
  if (userRole === "admin") {
    baseNavigation.push({
      name: "Relatórios",
      href: "/reports",
      icon: BarChart3,
    });
    baseNavigation.push({
      name: "Administração",
      href: "/admin",
      icon: Settings,
    });
  }

  return baseNavigation;
};

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Close mobile menu when switching to desktop
      if (!mobile) {
        setIsMobileOpen(false);
      }
    };

    // Force multiple checks on location change
    checkMobile();
    const timeouts = [
      setTimeout(checkMobile, 50),
      setTimeout(checkMobile, 200),
      setTimeout(checkMobile, 500),
    ];
    
    window.addEventListener('resize', checkMobile);
    
    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener('resize', checkMobile);
    };
  }, [location]);

  // Additional effect to ensure mobile state is properly maintained
  useEffect(() => {
    const mobile = window.innerWidth < 768;
    if (isMobile !== mobile) {
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
      }
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const navigation = getNavigation(user?.role || null);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-teal-700 via-emerald-800 to-teal-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-teal-600/50 bg-gradient-to-r from-teal-700 to-emerald-700">
        {(!isCollapsed || isMobile) && (
          <div className="flex items-center">
            <h1 className="text-2xl font-serif text-white tracking-tight leading-none">
              <span className="font-light italic">Car</span>
              <span className="font-bold ml-1">Hub</span>
            </h1>
          </div>
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-cyan-200 hover:text-white hover:bg-teal-600/50 rounded-lg transition-all duration-200"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left font-medium transition-all duration-200 rounded-xl border border-transparent",
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 text-cyan-100 border-cyan-400/30 shadow-lg"
                    : "text-teal-100 hover:bg-gradient-to-r hover:from-teal-600/40 hover:to-emerald-600/40 hover:text-white",
                  isCollapsed && !isMobile ? "px-2" : "px-4"
                )}
                onClick={() => isMobile && setIsMobileOpen(false)}
              >
                <item.icon className={cn("h-5 w-5", isCollapsed && !isMobile ? "" : "mr-3")} />
                {(!isCollapsed || isMobile) && item.name}
              </Button>
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-teal-600/50 bg-gradient-to-r from-teal-800 to-emerald-800">
        {(!isCollapsed || isMobile) && (
          <div className="mb-4 p-3 bg-teal-600/30 rounded-xl border border-cyan-400/20">
            <p className="text-sm font-medium text-cyan-100">
              {user?.firstName || user?.username}
            </p>
            <p className="text-xs text-teal-200">{user?.role || "Usuário"}</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full text-red-200 hover:text-white hover:bg-red-600/50 rounded-xl transition-all duration-200 border border-transparent hover:border-red-400/30",
            isCollapsed && !isMobile ? "px-2" : "justify-start px-4"
          )}
        >
          <LogOut className={cn("h-5 w-5", isCollapsed && !isMobile ? "" : "mr-3")} />
          {(!isCollapsed || isMobile) && "Sair"}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <SidebarContent />
          </SheetContent>
        </Sheet>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsMobileOpen(true)}
          className="fixed top-3 left-3 z-50 bg-teal-700 text-white hover:bg-teal-600 rounded-lg shadow-lg md:hidden p-2"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-teal-700 via-emerald-800 to-teal-900 text-white transition-all duration-300 shadow-2xl border-r border-teal-600",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-teal-600/50 bg-gradient-to-r from-teal-700 to-emerald-700">
        {!isCollapsed && (
          <div className="flex items-center">
            <h1 className="text-2xl font-serif text-white tracking-tight leading-none">
              <span className="font-light italic">Car</span>
              <span className="font-bold ml-1">Hub</span>
            </h1>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-cyan-200 hover:text-white hover:bg-teal-600/50 rounded-lg transition-all duration-200"
        >
          {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {getNavigation(user?.role || null).map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-left text-cyan-200 hover:text-white hover:bg-teal-600/50 rounded-lg transition-all duration-200 font-medium",
                  isActive && "bg-gradient-to-r from-emerald-400 to-cyan-400 text-teal-900 shadow-lg font-semibold",
                  isCollapsed && "px-2"
                )}
              >
                <item.icon className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                {!isCollapsed && item.name}
              </Button>
            </Link>
          );
        })}

      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-teal-600/50 bg-gradient-to-r from-emerald-800 to-teal-900">
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className={cn(
            "w-full justify-start text-cyan-200 hover:text-white hover:bg-red-600/80 disabled:opacity-50 rounded-lg transition-all duration-200 font-medium border border-red-300/30 hover:border-red-400/60",
            isCollapsed && "px-2"
          )}
        >
          <LogOut className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
          {!isCollapsed && (logoutMutation.isPending ? "Saindo..." : "Sair")}
        </Button>
      </div>
    </div>
  );
}