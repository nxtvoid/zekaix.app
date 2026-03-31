'use client'

import { cn } from '@zekaix/utils/cn'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'

type GameLoadout = {
  weaponId: string
  activeAbilityId: string
  passiveAbilityId: string
}

type SelectOption<T extends string> = {
  id: T
  label: string
  description: string
}

function getOptionById<T extends string>(
  options: SelectOption<T>[],
  id: T
): SelectOption<T> | undefined {
  return options.find((option) => option.id === id)
}

function SelectGroup<T extends string>({
  title,
  value,
  options,
  onChange
}: {
  title: string
  value: T
  options: SelectOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <section className='border- rounded-2xl border bg-black/25 p-4'>
      <div className='mb-4 flex items-center justify-between gap-4'>
        <p className='font-mono text-[11px] text-muted-foreground uppercase tracking-[0.22em]'>
          {title}
        </p>
        <Badge variant='secondary'>
          {options.length === 0 ? 'empty' : `${options.length} options`}
        </Badge>
      </div>
      <div className='grid gap-2.5'>
        {options.map((option, index) => {
          const isActive = option.id === value

          return (
            <Button
              key={option.id}
              type='button'
              className={cn(
                'h-auto w-full cursor-pointer flex-col items-start overflow-hidden border border-border p-2 text-left',
                isActive
                  ? 'border-primary/60 bg-primary/12'
                  : 'bg-white/3 hover:bg-white/6'
              )}
              onClick={() => onChange(option.id)}
            >
              <div className='flex w-full items-start justify-between gap-3'>
                <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                  <div className='flex items-center gap-2.5'>
                    <span className='rounded-md border border-white/10 bg-black/35 px-2 py-1 font-mono text-[10px] text-white/45 uppercase tracking-[0.18em]'>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className='truncate font-semibold text-sm uppercase tracking-[0.08em]'>
                      {option.label}
                    </p>
                  </div>
                  <p
                    className={cn(
                      'truncate text-[11px] uppercase tracking-[0.14em]',
                      isActive ? 'text-white/58' : 'text-white/28'
                    )}
                  >
                    {option.description}
                  </p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] text-muted-foreground uppercase tracking-[0.18em]',
                    isActive
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-white/10 bg-white/5'
                  )}
                >
                  {isActive ? 'on' : 'off'}
                </span>
              </div>
            </Button>
          )
        })}
      </div>
    </section>
  )
}

function GamePregamePanel({
  loadout,
  weapons,
  activeAbilities,
  passiveAbilities,
  onLoadoutChange,
  onDeploy
}: {
  loadout: GameLoadout
  weapons: SelectOption<GameLoadout['weaponId']>[]
  activeAbilities: SelectOption<GameLoadout['activeAbilityId']>[]
  passiveAbilities: SelectOption<GameLoadout['passiveAbilityId']>[]
  onLoadoutChange: (loadout: GameLoadout) => void
  onDeploy: () => void
}) {
  const selectedWeapon = getOptionById(weapons, loadout.weaponId)
  const selectedActiveAbility = getOptionById(
    activeAbilities,
    loadout.activeAbilityId
  )
  const selectedPassiveAbility = getOptionById(
    passiveAbilities,
    loadout.passiveAbilityId
  )

  return (
    <Card className='relative w-full max-w-6xl gap-5 overflow-hidden border-border p-5'>
      <CardHeader className='relative flex flex-col gap-4 p-0'>
        <div className='flex w-full items-center justify-between gap-3'>
          <div className='space-y-1'>
            <Badge variant='outline'>Loadout</Badge>
            <CardTitle className='text-3xl leading-tight md:text-4xl'>
              Select Your Kit
            </CardTitle>
            <p className='text-muted-foreground text-sm uppercase tracking-[0.14em]'>
              Ready up before drop.
            </p>
          </div>
          <Button
            className='w-32 cursor-pointer text-base uppercase'
            size='lg'
            onClick={onDeploy}
          >
            Deploy
          </Button>
        </div>

        <div className='grid gap-3 lg:grid-cols-3'>
          <div className='rounded-xl border border-border bg-black/30 px-4 py-3'>
            <p className='font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]'>
              Weapon
            </p>
            <p className='mt-1 font-medium text-sm'>
              {selectedWeapon?.label ?? loadout.weaponId}
            </p>
            <p className='mt-1 truncate text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
              {selectedWeapon?.description ?? 'No data'}
            </p>
          </div>
          <div className='rounded-xl border border-border bg-black/30 px-4 py-3'>
            <p className='font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]'>
              Active
            </p>
            <p className='mt-1 font-medium text-sm'>
              {selectedActiveAbility?.label ?? loadout.activeAbilityId}
            </p>
            <p className='mt-1 truncate text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
              {selectedActiveAbility?.description ?? 'No data'}
            </p>
          </div>
          <div className='rounded-xl border border-border bg-black/30 px-4 py-3'>
            <p className='font-mono text-[10px] text-muted-foreground uppercase tracking-[0.2em]'>
              Passive
            </p>
            <p className='mt-1 font-medium text-sm'>
              {selectedPassiveAbility?.label ?? loadout.passiveAbilityId}
            </p>
            <p className='mt-1 truncate text-[11px] text-muted-foreground uppercase tracking-[0.14em]'>
              {selectedPassiveAbility?.description ?? 'No data'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className='relative grid gap-4 p-0 xl:grid-cols-3 xl:items-start'>
        <SelectGroup
          title='Weapon'
          value={loadout.weaponId}
          options={weapons}
          onChange={(weaponId) => onLoadoutChange({ ...loadout, weaponId })}
        />

        <SelectGroup
          title='Active Skill'
          value={loadout.activeAbilityId}
          options={activeAbilities}
          onChange={(activeAbilityId) =>
            onLoadoutChange({ ...loadout, activeAbilityId })
          }
        />

        <SelectGroup
          title='Passive Skill'
          value={loadout.passiveAbilityId}
          options={passiveAbilities}
          onChange={(passiveAbilityId) =>
            onLoadoutChange({ ...loadout, passiveAbilityId })
          }
        />
      </CardContent>
    </Card>
  )
}

export { GamePregamePanel }
