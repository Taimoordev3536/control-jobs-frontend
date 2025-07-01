import React, { useState } from "react";

type IconSwapButtonProps = {
  Icon1: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  Icon2: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  className?: string;
  [key: string]: any; // for other button props
};

export function IconSwapButton({ Icon1, Icon2, className = "", ...props }: IconSwapButtonProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      {...props}
      className={className}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered ? <Icon2 className="w-5 h-5" /> : <Icon1 className="w-5 h-5" />}
    </button>
  );
} 