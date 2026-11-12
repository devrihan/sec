import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EYE_STYLES, HAIR_COLORS, HERO_SERIES, MOUTH_STYLES, SKIN_TONES, withItem } from '../avatar3d/options';
import { Avatar3DViewer } from '../components/Avatar3DViewer';
import { AvatarCard, type AvatarStatus } from '../components/AvatarCard';
import { CoinIcon } from '../components/CoinBalance';
import { HeroCard } from '../components/HeroCard';
import { BackLink, Notice, PageTitle, WHITE_PANEL } from '../components/page-parts';
import { avatars } from '../services/catalog';
import { purchaseAvatar } from '../services/pointsService';
import { useAppState } from '../services/store';
import { equipAvatar, ownsAvatar, removeFromSlot, setAvatarLook, useCoins, useStudent } from '../services/studentService';
import type { Avatar, AvatarSlot } from '../types';

const TABS: { id: string; label: string; slots: AvatarSlot[] }[] = [
  { id: 'heroes', label: 'Heroes', slots: ['hero'] },
  { id: 'hair', label: 'Hair & face', slots: ['hair'] },
  { id: 'hat', label: 'Hats', slots: ['hat'] },
  { id: 'top', label: 'Tops', slots: ['top'] },
  { id: 'bottom', label: 'Bottoms', slots: ['bottom'] },
  { id: 'shoes', label: 'Shoes', slots: ['shoes'] },
  { id: 'acc', label: 'Accessories', slots: ['glasses', 'bag'] },
];

const TAB_TRIGGER = 'flex-none rounded-[4px] px-3 py-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-[0px_1px_1px_rgba(0,0,0,0.05)]';
const LOOK_LABEL = 'text-[14px] leading-5 font-medium tracking-[-0.084px] text-foreground';

function Swatches({ label, colors, value, onPick, testId }: { label: string; colors: string[]; value: string; onPick: (c: string) => void; testId: string }) {
  return (
    <div className="space-y-1.5">
      <p className={LOOK_LABEL}>{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {colors.map((c, i) => (
          <button
            key={c}
            type="button"
            aria-label={`${label} ${i + 1}`}
            aria-pressed={value === c}
            data-testid={`${testId}-${i}`}
            onClick={() => onPick(c)}
            style={{ backgroundColor: c }}
            className={cn('size-8 rounded-full border-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50', value === c ? 'border-primary' : 'border-transparent')}
          />
        ))}
      </div>
    </div>
  );
}

function Choices({ label, options, value, onPick }: { label: string; options: { id: string; name: string }[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="space-y-1.5">
      <p className={LOOK_LABEL}>{label}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => (
          <Button key={o.id} type="button" size="sm" variant={value === o.id ? 'default' : 'outline'} aria-pressed={value === o.id} onClick={() => onPick(o.id)}>{o.name}</Button>
        ))}
      </div>
    </div>
  );
}

