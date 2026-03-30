import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, CardHeader } from 'client/ui/primitives'
import { FullScreenModal } from './FullScreenModal'

const meta: Meta<typeof FullScreenModal> = {
    title: 'UI/Composite/FullScreenModal',
    component: FullScreenModal,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
}

export default meta

type Story = StoryObj<typeof meta>

export const CreatorSheet: Story = {
    args: {
        isOpen: true,
        setIsOpen: () => {},
        label: 'Create lobby',
        children: null
    },
    render: () => (
        <FullScreenModal isOpen label="Create lobby" padding transition="up" setIsOpen={() => {}}>
            <Card className="mx-auto mt-8 max-w-2xl">
                <CardHeader>
                    <p className="text-xs uppercase tracking-[0.3em] text-violet-200/55">Flow Preview</p>
                    <h3 className="text-2xl font-semibold text-white">New Game Setup</h3>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-300">
                        Glass panels keep the full-screen shell readable while preserving the purple atmosphere behind it.
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-200">Game picker</div>
                        <div className="rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-4 text-sm text-slate-200">Initial data fields</div>
                    </div>
                </CardContent>
            </Card>
        </FullScreenModal>
    )
}
