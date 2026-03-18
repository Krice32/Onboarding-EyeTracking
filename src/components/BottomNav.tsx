import { Home, Image, LayoutGrid, Images, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "Principal", active: true, path: "/?screen=app" },
  { icon: Image, label: "Fotos Reais", active: false },
  { icon: LayoutGrid, label: "Explorar", active: false },
  { icon: Images, label: "Meus Cartoes", active: false },
  { icon: Users, label: "Pais", active: false },
];

const BottomNav = () => {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
      <div className="flex justify-around items-center py-3 px-2 max-w-lg mx-auto">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={() => item.path && navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl min-w-[4.6rem] min-h-[4rem] sm:min-w-[5.2rem] sm:min-h-[4.3rem] transition-colors ${
              item.active ? "text-primary" : "text-muted-foreground"
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
