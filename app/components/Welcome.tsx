import Link from "next/link";

export function Welcome() {
  return (
    <main className="min-h-screen bg-[#f5f6fb] text-[#20233e]">
      <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-6">
        <Link href="/" className="flex items-center gap-3 font-bold text-xl"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#7564e8] text-white">N</span>Núcleo Digital</Link>
        <Link href="/login" className="rounded-xl bg-[#171b36] px-5 py-3 text-sm font-semibold text-white">Iniciar sesión</Link>
      </header>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div><p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#6554cf]">Sistema de restaurante</p><h1 className="text-4xl font-bold tracking-tight sm:text-6xl">Tu restaurante, conectado.</h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-[#52617e]">Consulta el menú, realiza pedidos para llevar y accede a las herramientas de gestión del restaurante desde un solo lugar.</p><div className="mt-8 flex flex-wrap gap-3"><Link href="/login" className="rounded-xl bg-[#6554cf] px-6 py-3 font-semibold text-white hover:bg-[#5141b5]">Iniciar sesión</Link><Link href="/registro" className="rounded-xl border border-[#6554cf] px-6 py-3 font-semibold text-[#5141b5]">Crear cuenta</Link></div></div>
        <div className="rounded-3xl bg-[#171b36] p-8 text-white shadow-xl"><p className="text-sm font-semibold text-[#bcb3ff]">NÚCLEO DIGITAL</p><h2 className="mt-4 text-2xl font-bold">Todo en un mismo sistema</h2><div className="mt-7 grid gap-3">{[["01","Menú digital","Explora platillos y categorías."],["02","Pedidos para llevar","Registra tus pedidos desde tu cuenta."],["03","Gestión del restaurante","Herramientas para el personal autorizado."]].map(([n,title,description])=><div key={n} className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"><span className="font-bold text-[#bcb3ff]">{n}</span><div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-slate-300">{description}</p></div></div>)}</div></div>
      </section>
      <footer className="mx-auto max-w-6xl border-t border-slate-200 px-6 py-6 text-sm text-[#52617e]">Núcleo Digital · Sistema de restaurante</footer>
    </main>
  );
}
