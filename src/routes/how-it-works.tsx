import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "Cómo funciona — DakuBot" },
      {
        name: "description",
        content: "Cómo usar DakuBot para encontrar archimonstruos en Dofus Touch.",
      },
    ],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    k: "01",
    t: "Explora en vivo",
    d: "Entra a LIVE y mira qué archimonstruos están activos ahora mismo — se actualiza solo, al instante, cada vez que aparece uno nuevo.",
    to: "/live" as const,
    cta: "Ver en vivo",
  },
  {
    k: "02",
    t: "Consigue una licencia",
    d: "Únete a nuestro Discord para conseguir una licencia, o si ya tienes un código promocional, cánjealo tú mismo en REDEEM y recibe tu clave al instante.",
    to: "/redeem" as const,
    cta: "Canjear código",
  },
  {
    k: "03",
    t: "Elige tu objetivo",
    d: "Toca cualquier archimonstruo en LIVE — te lleva directo a su página, sin tener que buscar el ID a mano.",
    to: null,
    cta: null,
  },
  {
    k: "04",
    t: "Revela la posición",
    d: "Introduce tu licencia ahí. Al instante verás nombre, servidor y posición exacta — y cuánto tiempo le queda a tu licencia, en vivo.",
    to: null,
    cta: null,
  },
];

const FAQ = [
  {
    q: "¿Cuánto dura un archimonstruo activo?",
    a: "30 minutos desde la última vez que se detectó. Si sigue ahí, se renueva solo; si no, desaparece de la base de datos y de LIVE.",
  },
  {
    q: "¿Qué pasa cuando caduca mi licencia?",
    a: "Deja de funcionar para revelar posiciones nuevas. Puedes conseguir otra por Discord o canjeando un código nuevo en REDEEM.",
  },
  {
    q: "¿Puedo usar la misma licencia varias veces?",
    a: "Sí, pero hay un límite de una consulta cada 2 minutos por archimonstruo, para evitar abuso.",
  },
  {
    q: "¿Necesito instalar algo?",
    a: "No. Todo funciona desde el navegador — LIVE, REDEEM y la revelación de posiciones.",
  },
];

function HowItWorksPage() {
  return (
    <Layout>
      <div className="w-full max-w-3xl">
        <div className="text-center">
          <span className="mono-label">Guía rápida</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Cómo <span className="text-primary">funciona</span>
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
            De cero a revelar una posición en menos de un minuto.
          </p>
        </div>

        <div className="mt-8 space-y-3">
          {STEPS.map((s) => (
            <div key={s.k} className="surface-card flex flex-wrap items-center gap-4 p-5">
              <div className="mono-label shrink-0 text-2xl text-primary">{s.k}</div>
              <div className="min-w-[200px] flex-1">
                <div className="font-display text-base font-semibold">{s.t}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </div>
              {s.to && (
                <Link
                  to={s.to}
                  className="btn-primary shrink-0 hover:[&]:btn-primary-hover"
                >
                  {s.cta}
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-center font-display text-xl font-semibold">Preguntas frecuentes</h2>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <div key={item.q} className="surface-card p-5">
                <div className="font-display text-sm font-semibold">{item.q}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}