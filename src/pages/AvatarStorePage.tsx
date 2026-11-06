import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { EYE_STYLES, HAIR_COLORS, MOUTH_STYLES, SKIN_TONES, withItem } from '../avatar3d/options';
import { Avatar3DViewer } from '../components/Avatar3DViewer';
import { AvatarCard, type AvatarStatus } from '../components/AvatarCard';
import { CoinIcon } from '../components/CoinBalance';
import { BackLink, Notice, PageTitle, WHITE_PANEL } from '../components/page-parts';
import { avatars } from '../services/catalog';
import { purchaseAvatar } from '../services/pointsService';
import { useAppState } from '../services/store';
import { equipAvatar, ownsAvatar, removeFromSlot, setAvatarLook, useCoins, useStudent } from '../services/studentService';
import type { Avatar, AvatarSlot } from '../types';

const TABS: { id: string; label: string; slots: AvatarSlot[] }[] = [
  { id: 'hair', label: 'Hair & face', slots: ['hair'] },
  { id: 'hat', label: 'Hats', slots: ['hat'] },
  { id: 'top', label: 'Tops', slots: ['top'] },
  { id: 'bottom', label: 'Bottoms', slots: ['bottom'] },
  { id: 'shoes', label: 'Shoes', slots: ['shoes'] },
  { id: 'acc', label: 'Accessories', slots: ['glasses', 'bag'] },
];

const TAB_TRIGGER = 'flex-none rounded-[4px] px-3 py-1.5 text-[14px] leading-5 font-medium tracking-[-0.084px] text-muted-foreground data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow-[0px_1px_1px_rgba(0,0,0,0.05)]';
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
    if (config[item.slot] === item.id) return 'equipped';
    if (ownsAvatar(state, student.id, item.id)) return 'owned';
    return coins >= item.price ? 'available' : 'insufficient';
  };

  const buy = (item: Avatar) => {
    const outcome = purchaseAvatar(item.id);
    setPreviewId(null);
    setNotice(outcome.ok ? `${item.name} is now in your inventory. Equip it to wear it.` : "That purchase didn't go through. Your coins are unchanged.");
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

  return (
    <>
      <BackLink to="/profile">My profile</BackLink>
      <PageTitle
        title="Avatar store"
        sub="Build your 3D character. Items cost coins, so your leaderboard points stay as they are."
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

        <Tabs defaultValue="top" className="min-w-0">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-0 rounded-md bg-secondary p-1 group-data-[orientation=horizontal]/tabs:h-auto">
            {TABS.map((t) => <TabsTrigger key={t.id} value={t.id} className={TAB_TRIGGER}>{t.label}</TabsTrigger>)}
          </TabsList>
          {TABS.map((t) => (
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
