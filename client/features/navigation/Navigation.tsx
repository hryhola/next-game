import React from 'react'
import { Button, Card, CardContent, CardHeader } from 'client/ui/primitives'

export const Navigation = () => {
    return (
        <Card className="mx-auto w-full max-w-md">
            <CardHeader>
                <p className="text-xs uppercase tracking-[0.35em] text-violet-200/55">Navigation</p>
                <h2 className="text-2xl font-semibold text-white">Where to next?</h2>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Button variant="secondary" className="justify-start rounded-3xl px-5">
                    Home
                </Button>
            </CardContent>
        </Card>
    )
}
