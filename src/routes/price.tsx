import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";

export const Route = createFileRoute("/price")({
  head: () => ({
    meta: [
      { title: "Precios — DakuBot" },
      {
        name: "description",
        content: "Planes de licencia de DakuBot para completar el Ocre al 100% en Dofus Touch.",
      },
    ],
  }),
  component: PricePage,
});

const PLANS = [
  {
    name: "1 día",
    cop: "19.000",
    usd: "6",
    eur: "5",
    tag: null,
    blurb: "Para probar el servicio o una sesión intensiva puntual.",
  },
  {
    name: "7 días",
    cop: "46.000",
    usd: "14",
    eur: "12",
    tag: null,
    blurb: "Cubre un fin de semana largo o una semana completa de farmeo.",
  },
  {
    name: "30 días",
    cop: "106.000",
    usd: "32",
    eur: "28",
    tag: "Mejor precio",
    blurb: "El mejor precio por día. Tiempo de sobra para terminar el Ocre sin prisa.",
  },
];

const REASONS = [
  {
    t: "Cobertura del 100%, no parcial",
    d: "Otros servicios similares en el mercado cubren una parte de los archimonstruos necesarios para el Ocre (por debajo del 60%) — el resto lo tienes que resolver por tu cuenta. DakuBot cubre el 100% de la misión: no hay un \"resto\" que te quede pendiente.",
  },
  {
    t: "Tiempo real, no listas desactualizadas",
    d: "Las posiciones se actualizan al instante en cuanto se detectan, no cada cierto tiempo ni con retraso. Lo que ves en LIVE es lo que hay ahora mismo.",
  },
  {
    t: "Precio por día, no por trabajo a medias",
    d: "El precio no está pensado como \"cuánto cuesta una lista de posiciones\" — está pensado como \"cuánto vale no tener que buscar nada tú mismo\". Cuanto más tiempo contratas, menos pagas por día: el plan mensual es, con diferencia, la opción más barata por día de uso.",
  },
];

const FAQ = [
  {
    q: "¿Por qué el plan de 1 día cuesta más por día que el mensual?",
    a: "Porque el plan de 1 día es para probar o para una necesidad puntual, sin compromiso. El plan mensual premia a quien se queda más tiempo con un precio por día mucho menor — es la opción pensada para completar el Ocre con calma.",
  },
  {
    q: "¿Los precios pueden cambiar?",
    a: "Sí. Los precios se revisan según el tipo de cambio y la demanda. El precio que ves aquí es el vigente en el momento en que entras.",
  },
  {
    q: "¿Cómo pago?",
    a: "Únete a nuestro Discord para coordinar el pago y recibir tu licencia, o canjea un código promocional directamente en REDEEM si ya tienes uno.",
  },
];

function PricePage() {
  return (
    <Layout>
      <div className="w-full max-w-4xl">
        <div className="text-center">
          <span className="mono-label">Precios</span>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">
            Cobertura <span className="text-primary">100%</span> del Ocre
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground md:text-base">
            Sin partes que te queden por resolver a mano. Elige la duración que necesites.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={
                "surface-card relative flex flex-col p-6 " +
                (p.tag ? "border-primary/50" : "")
              }
            >
              {p.tag && (
                <span className="mono-label absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/50 bg-background px-3 py-1 text-primary">
                  {p.tag}
                </span>
              )}
              <div className="mono-label text-center text-muted-foreground">{p.name}</div>
              <div className="mt-3 text-center">
                <div className="font-display text-3xl font-semibold">
                  <span className="text-primary">${p.usd}</span>
                  <span className="ml-1 text-base font-normal text-muted-foreground">USD</span>
                </div>
                <div className="mono-label mt-1 text-muted-foreground">
                  €{p.eur} · ${p.cop} COP
                </div>
              </div>
              <p className="mt-4 flex-1 text-center text-sm text-muted-foreground">{p.blurb}</p>
              <Link
                to="/join"
                className="btn-primary mt-5 w-full justify-center hover:[&]:btn-primary-hover"
              >
                Conseguir licencia
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-14">
          <h2 className="text-center font-display text-xl font-semibold">
            En qué se basa el precio
          </h2>
          <div className="mt-5 space-y-3">
            {REASONS.map((r) => (
              <div key={r.t} className="surface-card p-5">
                <div className="font-display text-sm font-semibold text-primary">{r.t}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{r.d}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14">
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Precios de referencia en dólares y euros calculados con el tipo de cambio actual;
          pueden variar ligeramente al momento del pago.
        </p>
      </div>
    </Layout>
  );
}
