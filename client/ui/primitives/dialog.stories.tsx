import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader } from './dialog'

const meta: Meta<typeof DialogContent> = {
    title: 'UI/Primitives/Dialog',
    component: DialogContent,
    tags: ['autodocs'],
    parameters: {
        layout: 'fullscreen'
    }
}

export default meta

type Story = StoryObj<typeof meta>

export const JoinPrompt: Story = {
    render: () => (
        <Dialog open>
            <DialogContent hideClose title="Join Violet Vault">
                <DialogHeader>
                    <DialogDescription>Private Jeopardy room with 3 members online. Enter the password to join as a player or spectator.</DialogDescription>
                </DialogHeader>
                <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/4 px-4 py-5 text-sm text-slate-200">
                    Password-protected lobby with an active round waiting in the wings.
                </div>
                <DialogFooter>
                    <Button variant="secondary">Close</Button>
                    <Button>Join</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
