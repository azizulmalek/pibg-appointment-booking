import Image from "next/image";
import { cn } from "@/lib/utils";

type SchoolLogoProps = {
  className?: string;
  size?: number;
};

export function SchoolLogo({ className, size = 40 }: SchoolLogoProps) {
  return (
    <Image
      src="/school-logo.png"
      alt="Logo Sekolah Kebangsaan Kementah"
      width={size}
      height={size}
      className={cn("object-contain", className)}
      priority
    />
  );
}