export function AvatarStorePage() {
  const student = useStudent();
  const coins = useCoins();
  const state = useAppState((s) => s);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const config = student.avatar;
  const preview = avatars.find((a) => a.id === previewId) ?? null;
  const shown = useMemo(() => (preview ? withItem(config, preview) : config), [config, preview]);

  const statusOf = (item: Avatar): AvatarStatus => {
    if ((config[item.slot] ?? null) === item.id) return 'equipped';
    if (ownsAvatar(state, student.id, item.id)) return 'owned';
    return coins >= item.price ? 'available' : 'insufficient';
  };

  const buy = (item: Avatar) => {
    const outcome = purchaseAvatar(item.id);
    setPreviewId(null);
    const done = item.slot === 'hero' ? `${item.name} unlocked! Equip it to transform.` : `${item.name} is now in your inventory. Equip it to wear it.`;
    setNotice(outcome.ok ? done : "That purchase didn't go through. Your coins are unchanged.");
  };

  const card = (item: Avatar) => {
    const status = statusOf(item);
    return (
      <AvatarCard
        key={item.id}
        item={item}
        status={status}
        shortBy={item.price - coins}
        previewConfig={withItem(config, item)}
        previewing={previewId === item.id}
        onPreview={() => setPreviewId(previewId === item.id || status === 'equipped' ? null : item.id)}
        onBuy={() => buy(item)}
        onEquip={() => {
          equipAvatar(item.id);
          setPreviewId(null);
          setNotice(`${item.name} equipped.`);
        }}
        onRemove={() => {
          removeFromSlot(item.slot);
          setNotice(`${item.name} removed. It stays in your inventory.`);
        }}
      />
    );
  };

  const heroCard = (item: Avatar) => {
    const status = statusOf(item);
    return (
      <HeroCard
        key={item.id}
        item={item}
        status={status}
        coins={coins}
        legendary={item.series === 'legend'}
        previewConfig={withItem(config, item)}
        previewing={previewId === item.id}
        onPreview={() => setPreviewId(previewId === item.id || status === 'equipped' ? null : item.id)}
        onBuy={() => buy(item)}
        onEquip={() => {
          equipAvatar(item.id);
          setPreviewId(null);
          setNotice(`You're now ${item.name}. Classmates see your hero on the leaderboard.`);
        }}
        onRemove={() => {
          removeFromSlot('hero');
          setNotice(`${item.name} taken off. It stays unlocked, and your own character is back.`);
        }}
      />
    );
  };

  const heroes = avatars.filter((a) => a.isAvailable && a.slot === 'hero');
  const unlocked = heroes.filter((h) => ownsAvatar(state, student.id, h.id)).length;

  return (
    <>
      <BackLink to="/profile">My profile</BackLink>
      <PageTitle
        title="Avatar store"
        sub="Unlock heroes and build your 3D character with coins. Your leaderboard points stay as they are."
        aside={
          <span className="inline-flex items-center gap-1.5 text-[18px] leading-7 font-medium tracking-[-0.108px] text-foreground tabular-nums">
            <CoinIcon className="size-5" />Available: {coins.toLocaleString('en-IN')}
          </span>
        }
      />
      {notice && <Notice>{notice}</Notice>}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <section className={cn(WHITE_PANEL, 'space-y-3 p-3 lg:sticky lg:top-4')}>
          <Avatar3DViewer config={shown} />
          {preview && statusOf(preview) !== 'equipped' && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1" data-testid="preview-bar">
              <p className="text-[14px] leading-5 text-muted-foreground">Trying on {preview.name}</p>
              <Button variant="ghost" size="sm" onClick={() => setPreviewId(null)}>Stop preview</Button>
            </div>
          )}
        </section>

        <Tabs defaultValue="heroes" className="min-w-0">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-0 rounded-md bg-secondary p-1 group-data-[orientation=horizontal]/tabs:h-auto">
            {TABS.map((t) => <TabsTrigger key={t.id} value={t.id} className={TAB_TRIGGER}>{t.label}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="heroes" className="mt-4 space-y-6" data-testid="heroes-tab">
            <section className={cn(WHITE_PANEL, 'flex flex-wrap items-center justify-between gap-3 p-4')}>
              <div>
                <h2 className="text-[18px] leading-7 font-medium text-foreground">Hero collection</h2>
                <p className="text-[14px] leading-5 text-muted-foreground">Every quiz, room, Team Battle and remediation pays coins. Save up to unlock a hero; it stays yours for good.</p>
              </div>
              <span className="text-[14px] leading-5 font-medium text-foreground tabular-nums" data-testid="heroes-unlocked">{unlocked} of {heroes.length} unlocked</span>
            </section>
            {HERO_SERIES.map((series) => {
              const items = heroes.filter((h) => h.series === series.id);
              if (items.length === 0) return null;
              const owned = items.filter((h) => ownsAvatar(state, student.id, h.id)).length;
              return (
                <section key={series.id} aria-labelledby={`series-${series.id}`} data-testid="hero-series">
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <h3 id={`series-${series.id}`} className="text-[16px] leading-6 font-semibold text-foreground">{series.name}</h3>
                      <p className="text-[14px] leading-5 text-muted-foreground">{series.tagline}</p>
                    </div>
                    <span className="text-[12px] leading-4 text-muted-foreground tabular-nums">{owned}/{items.length} collected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">{items.map(heroCard)}</div>
                </section>
              );
            })}
          </TabsContent>
          {TABS.filter((t) => t.id !== 'heroes').map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-4 space-y-5">
              {t.id === 'hair' && (
                <section className={cn(WHITE_PANEL, 'grid grid-cols-1 gap-4 sm:grid-cols-2')}>
                  <Swatches label="Skin tone" testId="skin" colors={SKIN_TONES} value={config.skin} onPick={(skin) => setAvatarLook({ skin })} />
                  <Swatches label="Hair colour" testId="hair-colour" colors={HAIR_COLORS} value={config.hairColor} onPick={(hairColor) => setAvatarLook({ hairColor })} />
                  <Choices label="Eyes" options={EYE_STYLES} value={config.eyes} onPick={(eyes) => setAvatarLook({ eyes })} />
                  <Choices label="Mouth" options={MOUTH_STYLES} value={config.mouth} onPick={(mouth) => setAvatarLook({ mouth })} />
                </section>
              )}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                {avatars.filter((a) => a.isAvailable && t.slots.includes(a.slot)).map(card)}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  );
}
