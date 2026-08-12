'use client'

import { Info } from '@phosphor-icons/react'
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'

import { Card } from '@repo/react-web/vendors/shadcn/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@repo/react-web/vendors/shadcn/chart'

interface TrendChartCardProps {
  trend: {
    dayPerception: readonly number[]
    labels: readonly string[]
    perceivedAnxiety: readonly number[]
  }
}

const chartConfig = {
  dayPerception: {
    color: 'var(--chart-1)',
    label: 'Como o dia foi'
  },
  perceivedAnxiety: {
    color: 'var(--chart-2)',
    label: 'Ansiedade percebida'
  }
} satisfies ChartConfig

export function TrendChartCard(props: TrendChartCardProps) {
  const { trend } = props
  const chartData = trend.labels.map((day, index) => ({
    day,
    dayPerception: trend.dayPerception[index],
    perceivedAnxiety: trend.perceivedAnxiety[index]
  }))

  return (
    <Card className="flex min-h-72 flex-col p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary-emphasis">
            Dados fictícios
          </p>
          <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
            Visão da semana
          </h2>
        </div>
        <span
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
          title="Escala de autorrelato, não clínica"
        >
          <Info aria-hidden="true" size={18} />
        </span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        Autorrelato de 1 a 5 · não é um score clínico
      </p>

      <ChartContainer
        aria-label="Gráfico de linhas dos autorrelatos fictícios da semana"
        className="mt-3 h-48 w-full min-w-0"
        config={chartConfig}
      >
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{ bottom: 2, left: -20, right: 8, top: 8 }}
        >
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="day"
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            axisLine={false}
            domain={[1, 5]}
            tickLine={false}
            tickMargin={8}
            ticks={[1, 2, 3, 4, 5]}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                formatter={(value, name) => (
                  <div className="flex min-w-40 items-center justify-between gap-4">
                    <span className="text-muted-foreground">
                      {chartConfig[name as keyof typeof chartConfig]?.label}
                    </span>
                    <span className="font-semibold text-foreground tabular-nums">
                      {String(value)} de 5
                    </span>
                  </div>
                )}
              />
            }
            cursor={{ stroke: 'var(--chart-grid)' }}
          />
          <ChartLegend content={<ChartLegendContent />} />
          <Line
            activeDot={{ r: 5 }}
            dataKey="dayPerception"
            dot={{ r: 3 }}
            isAnimationActive={false}
            stroke="var(--color-dayPerception)"
            strokeWidth={2.5}
            type="monotone"
          />
          <Line
            activeDot={{ r: 5 }}
            dataKey="perceivedAnxiety"
            dot={{ r: 3 }}
            isAnimationActive={false}
            stroke="var(--color-perceivedAnxiety)"
            strokeDasharray="5 5"
            strokeWidth={2}
            type="monotone"
          />
        </LineChart>
      </ChartContainer>

      <details className="mt-2 text-xs text-muted-foreground">
        <summary className="cursor-pointer font-semibold text-foreground underline-offset-4 hover:underline">
          Ver dados em tabela
        </summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="py-2 pr-4">Dia</th>
                <th className="py-2 pr-4">Como o dia foi</th>
                <th className="py-2">Ansiedade percebida</th>
              </tr>
            </thead>
            <tbody>
              {trend.labels.map((label, index) => (
                <tr className="border-b border-border/70" key={label}>
                  <td className="py-2 pr-4">{label}</td>
                  <td className="py-2 pr-4">
                    {trend.dayPerception[index]} de 5
                  </td>
                  <td className="py-2">{trend.perceivedAnxiety[index]} de 5</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  )
}
