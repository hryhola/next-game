import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from 'client/ui/primitives'

export const tabsHeaderHeight = '48px'

type Props = {
    views: { view: React.ReactNode; header: React.ReactNode }[]
    label: string
}

export const SwipeTabs: React.FC<Props> = props => {
    return (
        <Tabs defaultValue="0" className="flex flex-col gap-4">
            <TabsList className="h-12">
                {props.views.map(({ header }, key) => (
                    <TabsTrigger key={key} value={String(key)}>
                        {header}
                    </TabsTrigger>
                ))}
            </TabsList>
            {props.views.map(({ view }, key) => (
                <TabsContent key={key} value={String(key)}>
                    {view}
                </TabsContent>
            ))}
        </Tabs>
    )
}
