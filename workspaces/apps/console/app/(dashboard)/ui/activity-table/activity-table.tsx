'use client'

import {
  ChatCircleDots,
  MagnifyingGlass,
  NotePencil,
  ShareNetwork,
  SlidersHorizontal
} from '@phosphor-icons/react'
import type { ReactNode } from 'react'

import { Card } from '@repo/react/vendors/shadcn/card'

interface Activity {
  category: string
  date: string
  id: string
  kind: string
  title: string
  visibility: string
}

interface ActivityTableProps {
  activities: readonly Activity[]
  onShowAll: () => void
  query: string
}

export function ActivityTable(props: ActivityTableProps) {
  const { activities, onShowAll, query } = props

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 pb-2 pt-6 sm:px-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-emphasis">
            Timeline pessoal
          </p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
            Atividade recente
          </h2>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-primary-emphasis transition-colors hover:bg-accent sm:text-base"
          onClick={onShowAll}
          type="button"
        >
          Ver tudo
          <span aria-hidden="true">›</span>
        </button>
      </div>

      {activities.length > 0 ? (
        <div className="overflow-x-auto px-5 pb-5 sm:px-7">
          <table
            className="w-full table-fixed border-collapse"
            id="activity-list"
          >
            <caption className="sr-only">
              Registros, conversas e compartilhamentos recentes
            </caption>
            <thead className="sr-only">
              <tr>
                <th>Registro</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Visibilidade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {activities.map((activity) => (
                <tr className="h-16" key={activity.id}>
                  <td className="w-3/5 py-3 pr-3 sm:w-2/5">
                    <div className="flex items-center gap-4">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                        {getActivityIcon(activity.kind)}
                      </span>
                      <span className="truncate text-base font-medium">
                        {activity.title}
                      </span>
                    </div>
                  </td>
                  <td className="hidden py-3 text-sm text-muted-foreground sm:table-cell">
                    {activity.date}
                  </td>
                  <td className="hidden py-3 text-sm text-muted-foreground md:table-cell">
                    {activity.category}
                  </td>
                  <td className="py-3 text-right">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        activity.visibility === 'Privado'
                          ? 'bg-secondary text-secondary-foreground'
                          : 'bg-accent text-accent-foreground'
                      }`}
                    >
                      {activity.visibility}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mx-5 mb-5 mt-4 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/50 px-6 text-center sm:mx-7">
          <MagnifyingGlass className="text-muted-foreground" size={28} />
          <p className="mt-3 font-semibold">Nenhum resultado encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Não encontramos registros para “{query}”.
          </p>
        </div>
      )}
    </Card>
  )
}

function getActivityIcon(kind: string): ReactNode {
  switch (kind) {
    case 'conversation':
      return <ChatCircleDots size={24} weight="fill" />
    case 'share':
      return <ShareNetwork size={24} weight="fill" />
    case 'check-in':
      return <SlidersHorizontal size={24} weight="fill" />
    default:
      return <NotePencil size={24} weight="fill" />
  }
}
