import { Home, Image, LayoutGrid, Images, Users } from "lucide-react";

const navItems = [
  { icon: Home, label: "Principal", active: true },
  { icon: Image, label: "Fotos Reais", active: false },
  { icon: LayoutGrid, label: "Explorar", active: false },
  { icon: Images, label: "Meus Cartões", active: false },
  { icon: Users, label: "Pais", active: false },
];

const BottomNav = () => (
  <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
    <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
      {navItems.map((item) => (
        <button
          key={item.label}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
            item.active
              ? "text-primary"
              : "text-muted-foreground"
          }`}
        >
          <item.icon className="w-5 h-5" />
          <span className="text-[10px] font-semibold">{item.label}</span>
        </button>
      ))}
    </div>
  </nav>
);

export default BottomNav;
