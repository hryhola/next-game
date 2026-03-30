import type { Meta, StoryObj } from '@storybook/react'
import { MessageCircle, Settings, Users } from 'lucide-react'
import OverlayedTabs from './OverlayedTabs'

const meta: Meta<typeof OverlayedTabs> = {
    title: 'UI/Composite/OverlayedTabs',
    component: OverlayedTabs,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
}

export default meta

type Story = StoryObj<typeof meta>

export const LobbyControls: Story = {
    args: {
        label: 'controls',
        views: []
    },
    render: () => (
        <div className="relative min-h-[640px]">
            <div className="p-6 text-sm text-slate-300">
                Open one of the controls in the bottom bar to inspect the overlay behavior without booting the full lobby app.
            </div>
            <OverlayedTabs
                label="controls"
                views={[
                    {
                        header: <MessageCircle className="size-4" />,
                        view: ({ fullscreen }) => (
                            <div className="h-full p-6">
                                <div className="glass-card h-full rounded-[1.75rem] p-6 text-sm text-slate-200">
                                    Chat view {fullscreen ? 'expanded' : 'peek'} with room conversation and composer pinned to the bottom.
                                </div>
                            </div>
                        )
                    },
                    {
                        header: <Users className="size-4" />,
                        view: () => (
                            <div className="h-full p-6">
                                <div className="glass-card h-full rounded-[1.75rem] p-6 text-sm text-slate-200">
                                    Online users, lobby member roles, and quick moderation actions.
                                </div>
                            </div>
                        )
                    },
                    {
                        type: 'popover',
                        header: <Settings className="size-4" />,
                        height: '220px',
                        view: opts => (
                            <div
                                className="glass-panel flex w-[84px] items-center justify-center rounded-b-[30px] px-3"
                                style={{
                                    flexDirection: opts.direction === 'up' ? 'column' : 'column-reverse',
                                    paddingBottom: opts.direction === 'up' ? 16 : 0
                                }}
                            >
                                <button className="my-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-100">Mute</button>
                                <button className="my-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-100">Ready</button>
                                <button className="my-2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs text-slate-100">Leave</button>
                            </div>
                        )
                    }
                ]}
            />
        </div>
    )
}
