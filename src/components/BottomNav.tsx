import { Home, Image, LayoutGrid, Images, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Principal", path: "/?screen=app" },
  { icon: Image, label: "Fotos Reais" },
  { icon: LayoutGrid, label: "Explorar", path: "/explorar" },
  { icon: Images, label: "Meus Cartões" },
  { icon: Users, label: "Pais" },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (label: string) => {
    if (label === "Principal") {
      return location.pathname === "/" || location.pathname.startsWith("/categoria/");
    }

    if (label === "Explorar") {
      return location.pathname.startsWith("/explorar") || location.pathname.startsWith("/desafio/");
    }

    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
      <div className="flex justify-around items-center py-3 px-2 max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[4.6rem] min-h-[4rem] sm:min-w-[5.2rem] sm:min-h-[4.3rem] transition-colors ${
              isActive(item.label) ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <item.icon className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="text-[11px] sm:text-xs font-semibold">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
