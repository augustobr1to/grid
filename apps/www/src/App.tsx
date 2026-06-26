import { lazy, Suspense } from 'react';
import { Boxes, Cable, Cpu, Layers3, RadioTower, Sparkles } from 'lucide-react';
import { Button } from './components/ui/button';
import { cn } from './lib/utils';

const EnginePreview = lazy(() => import('./components/EnginePreview'));

const pillars = [
  { icon: Cpu, title: 'Deterministic runtime', text: 'Fixed-step physics, input phases, lifecycle disposal, and renderer guardrails for real browser games.' },
  { icon: Sparkles, title: 'Shader pipeline', text: 'Reusable material factories, registered shader names, and time-uniform helpers for visual systems.' },
  { icon: RadioTower, title: 'Colyseus multiplayer', text: 'Authoritative rooms, typed input messages, state sync, and client room management.' },
  { icon: Layers3, title: 'React tooling', text: 'Vite apps, shadcn-compatible UI, TypeScript contracts, and Nx task orchestration.' },
];

const stack = ['React', 'Three.js', 'Rapier', 'Colyseus', 'Vite', 'pnpm', 'Nx', 'mise'];

export default function App() {
  return (
    <main className="overflow-hidden">
      <section className="mx-auto grid min-h-screen w-full max-w-7xl gap-12 px-6 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
            <Boxes className="h-4 w-4" />
            Browser-first 3D game engine
          </div>

          <h1 className="max-w-3xl text-5xl font-black tracking-[-0.06em] text-white sm:text-7xl lg:text-8xl">
            Build networked 3D games in the browser.
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-cyan-50/72">
            The Grid combines React apps, Three.js rendering, Rapier physics, shader materials, asset loading,
            and Colyseus multiplayer into one pnpm/Nx monorepo foundation.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button size="lg">Start engine</Button>
            <Button size="lg" variant="outline">Read architecture</Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            {stack.map((item) => (
              <span key={item} className="rounded-full border border-cyan-200/15 bg-white/[0.04] px-3 py-1 text-sm text-cyan-50/80">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative min-h-[440px] lg:min-h-[680px]">
          <div className="absolute inset-0 rounded-[2rem] border border-cyan-200/10 bg-cyan-200/[0.03] shadow-glow backdrop-blur" />
          <Suspense fallback={<div className="absolute inset-0 rounded-[2rem] bg-cyan-300/[0.04]" />}>
            <EnginePreview />
          </Suspense>
          <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
            {['60 Hz fixed step', 'GPU shader materials', 'Room state sync'].map((label) => (
              <div key={label} className="rounded-2xl border border-cyan-200/10 bg-slate-950/60 px-4 py-3 text-sm text-cyan-50/80 backdrop-blur">
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-20 lg:grid-cols-4 lg:px-8">
        {pillars.map((pillar, index) => {
          const Icon = pillar.icon;
          return (
            <article
              key={pillar.title}
              className={cn(
                'rounded-3xl border border-cyan-200/10 bg-white/[0.035] p-6 backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.06]',
                index === 1 && 'lg:translate-y-8',
                index === 2 && 'lg:translate-y-4'
              )}
            >
              <Icon className="h-7 w-7 text-cyan-300" />
              <h2 className="mt-5 text-xl font-bold text-white">{pillar.title}</h2>
              <p className="mt-3 text-sm leading-6 text-cyan-50/65">{pillar.text}</p>
            </article>
          );
        })}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8">
        <div className="rounded-[2rem] border border-cyan-200/10 bg-slate-950/70 p-6 font-mono text-sm text-cyan-50/78 shadow-glow">
          <div className="mb-4 flex items-center gap-2 text-cyan-300">
            <Cable className="h-4 w-4" />
            Runtime bootstrap
          </div>
          <pre className="overflow-x-auto"><code>{`import { Game } from '@thegridcn/engine';

const game = new Game('/game', {
  colyseusOptions: { endpoint: 'ws://localhost:2567', roomName: 'grid_room' },
  rendererOptions: { shadows: true, fixedTimeStep: 1 / 60 },
});

await game._init();
await game.loadScene('arena');`}</code></pre>
        </div>
      </section>
    </main>
  );
}
