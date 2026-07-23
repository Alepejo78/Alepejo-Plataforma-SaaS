"use client";

import { useState } from "react";

import {

Menu,
LayoutDashboard,
Wallet,
Package,
ShoppingCart,
Settings,
Moon,
Sun

} from "lucide-react";

import { useTheme } from "next-themes";

export default function MainLayout({

children

}:{

children:React.ReactNode

}){

const [collapsed,setCollapsed]=useState(false);

const {theme,setTheme}=useTheme();

return(

<div className="flex min-h-screen bg-white dark:bg-black">

<aside
className={`

border-r
transition-all
duration-300

${collapsed ? "w-20":"w-64"}

bg-black
text-white

`}
>

<div className="flex items-center justify-between p-4">

<button
onClick={()=>setCollapsed(!collapsed)}
>

<Menu/>

</button>

</div>


<nav className="mt-8 space-y-2">


<MenuItem
icon={<LayoutDashboard size={20}/>}
label="Dashboard"
collapsed={collapsed}
/>


<MenuItem
icon={<Wallet size={20}/>}
label="Financeiro"
collapsed={collapsed}
/>


<MenuItem
icon={<Package size={20}/>}
label="Estoque"
collapsed={collapsed}
/>


<MenuItem
icon={<ShoppingCart size={20}/>}
label="Comercial"
collapsed={collapsed}
/>


<MenuItem
icon={<Settings size={20}/>}
label="Configurações"
collapsed={collapsed}
/>


</nav>

</aside>



<div className="flex-1">


<header className="h-16 border-b flex items-center justify-end px-6">

<button
onClick={()=>setTheme(theme==="dark"?"light":"dark")}
>

{theme==="dark"

?

<Sun/>

:

<Moon/>

}

</button>

</header>



<main className="p-6">

{children}

</main>


</div>

</div>

)

}



function MenuItem({

icon,
label,
collapsed

}:any){

return(

<div

className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 cursor-pointer"

>

{icon}

{!collapsed && label}

</div>

)

}