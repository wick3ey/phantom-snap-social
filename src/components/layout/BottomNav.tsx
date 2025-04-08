
import { useLocation, Link } from "react-router-dom";
import { Home, User, Camera, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const BottomNav = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  
  const navItems = [
    {
      name: "Home",
      path: "/",
      icon: Home,
    },
    {
      name: "Snap",
      path: "/snap",
      icon: Camera,
    },
    {
      name: "Chat",
      path: "/chat",
      icon: MessageSquare,
    },
    {
      name: "Profile",
      path: "/profile",
      icon: User,
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-secondary px-4 backdrop-blur-lg border-t border-secondary">
      <div className="flex h-full items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === currentPath || 
            (item.path !== '/' && currentPath.startsWith(item.path));
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={cn(
                "flex h-full w-1/4 flex-col items-center justify-center text-xs",
                isActive ? "text-solana-green" : "text-muted-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 mb-1",
                  isActive && "text-solana-green"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
