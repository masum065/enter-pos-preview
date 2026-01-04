import darkLogo from "@/assets/logos/dark.svg";
import logo from "@/assets/logos/main.svg";
import Image from "next/image";

export function Logo() {
  return (
    <div className="relative h-8 max-w-[10.847rem]">

      <h2 className='font-black text-3xl tracking-wide select-none'>
        <span className='bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent drop-shadow-sm'>
          Enter
        </span>
        <span className='ml-1.5 bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent'>
          POS
        </span>
      </h2>
      {/* <Imagexww
        src={logo}
        fill
        className="dark:hidden"
        alt="NextAdmin logo"
        role="presentation"
        quality={100}
      /> */}

      {/* <Image
        src={darkLogo}
        fill
        className="hidden dark:block"
        alt="NextAdmin logo"
        role="presentation"
        quality={100}
      /> */}
    </div>
  );
}
